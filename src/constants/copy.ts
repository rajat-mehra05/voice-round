import { SILENCE_TIMEOUT_SECONDS } from '@/constants/session';

export const APP_NAME = 'VoiceRoundAI';

export const API_KEY_DESCRIPTION =
  'This app requires your own OpenAI API key. Your key stays on your device and is only sent to OpenAI.';
export const OPENAI_API_KEYS_URL = 'https://platform.openai.com/api-keys';

export const RECORDING_RULES = `Max answer length: 4 minutes · Auto-proceeds after ${SILENCE_TIMEOUT_SECONDS} seconds of silence`;

export const UNSUPPORTED_BROWSER_MESSAGE =
  "Your browser doesn't support audio recording. Please use a recent version of Chrome, Firefox, or Safari.";
export const NO_MIC_MESSAGE = 'No microphone detected. Please connect a microphone and try again.';
export const MIC_PERMISSION_MESSAGE =
  'Microphone access is required for the interview. Please allow microphone access in your browser settings and reload the page.';

// Home page
export const HOME_BADGE = 'AI-Powered Mock Interviews';
export const HOME_HERO_HEADING_LINE1 = 'Nail your next';
export const HOME_HERO_HEADING_LINE2 = 'tech interview';
export const HOME_HERO_BODY =
  'Practice real interviews out loud with an AI that listens, evaluates and improves your answers.';
export const HOME_HERO_TAGLINE = 'No fluff. Just honest feedback. Real improvement.';
export const HOME_START_LABEL = 'Start new interview session';
export const HOME_CTA_HINT = 'Ready when you are.';
export const HOME_FOOTER_OPEN_SOURCE = 'Fully Open source ❤️';
export const GITHUB_REPO_URL = 'https://github.com/rajat-mehra05/voice-round';
export const GITHUB_ISSUES_URL = 'https://github.com/rajat-mehra05/voice-round/issues';
export const GITHUB_RELEASES_URL = 'https://github.com/rajat-mehra05/voice-round/releases/latest';
export const HOME_DESKTOP_CTA_HINT = 'Prefer native?';
export const HOME_DESKTOP_CTA_LABEL = 'Get the desktop app';

// Install section (web-only) — desktop users already have the app.
export const INSTALL_HEADING = 'Installation';
export const INSTALL_SUBHEADING =
  'Native desktop app for macOS and Windows. Unsigned, so the OS will warn once.';

export const INSTALL_MACOS_STEPS: string[] = [
  'Download the .dmg below and open it.',
  'Drag VoiceRoundAI into Applications.',
  'First launch shows "developer cannot be verified". Click Cancel.',
  'Right-click the app in Applications → Open → Open again. Trusted from then on.',
  'Grant microphone access and enter your OpenAI API key on first launch.',
];

export const INSTALL_MACOS_FALLBACK =
  'If right-click → Open does not offer the trust option, run this once in Terminal:';
// `-dr` is recursive: the DMG drag-install puts the quarantine attribute on
// nested files inside the bundle too, so a non-recursive `-d` leaves most of
// the .app still quarantined and the Gatekeeper prompt returns.
export const INSTALL_MACOS_FALLBACK_COMMAND =
  'xattr -dr com.apple.quarantine /Applications/VoiceRoundAI.app';

export const INSTALL_MACOS_NOTE =
  'macOS shows an "unidentified developer" warning because the build is unsigned. Expected for open-source apps without a paid Apple Developer certificate.';

export const INSTALL_WINDOWS_STEPS: string[] = [
  'Download the .exe below and run it.',
  'SmartScreen shows "Windows protected your PC". Click More info → Run anyway.',
  'The installer fetches the Microsoft WebView2 runtime automatically if needed.',
  'Grant microphone access and enter your OpenAI API key on first launch.',
];

export const INSTALL_WINDOWS_NOTE =
  'Windows SmartScreen warns on unsigned apps. Clicking "More info" reveals the "Run anyway" button.';

