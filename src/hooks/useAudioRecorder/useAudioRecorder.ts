import { useState, useRef, useCallback, useEffect } from 'react';
import { SILENCE_TIMEOUT_SECONDS } from '@/constants/session';
import { CAPTURE_SAMPLE_RATE } from '@/constants/audio';
import { classifyMicError, micError, type MicError } from '@/lib/micError';
import { watchMicPermission } from '@/lib/micCheck';
import { mark } from '@/lib/perf';
import { platform } from '@/platform';
import { getCurrentPlatform } from '@/lib/detectPlatform';
import { encodeWavFromInt16 } from '@/lib/wavEncoder';

/** RMS threshold below which audio is considered silence (0-1 scale).
 * Set above typical laptop fan / ambient noise levels (~0.01-0.04). */
const SILENCE_THRESHOLD = 0.06;
/** How often (ms) we sample the audio level to check for silence. */
const POLL_INTERVAL_MS = 200;
/** Track ends under this elapsed time = startup failure → show error.
 *  Beyond it, treat external disconnect as "user finished" and finalize. */
const EARLY_DISCONNECT_MS = 3000;
/** RMS reads exactly 0 for this long while context is running and track
 *  is live = OS-level mic access denied; surface as a specific error. */
const OS_MUTE_THRESHOLD_MS = 5000;
const WORKLET_URL = `${import.meta.env.BASE_URL}audio/downsample-worklet.js`;

