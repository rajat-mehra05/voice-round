import { platform } from '@/platform';
import { STT_MODEL } from '@/constants/openai';
import { CAPTURE_SAMPLE_RATE } from '@/constants/audio';
import { mark } from '@/lib/perf';

/**
 * Transcribes an audio blob using OpenAI's STT model.
 * Returns the transcript text. The adapter handles network timeouts and
 * keychain-backed authentication on Tauri.
 *
 * `streamingId` is set by the recorder when chunks were pre-shipped to the
 * Rust-side buffer. In that case we commit the buffer instead of re-uploading
 * the blob; the transcript round-trip becomes just the OpenAI HTTP POST plus
 * the last chunk's IPC.
 */
export async function transcribeAudio(
  blob: Blob,
  signal?: AbortSignal,
  streamingId?: string | null,
): Promise<string> {
  const streaming = platform.http.openai.transcribeStreaming;

  // `transcribe_start` is marked by the recorder on the first chunk for the
  // streaming path; mark it here only when we're falling back to the
  // full-blob upload so the stage still appears in the perf log.
  if (!streaming || !streamingId) mark('transcribe_start');

  // Diagnostic for device-specific transcription failures (size + container).
  console.debug(
    `[stt] upload blob: type=${blob.type || '(unset)'} size=${blob.size}B streaming=${
      streaming && streamingId ? 'yes' : 'no'
    }`,
  );

  try {
    const raw =
      streaming && streamingId
        ? await streaming.commit(
            {
              requestId: streamingId,
              model: STT_MODEL,
              // Rust prepends a WAV header when sampleRate is set, so the
              // filename/content-type must advertise WAV regardless of what
              // the recorder's fallback blob reports.
              filename: 'recording.wav',
              contentType: 'audio/wav',
              sampleRate: CAPTURE_SAMPLE_RATE,
            },
            signal,
          )
        : await platform.http.openai.transcribe(
            { model: STT_MODEL, audio: blob, filename: filenameFor(blob) },
            signal,
          );
    return applyTranscriptCorrections(raw);
  } finally {
    mark('transcribe_end');
  }
}

// Each correction has a `safe` pattern that always rewrites and an optional
// `guarded` pattern that only rewrites when `context` proves intent.
// Lowercase variants of a library name are ambiguous in English ("just end
// the call") so they require a domain-vocabulary witness.
interface TranscriptCorrection {
  safe: RegExp;
  guarded?: RegExp;
  context?: RegExp;
  replacement: string;
}

const CORRECTIONS: TranscriptCorrection[] = [
  {
    // Capitalized "JustEnd" / "Just End" is unambiguously the library name.
    safe: /\bJust\s*End\b/g,
    // Lowercase "just end" needs a state-management witness to avoid
    // rewriting phrases like "let's just end the call". "Zustand" itself
    // counts as a witness so chains within one answer resolve correctly.
    guarded: /\bjust\s*end\b/gi,
    context:
      /\b(zustand|redux|jotai|recoil|mobx|context\s*api|state\s*management|store|hooks?|use\s*state|use\s*reducer)\b/i,
    replacement: 'Zustand',
  },
];

export function applyTranscriptCorrections(text: string): string {
  return CORRECTIONS.reduce((acc, { safe, guarded, context, replacement }) => {
    const afterSafe = acc.replace(safe, replacement);
    if (guarded && context && context.test(afterSafe)) {
      return afterSafe.replace(guarded, replacement);
    }
    return afterSafe;
  }, text);
}

// OpenAI's transcription endpoint uses the filename extension to infer the
// container format. Safari / WKWebView (Tauri on macOS) produces `audio/mp4`
// because webm/opus isn't supported there, so a hardcoded `.webm` name leads
// to `invalid_value` even though the bytes are fine.
function filenameFor(blob: Blob): string {
  const type = blob.type.split(';')[0];
  const ext = EXT_BY_MIME[type] ?? 'webm';
  return `recording.${ext}`;
}

const EXT_BY_MIME: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
};