export const INSTALL_DOWNLOAD_HEADING = 'Download';
export const INSTALL_DOWNLOAD_PRIMARY_MAC = 'Download for macOS';
export const INSTALL_DOWNLOAD_PRIMARY_WINDOWS = 'Download for Windows';
export const INSTALL_DOWNLOAD_ALSO_FOR = 'Also available for';

// Common
export const COMMON_GOT_IT = 'Got it';

// Mobile install CTA (PWA on phone). Heading copy is JSX-with-markup
// (decorative <span> highlight + brand interpolation) and lives inline at
// the call site per the markup-interleaved exception.
export const INSTALL_MOBILE_EYEBROW = 'Install on your phone';
export const INSTALL_MOBILE_SUBHEADING =
  'Opens full-screen, works offline for the app shell, stays one tap away.';
export const INSTALL_MOBILE_IOS_BUTTON = 'Install on iOS';
export const INSTALL_MOBILE_ANDROID_HINT =
  'If the button is disabled, browse around for a moment then look for the install option in your browser menu.';
export const INSTALL_MOBILE_FIREFOX_HEADING = 'Install via Firefox menu:';
export const INSTALL_MOBILE_FIREFOX_STEP_3 = 'Confirm the icon will appear on your home screen.';

// Desktop install CTA — Linux / unsupported (PWA primary). Heading and the
// unsupported-browser sentence are markup-interleaved and live inline.
export const INSTALL_DESKTOP_LINUX_EYEBROW = 'Install as a web app';
export const INSTALL_DESKTOP_LINUX_BODY =
  'No native build for Linux. The web app installs from your browser and runs in a standalone window.';

// Desktop install — PWA secondary
export const INSTALL_DESKTOP_PWA_BUTTON = 'Install in browser';
export const INSTALL_DESKTOP_PWA_LOCKED_HINT = '(browse around for a moment to unlock)';
export const INSTALL_DESKTOP_BYOK_NOTE =
  'Web app stores your API key in the browser instead of your OS keychain.';
export const INSTALL_DESKTOP_BYOK_LINK = 'Why the difference?';

// iOS A2HS modal
export const INSTALL_IOS_TITLE = 'Install on iPhone or iPad';
export const INSTALL_IOS_DESCRIPTION =
  "iOS doesn't support one-tap install. The Add to Home Screen flow takes about ten seconds.";
export const INSTALL_IOS_STEP_3_NAME_HINT = `Confirm the name (${APP_NAME}) and tap`;
export const INSTALL_IOS_FOOTER =
  'The Add to Home Screen entry only shows in Safari. If you opened this site in Chrome or another iOS browser, switch to Safari first.';

// OS warning panel (next to download CTA)
export const INSTALL_OS_WARNING_EYEBROW = 'Expect a one-time OS warning';
export const INSTALL_OS_WARNING_MAC_FALLBACK_LABEL = "If that doesn't work, run in Terminal:";

// BYOK explainer modal
export const BYOK_MODAL_TITLE = 'Where your API key is stored';
export const BYOK_MODAL_DESCRIPTION = `${APP_NAME} is BYOK. You bring your own OpenAI key. Where the key lives depends on which version you install.`;
export const BYOK_DESKTOP_HEADING = 'Desktop app (Tauri)';
export const BYOK_DESKTOP_BODY =
  "Key lives in the OS keychain (macOS Keychain, Windows Credential Manager). All OpenAI traffic is routed through a bundled Rust process so the key never reaches the renderer. Browser extensions on your system can't read it.";
export const BYOK_WEB_HEADING = 'Web app (PWA)';
export const BYOK_WEB_BODY =
  "Key lives in the browser's IndexedDB on this device. Two implications worth knowing:";
export const BYOK_WEB_RISK_XSS =
  'A successful XSS in the page can read the key and run charges against your OpenAI account.';
export const BYOK_WEB_RISK_EXTENSIONS =
  'Browser extensions with the right permissions can read IndexedDB on this origin.';
export const BYOK_FOOTER_NOTE =
  'For a personal device with a trusted browser the PWA is fine. The desktop app is a stronger choice on shared machines or where browser extension hygiene is weaker.';
