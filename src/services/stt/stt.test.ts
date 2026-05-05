import { expect, test, vi } from 'vitest';
import { platform } from '@/platform';
import { transcribeAudio, applyTranscriptCorrections } from '@/services/stt/stt';

// The OpenAI transcription request is multipart/form-data, which jsdom
// currently can't round-trip through MSW (file handling differs from the
// real browser fetch). We substitute at the next boundary up — the platform
// HTTP adapter — and assert on the user-observable outcomes rather than on
// invocation shape.
test('a recording round-trips into a transcript, and rate-limit responses surface as retryable', async ({
  onTestFinished,
}) => {
  const blob = new Blob(['fake audio'], { type: 'audio/webm' });

  const transcribe = vi
    .spyOn(platform.http.openai, 'transcribe')
    .mockResolvedValueOnce('A closure captures variables.')
    .mockRejectedValueOnce({ type: 'rate_limit', message: 'rate limited', retryable: true });
  onTestFinished(() => transcribe.mockRestore());

  expect(await transcribeAudio(blob)).toBe('A closure captures variables.');

  await expect(transcribeAudio(blob)).rejects.toMatchObject({ type: 'rate_limit' });
});

// When the recorder has been streaming chunks to a Rust-side buffer, the
// post-mic-stop transcribe path should commit the buffer instead of
// re-uploading the blob.
test('recordings streamed during the turn commit by id instead of re-uploading the blob', async ({
  onTestFinished,
}) => {
  const blob = new Blob(['fake audio'], { type: 'audio/webm' });
  const commit = vi.fn().mockResolvedValue('Server replied from the buffered upload.');
  const pushChunk = vi.fn().mockResolvedValue(undefined);
  const discard = vi.fn().mockResolvedValue(undefined);
  const fallbackTranscribe = vi.spyOn(platform.http.openai, 'transcribe');

  const original = platform.http.openai.transcribeStreaming;
  platform.http.openai.transcribeStreaming = { pushChunk, commit, discard };
  onTestFinished(() => {
    platform.http.openai.transcribeStreaming = original;
    fallbackTranscribe.mockRestore();
  });

  const transcript = await transcribeAudio(blob, undefined, 'req-123');
  expect(transcript).toBe('Server replied from the buffered upload.');
  expect(commit).toHaveBeenCalledTimes(1);
  const [commitArgs] = commit.mock.calls[0] as [Record<string, unknown>];
  expect(commitArgs.requestId).toBe('req-123');
  // Recorder streams raw 16kHz mono PCM; commit tells the backend to wrap
  // it in a WAV header regardless of the recorder's fallback blob type.
  expect(commitArgs.filename).toBe('recording.wav');
  expect(commitArgs.contentType).toBe('audio/wav');
  expect(commitArgs.sampleRate).toBe(16000);
  expect(typeof commitArgs.model).toBe('string');
  // Full-blob transcribe was NOT called — that's the point of 9.2.
  expect(fallbackTranscribe).not.toHaveBeenCalled();
});

test('applyTranscriptCorrections rewrites the proper-noun form unconditionally', () => {
  // STT proper-cases what it thinks is a library name. Both shapes always rewrite.
  expect(applyTranscriptCorrections('I prefer JustEnd over Redux')).toBe(
    'I prefer Zustand over Redux',
  );
  expect(applyTranscriptCorrections('Just End is gaining popularity')).toBe(
    'Zustand is gaining popularity',
  );
  // Capitalized form rewrites even with no other state-management context.
  expect(applyTranscriptCorrections('My favourite library is JustEnd.')).toBe(
    'My favourite library is Zustand.',
  );
});

test('applyTranscriptCorrections rewrites lowercase variant only when domain context is present', () => {
  // Domain witness present — rewrite is safe.
  expect(applyTranscriptCorrections('we use just end with Redux')).toBe(
    'we use Zustand with Redux',
  );
  expect(applyTranscriptCorrections('store backed by just end')).toBe('store backed by Zustand');

  // No domain witness — must NOT touch the phrase.
  expect(applyTranscriptCorrections('let me just end the call')).toBe('let me just end the call');
  expect(applyTranscriptCorrections("we'll just end the meeting at 3")).toBe(
    "we'll just end the meeting at 3",
  );

  // First-pass rewrites a capitalized variant; the resulting "Zustand" then
  // counts as a witness, enabling rewrite of a later lowercase occurrence.
  expect(applyTranscriptCorrections('I tried JustEnd. Then I used just end again.')).toBe(
    'I tried Zustand. Then I used Zustand again.',
  );
});

test('applyTranscriptCorrections leaves unrelated text alone', () => {
  expect(applyTranscriptCorrections('Redux Toolkit handles async actions')).toBe(
    'Redux Toolkit handles async actions',
  );
  expect(applyTranscriptCorrections('I justified the cost')).toBe('I justified the cost');
});