interface UseAudioRecorderReturn {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearBlob: () => void;
  isRecording: boolean;
  audioBlob: Blob | null;
  // When the adapter supports streamed transcribe buffering (Tauri), this
  // is the id to pass to `transcribeStreaming.commit` after mic-stop.
  streamingId: string | null;
  error: MicError | null;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<MicError | null>(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const pcmChunksRef = useRef<Int16Array[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const disconnectedRef = useRef(false);
  const permissionUnsubscribeRef = useRef<(() => void) | null>(null);
  /** Id used to push chunks to the Rust-side buffer and to commit the final
   *  upload. Regenerated per recording; null on web (no streaming backend). */
  const streamingIdRef = useRef<string | null>(null);
  /** First chunk marks `transcribe_start` in the perf log so stage deltas
   *  are measured from the moment Rust starts accumulating audio. */
  const firstChunkMarkedRef = useRef(false);
  /** Pending `pushChunk` invokes. Awaited in the finalizer so the commit
   *  doesn't race past the last chunk and drain a partial Rust buffer. */
  const pendingPushesRef = useRef<Promise<void>[]>([]);
  /*
    True while we are intentionally stopping the track ourselves. Per spec
    track.stop() should not fire 'ended', but Chrome on production HTTPS +
    PWA service-worker contexts has been observed to fire it anyway. Without
    this flag the 'ended' handler converts our own teardown into a fake
    "Microphone disconnected" error.
  */
  const stoppingRef = useRef(false);

  const releaseCaptureGraph = useCallback(() => {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    workletNodeRef.current?.port.close();
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;
    sourceNodeRef.current?.disconnect();
    sourceNodeRef.current = null;
    const ctx = audioContextRef.current;
    if (ctx && ctx.state !== 'closed') void ctx.close();
    audioContextRef.current = null;
  }, []);

  const buildWavBlob = useCallback((): Blob => {
    // Fast-stop emits a 44-byte empty WAV, not null, so the MIN_BLOB_SIZE
    // check downstream routes silent recordings into SKIP_NO_RESPONSE.
    const chunks = pcmChunksRef.current;
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Int16Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    pcmChunksRef.current = [];
    // Cast via `unknown as BlobPart` because TS 5.9's Uint8Array type is
    // parameterised on `ArrayBufferLike` and Blob accepts `ArrayBufferView<ArrayBuffer>`.
    // The runtime Uint8Array is always `ArrayBuffer`-backed here.
    const wav = encodeWavFromInt16(merged, CAPTURE_SAMPLE_RATE) as unknown as BlobPart;
    return new Blob([wav], { type: 'audio/wav' });
  }, []);

  // Hoisted so finishRecording can stash a finaliser the onmessage
  // handler invokes when the 'flushed' sentinel arrives.
  const finalizeRef = useRef<(() => void) | null>(null);

  const finishRecording = useCallback(() => {
    // Called from silence detection, blur, or explicit stop. Idempotent on
    // a non-recording graph (workletNodeRef is null).
    if (!workletNodeRef.current || finalizeRef.current) return;
    mark('mic_stop');

    // Stop the mic and polling now so isRecording flips false right away,
    // but keep the worklet port open until the 'flushed' sentinel.
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    stoppingRef.current = true;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    permissionUnsubscribeRef.current?.();
    permissionUnsubscribeRef.current = null;
    setIsRecording(false);

    finalizeRef.current = () => {
      finalizeRef.current = null;
      const blob = buildWavBlob();
      // Await in-flight pushChunk invokes before publishing the blob: the
      // commit drains the Rust buffer and would race the last chunk
      // otherwise. Snapshot+clear so a new recording can't piggyback.
      const pending = pendingPushesRef.current;
      pendingPushesRef.current = [];
      const publish = () => {
        releaseCaptureGraph();
        if (!disconnectedRef.current) setAudioBlob(blob);
      };
      void Promise.all(pending).then(publish, publish);
    };

    // Worklet posts its tail then a 'flushed' sentinel; the message is
    // the only way to capture trailing audio across the thread boundary.
    workletNodeRef.current.port.postMessage('flush');
  }, [buildWavBlob, releaseCaptureGraph]);

  const stopRecording = useCallback(() => {
    finishRecording();
  }, [finishRecording]);

  const abortWithError = useCallback(
    (err: MicError) => {
      // Set first: any side-effect inside releaseCaptureGraph that ends the
      // track (e.g. ctx.close cascading) must see the intentional-stop flag.
      stoppingRef.current = true;
      pcmChunksRef.current = [];
      pendingPushesRef.current = [];
      disconnectedRef.current = true;
      finalizeRef.current = null; // any pending 'flushed' sentinel is now a no-op
      releaseCaptureGraph();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const id = streamingIdRef.current;
      if (id) void platform.http.openai.transcribeStreaming?.discard(id);
      streamingIdRef.current = null;
      setStreamingId(null);
      setIsRecording(false);
      setError(err);
    },
    [releaseCaptureGraph],
  );

  const startRecording = useCallback(async () => {
    if (workletNodeRef.current) return; // already recording

    setError(null);
    setAudioBlob(null);
    firstChunkMarkedRef.current = false;
    stoppingRef.current = false;
    pcmChunksRef.current = [];
    pendingPushesRef.current = [];

    const streaming = platform.http.openai.transcribeStreaming;
    const newStreamingId = streaming ? crypto.randomUUID() : null;
    streamingIdRef.current = newStreamingId;
    setStreamingId(newStreamingId);

    try {
      // Request 16kHz mono at the source so the worklet has less to resample
      // when the browser honours the hint (Chrome/Firefox do; Safari picks
      // hardware default and the worklet handles the rest).
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: CAPTURE_SAMPLE_RATE,
          channelCount: 1,
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      disconnectedRef.current = false;

      const log = import.meta.env.DEV
        ? (msg: string, extra?: object) => console.log(`[mic] ${msg}`, extra ?? '')
        : () => {};

      const track = stream.getAudioTracks()[0];
      if (track) {
        const recStartedAt = performance.now();
        const sinceStart = () => Math.round(performance.now() - recStartedAt);
        log('track acquired', { readyState: track.readyState, label: track.label });
        track.addEventListener('ended', () => {
          // Stale-event guard: lagging 'ended' from a previous recording can
          // fire after a new recording has reset stoppingRef. Bind to *this*
          // track's lifetime by checking it's still in the current stream.
          if (!streamRef.current?.getAudioTracks().includes(track)) return;
          const elapsedMs = sinceStart();
          log('track ENDED', { elapsedMs, stoppingRef: stoppingRef.current });
          if (stoppingRef.current) return;
          // External disconnect: under 3s = startup failure (show error);
          // 3s+ = mid-recording (finalize captured audio so interview proceeds).
          if (elapsedMs < EARLY_DISCONNECT_MS) {
            abortWithError(micError('disconnected'));
          } else {
            log('graceful finalize after external disconnect');
            finishRecording();
          }
        });
        track.addEventListener('mute', () => log('track muted', { elapsedMs: sinceStart() }));
        track.addEventListener('unmute', () => log('track unmuted', { elapsedMs: sinceStart() }));
      }

      permissionUnsubscribeRef.current?.();
      permissionUnsubscribeRef.current = watchMicPermission((state) => {
        if (state === 'denied' && workletNodeRef.current) {
          abortWithError(micError('permission-revoked'));
        }
      });

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      // iOS opens AudioContext suspended; throw on resume failure since addModule succeeds
      // on a suspended context but no audio frames flow (silent recording).
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      if (audioContext.state !== 'running') {
        throw new Error(
          `AudioContext failed to resume (state: ${audioContext.state}). On iOS this typically means user activation was consumed before recording started.`,
        );
      }

      // addModule is a no-op when preloaded at app boot.
      await audioContext.audioWorklet.addModule(WORKLET_URL);
      const workletNode = new AudioWorkletNode(audioContext, 'downsample-processor');
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (event: MessageEvent<Int16Array | { kind: 'flushed' }>) => {
        const data = event.data;
        // Control message: the worklet has drained its tail and is ready
        // for teardown. See finishRecording for why this is async.
        if (!(data instanceof Int16Array)) {
          if (data?.kind === 'flushed') finalizeRef.current?.();
          return;
        }

        const chunk = data;
        if (chunk.length === 0) return;
        pcmChunksRef.current.push(chunk);

        if (streaming && newStreamingId) {
          if (!firstChunkMarkedRef.current) {
            firstChunkMarkedRef.current = true;
            mark('transcribe_start');
          }
          // Wrap in a fresh Uint8Array so the underlying buffer is the exact
          // PCM range; Tauri's binary IPC ships it zero-copy.
          const bytes = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
          // Track the promise so the finalizer awaits in-flight pushes.
          // Per-push errors are swallowed; the commit surfaces a classified
          // error and the .catch keeps Promise.all from unhandled-reject.
          pendingPushesRef.current.push(streaming.pushChunk(newStreamingId, bytes).catch(() => {}));
        }
      };

      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;
      source.connect(workletNode);
      // Do NOT connect workletNode to destination; that would play the mic
      // back through the speakers. The graph stays active via source→worklet.

      // Silence detection via AnalyserNode on the same context. Parallel
      // branch off `source` so we get the raw 48kHz frames (more accurate
      // RMS at the source rate).
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const rmsSamples = new Float32Array(analyser.fftSize);
      let silentSince: number | null = null;
      let speechDetected = false;
      const recordingStartedAt = Date.now();
      // Periodic RMS log (dev only) verifies audio is actually flowing.
      // Stays at ~0 for many seconds = worklet not receiving samples.
      let lastRmsLogAt = 0;
      // Site permission granted but OS layer feeding zero samples — surface
      // a specific error instead of letting silence hide the real cause.
      // Counts CONSECUTIVE zero polls so transient zeros don't false-trip;
      // OS-mute always produces literal-zero samples on every poll.
      let osMuteFlagged = false;
      let consecutiveZeroPolls = 0;
      const OS_MUTE_POLL_THRESHOLD = Math.ceil(OS_MUTE_THRESHOLD_MS / POLL_INTERVAL_MS);

      silenceTimerRef.current = setInterval(() => {
        // Skip only when the context is actually suspended; visibility
        // alone would hang recordings made while the user is elsewhere.
        if (audioContext.state === 'suspended') return;
        analyser.getFloatTimeDomainData(rmsSamples);
        let sumSquares = 0;
        for (let i = 0; i < rmsSamples.length; i++) sumSquares += rmsSamples[i] * rmsSamples[i];
        const rms = Math.sqrt(sumSquares / rmsSamples.length);

        const now = Date.now();
        if (now - lastRmsLogAt >= 1000) {
          log('rms', {
            rms: rms.toFixed(4),
            ctxState: audioContext.state,
            elapsedMs: now - recordingStartedAt,
          });
          lastRmsLogAt = now;
        }

        // OS-mute trip: OS_MUTE_POLL_THRESHOLD consecutive zero-RMS polls
        // while context is running = OS-level mic access denied. Counter
        // resets on any non-zero so transient zeros (buffer gaps, init
        // artifacts) don't false-trip.
        if (rms === 0) {
          consecutiveZeroPolls++;
        } else {
          consecutiveZeroPolls = 0;
        }
        if (
          !osMuteFlagged &&
          consecutiveZeroPolls >= OS_MUTE_POLL_THRESHOLD &&
          audioContext.state === 'running'
        ) {
          osMuteFlagged = true;
          abortWithError(micError('os-muted'));
          return;
        }

        if (rms > SILENCE_THRESHOLD) {
          speechDetected = true;
          silentSince = null;
        } else if (speechDetected) {
          if (silentSince === null) {
            silentSince = now;
          } else if (now - silentSince >= SILENCE_TIMEOUT_SECONDS * 1000) {
            finishRecording();
          }
        } else if (now - recordingStartedAt >= SILENCE_TIMEOUT_SECONDS * 1000) {
          finishRecording();
        }
      }, POLL_INTERVAL_MS);

      setIsRecording(true);
    } catch (err) {
      console.error('[mic] startRecording failed', err);
      // Match abortWithError ordering: flag first so any cleanup side-effect
      // that ends the track sees stoppingRef = true and skips the disconnect path.
      stoppingRef.current = true;
      releaseCaptureGraph();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const id = streamingIdRef.current;
      if (id) void platform.http.openai.transcribeStreaming?.discard(id);
      streamingIdRef.current = null;
      setStreamingId(null);
      setIsRecording(false);
      setError(classifyMicError(err));
    }
  }, [finishRecording, releaseCaptureGraph, abortWithError]);

  // Release all resources on unmount
  useEffect(() => {
    return () => {
      // Flag first for symmetry with abortWithError / startRecording catch.
      stoppingRef.current = true;
      finalizeRef.current = null;
      releaseCaptureGraph();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      permissionUnsubscribeRef.current?.();
      permissionUnsubscribeRef.current = null;
      const id = streamingIdRef.current;
      if (id) void platform.http.openai.transcribeStreaming?.discard(id);
      streamingIdRef.current = null;
    };
  }, [releaseCaptureGraph]);

  // iOS keeps AudioContext 'running' while hidden but stops frame flow,
  // which would let the silence guard miss and finish recording early.
  // Suspending on iOS only preserves the desktop tab-switch UX.
  useEffect(() => {
    const isIOS = getCurrentPlatform().os === 'ios';
    const onVisibilityChange = () => {
      const ctx = audioContextRef.current;
      if (!ctx || ctx.state === 'closed') return;
      if (document.hidden) {
        if (isIOS && ctx.state === 'running') {
          void ctx.suspend().catch(() => undefined);
        }
      } else if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => undefined);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const clearBlob = useCallback(() => setAudioBlob(null), []);

  return {
    startRecording,
    stopRecording,
    clearBlob,
    isRecording,
    audioBlob,
    streamingId,
    error,
  };
}
