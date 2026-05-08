import { APP_NAME } from '@/constants/copy';

/**
 * Decodes and plays a full-buffer mp3/wav/etc. Resolves when playback ends,
 * rejects on abort or decode error. Shared by web adapter; Tauri adapter uses
 * its own MediaSource-based streaming playback.
 */
export async function playAudioArrayBuffer(
  buffer: ArrayBuffer,
  signal?: AbortSignal,
): Promise<void> {
  if (signal?.aborted) {
    throw new DOMException('Audio playback aborted', 'AbortError');
  }
  const audioContext = new AudioContext();
  const closeContext = () => {
    if (audioContext.state !== 'closed') void audioContext.close();
  };

  // iOS opens AudioContext suspended; throw if resume fails so playback
  // doesn't silently no-op (source.start on a suspended context is silent).
  if (audioContext.state === 'suspended') {
    await audioContext.resume().catch(() => undefined);
  }
  if (audioContext.state !== 'running') {
    closeContext();
    throw new Error(
      `AudioContext could not resume (state: ${audioContext.state}). On iOS this usually means user activation was consumed before playback started.`,
    );
  }

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioContext.decodeAudioData(buffer);
  } catch (error) {
    // MediaSession + visibilitychange attach below, so nothing to unregister here.
    closeContext();
    if (signal?.aborted) {
      throw new DOMException('Audio playback aborted', 'AbortError');
    }
    throw error;
  }

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);

  // Lock-screen tile via MediaSession; per-question title left as follow-up.
  const mediaSession = typeof navigator !== 'undefined' ? navigator.mediaSession : undefined;
  const previousMetadata = mediaSession?.metadata ?? null;
  if (mediaSession && typeof MediaMetadata !== 'undefined') {
    // BASE_URL keeps artwork resolvable under Tauri's './' base.
    const baseUrl = import.meta.env.BASE_URL;
    mediaSession.metadata = new MediaMetadata({
      title: APP_NAME,
      artist: 'Mock interview',
      artwork: [
        { src: `${baseUrl}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
        { src: `${baseUrl}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
      ],
    });
  }
  const clearMediaSession = () => {
    if (!mediaSession) return;
    if ('playbackState' in mediaSession) {
      try {
        mediaSession.playbackState = 'none';
      } catch {
        /* read-only on older implementations */
      }
    }
    mediaSession.metadata = previousMetadata;
    try {
      mediaSession.setActionHandler('play', null);
      mediaSession.setActionHandler('pause', null);
    } catch {
      /* some browsers throw on unknown actions */
    }
  };

  // Track who suspended the context so visibility-restore doesn't override a user pause.
  let visibilitySuspended = false;
  let userPaused = false;

  // Manual visibility handling because iOS suspends/resumes inconsistently across tab switches.
  const onVisibilityChange = () => {
    if (audioContext.state === 'closed') return;
    if (document.hidden) {
      if (audioContext.state === 'running') {
        visibilitySuspended = true;
        void audioContext.suspend().catch(() => undefined);
      }
    } else if (visibilitySuspended && !userPaused) {
      visibilitySuspended = false;
      void audioContext.resume().catch(() => undefined);
    } else if (visibilitySuspended) {
      visibilitySuspended = false;
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  // Lock-screen play/pause maps to AudioContext suspend/resume so battery isn't burned on a paused track.
  if (mediaSession) {
    try {
      mediaSession.setActionHandler('pause', () => {
        userPaused = true;
        if (audioContext.state === 'running') {
          void audioContext.suspend().catch(() => undefined);
        }
        mediaSession.playbackState = 'paused';
      });
      mediaSession.setActionHandler('play', () => {
        userPaused = false;
        if (audioContext.state === 'suspended') {
          void audioContext.resume().catch(() => undefined);
        }
        mediaSession.playbackState = 'playing';
      });
      mediaSession.playbackState = 'playing';
    } catch {
      /* browsers without action-handler support */
    }
  }

  return new Promise<void>((resolve, reject) => {
    const teardown = () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearMediaSession();
    };

    const abortHandler = () => {
      source.onended = null;
      // source.stop() throws InvalidStateError if called before start(); swallow.
      try {
        source.stop();
      } catch {
        /* not yet started */
      }
      teardown();
      closeContext();
      reject(new DOMException('Audio playback aborted', 'AbortError'));
    };

    const cleanupListeners = () => {
      source.onended = null;
      if (signal) signal.removeEventListener('abort', abortHandler);
      teardown();
    };

    source.onended = () => {
      cleanupListeners();
      closeContext();
      resolve();
    };

    if (signal) {
      if (signal.aborted) {
        teardown();
        closeContext();
        reject(new DOMException('Audio playback aborted', 'AbortError'));
        return;
      }
      signal.addEventListener('abort', abortHandler, { once: true });
    }

    try {
      source.start();
    } catch (error) {
      cleanupListeners();
      closeContext();
      reject(error instanceof Error ? error : new Error('Failed to start audio playback'));
    }
  });
}
