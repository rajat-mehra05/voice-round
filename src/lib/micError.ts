import { APP_NAME } from '@/constants/copy';

/**
 * Structured microphone error taxonomy. One type per realistic failure mode,
 * plus a user-facing message. Callers branch on `kind` to decide whether to
 * show a retry button, a settings link, or a hardware reconnect prompt.
 */

export type MicErrorKind =
  | 'unsupported'
  | 'no-device'
  | 'permission-denied'
  | 'permission-revoked'
  | 'device-in-use'
  | 'disconnected'
  | 'os-muted'
  | 'constraint'
  | 'unknown';

export interface MicError {
  kind: MicErrorKind;
  /** User-facing copy. Safe to render in the UI. */
  message: string;
  /** Raw error text for logs and debugging. Not shown to users. */
  detail?: string;
}

const MESSAGES: Record<MicErrorKind, string> = {
  unsupported:
    "Your browser doesn't support audio recording. Please use a recent version of Chrome, Firefox, or Safari.",
  'no-device': 'No microphone detected. Please connect a microphone and try again.',
  'permission-denied': `Microphone access is blocked. Open system settings and allow ${APP_NAME} to use the microphone.`,
  'permission-revoked':
    'Microphone access was revoked during the session. Re-enable it in system settings and retry.',
  'device-in-use':
    'The microphone is in use by another app. Close anything else that might be using it and retry.',
  disconnected:
    'Microphone was disconnected. This often happens when another app or browser extension takes the mic. Close other audio apps, disable browser extensions (especially privacy or ad-blocking ones), then click Retry.',
  'os-muted':
    'No audio is reaching the microphone. On macOS, open System Settings → Privacy & Security → Microphone and confirm your browser has access. On Windows, check Settings → Privacy → Microphone. Then click Retry.',
  constraint:
    "Your microphone doesn't match the required audio constraints. Try a different input device.",
  unknown: 'Recording failed unexpectedly.',
};

export function micError(kind: MicErrorKind, override?: string): MicError {
  return { kind, message: override ?? MESSAGES[kind] };
}

/** Maps a `getUserMedia` / browser failure into a structured MicError. */
export function classifyMicError(err: unknown): MicError {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return micError('permission-denied');
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return micError('no-device');
      case 'NotReadableError':
      case 'TrackStartError':
        return micError('device-in-use');
      case 'OverconstrainedError':
      case 'ConstraintNotSatisfiedError':
        return micError('constraint');
    }
  }
  const detail = err instanceof Error ? err.message : String(err);
  return { kind: 'unknown', message: MESSAGES.unknown, detail: detail || undefined };
}

/**
 * Resolves the OS microphone settings URL for the current platform. Returns
 * null on Linux/unknown platforms where no reliable deep link exists.
 * Single source of truth for both `openMicSettings` and `canOpenMicSettings`.
 */
function micSettingsUrl(): string | null {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  if (/Mac OS X|Macintosh/.test(ua)) {
    return 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone';
  }
  if (/Windows/.test(ua)) {
    return 'ms-settings:privacy-microphone';
  }
  return null;
}

/**
 * Opens the OS microphone settings pane. Falls back silently on unsupported
 * platforms; the UI should keep its textual instructions visible regardless.
 */
export function openMicSettings(): void {
  const url = micSettingsUrl();
  if (!url || typeof document === 'undefined') return;
  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function canOpenMicSettings(): boolean {
  return micSettingsUrl() !== null;
}
