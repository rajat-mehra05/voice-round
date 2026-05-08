import { useEffect, useMemo, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { getCurrentPlatform, type Platform } from '@/lib/detectPlatform';
import {
  consumeInstallPrompt,
  useInstallPrompt,
  type BeforeInstallPromptEvent,
} from '@/lib/installPrompt';
import { trackEvent } from '@/lib/analytics';
import {
  APP_NAME,
  INSTALL_DESKTOP_BYOK_LINK,
  INSTALL_DESKTOP_BYOK_NOTE,
  INSTALL_DESKTOP_LINUX_BODY,
  INSTALL_DESKTOP_LINUX_EYEBROW,
  INSTALL_DESKTOP_PWA_BUTTON,
  INSTALL_DESKTOP_PWA_LOCKED_HINT,
  INSTALL_MOBILE_ANDROID_HINT,
  INSTALL_MOBILE_EYEBROW,
  INSTALL_MOBILE_FIREFOX_HEADING,
  INSTALL_MOBILE_FIREFOX_STEP_3,
  INSTALL_MOBILE_IOS_BUTTON,
  INSTALL_MOBILE_SUBHEADING,
} from '@/constants/copy';
import { DownloadCta } from './DownloadCta';
import { OsWarning, type TauriOs } from './OsWarning';
import { IosInstallModal } from './IosInstallModal';
import { ByokExplainerModal } from './ByokExplainerModal';

// PWA.4 dispatcher: hides inside installed PWA/Tauri; mobile iOS uses A2HS modal;
// mobile other triggers beforeinstallprompt; desktop branches on Tauri build availability.
export function InstallSection() {
  const platform = useMemo(() => getCurrentPlatform(), []);
  const { event: installPromptEvent, installed } = useInstallPrompt();

  if (platform.isStandalone || installed) return null;

  if (platform.device === 'mobile') {
    return <MobileInstallCta platform={platform} promptEvent={installPromptEvent} />;
  }

  return <DesktopInstallCta platform={platform} promptEvent={installPromptEvent} />;
}

interface CtaProps {
  platform: Platform;
  promptEvent: BeforeInstallPromptEvent | null;
}

// Shared flow: trigger the install prompt, await the outcome, fire telemetry, clear the stashed event.
async function runInstallPrompt(
  promptEvent: BeforeInstallPromptEvent,
  surface: string,
): Promise<void> {
  try {
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    void trackEvent(
      outcome === 'accepted' ? 'pwa_install_prompt_accepted' : 'pwa_install_prompt_dismissed',
      { surface },
    );
  } catch {
    /* prompt() rejects on double-call; safe to swallow */
  } finally {
    consumeInstallPrompt();
  }
}

function MobileInstallCta({ platform, promptEvent }: CtaProps) {
  const [iosOpen, setIosOpen] = useState(false);
  const iosInstructionsTrackedRef = useRef(false);
  const surface = platform.os === 'ios' ? 'mobile-ios' : 'mobile-other';

  // Fire once per mount; route remounts count as a new impression.
  useEffect(() => {
    void trackEvent('pwa_install_prompt_shown', { surface, browser: platform.browser });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAndroidInstall = async () => {
    if (!promptEvent) return;
    await runInstallPrompt(promptEvent, surface);
  };

  const handleIosInstall = () => {
    setIosOpen(true);
    if (iosInstructionsTrackedRef.current) return;
    iosInstructionsTrackedRef.current = true;
    // iOS has no install-confirm signal; fire one impression per mount to match pwa_install_prompt_shown.
    void trackEvent('pwa_install_instructions_shown', { surface });
  };

  return (
    <section className="border-4 border-black bg-white p-8 shadow-neo-lg sm:p-12">
      <p className="text-xs font-black uppercase tracking-widest text-black/50">
        {INSTALL_MOBILE_EYEBROW}
      </p>
      <h2 className="mt-3 text-xl font-black uppercase leading-tight tracking-tight text-black sm:text-2xl">
        Add {APP_NAME} to your{' '}
        <span className="relative inline-block whitespace-nowrap">
          <span className="relative z-10">home screen.</span>
          <span
            className="absolute bottom-1 left-0 -z-0 h-3 w-full -rotate-1 bg-neo-accent"
            aria-hidden="true"
          />
        </span>
      </h2>
      <p className="mt-4 text-sm font-medium text-black/70">{INSTALL_MOBILE_SUBHEADING}</p>

      {platform.os === 'ios' ? (
        <>
          <button
            type="button"
            onClick={handleIosInstall}
            className={`${buttonVariants({ size: 'lg' })} mt-6 h-14 min-w-[240px]`}
          >
            <Download className="h-5 w-5" aria-hidden="true" />
            {INSTALL_MOBILE_IOS_BUTTON}
          </button>
          <IosInstallModal open={iosOpen} onOpenChange={setIosOpen} />
        </>
      ) : platform.browser === 'firefox' ? (
        // Firefox Android has no beforeinstallprompt; show menu steps instead of a dead button.
        <div className="mt-6 border-2 border-black bg-neo-secondary/30 p-4">
          <p className="text-sm font-bold text-black">{INSTALL_MOBILE_FIREFOX_HEADING}</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm font-medium text-black/80">
            <li>
              Tap the menu (<strong>⋮</strong>) at the top right.
            </li>
            <li>
              Choose <strong>Install</strong>.
            </li>
            <li>{INSTALL_MOBILE_FIREFOX_STEP_3}</li>
          </ol>
        </div>
      ) : (
        <>
          {/* Chromium fires beforeinstallprompt on engagement; button stays disabled until then. */}
          <button
            type="button"
            onClick={() => void handleAndroidInstall()}
            disabled={!promptEvent}
            className={`${buttonVariants({ size: 'lg' })} mt-6 h-14 min-w-[240px] disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <Download className="h-5 w-5" aria-hidden="true" />
            Install {APP_NAME}
          </button>
          <p className="mt-3 text-sm font-medium text-black/60">{INSTALL_MOBILE_ANDROID_HINT}</p>
        </>
      )}
    </section>
  );
}

function DesktopInstallCta({ platform, promptEvent }: CtaProps) {
  const [byokOpen, setByokOpen] = useState(false);
  // Only mac/Windows have Tauri builds; Linux/unknown get a PWA-primary layout.
  const hasTauriBuild = platform.os === 'mac' || platform.os === 'windows';
  const initialTauriOs: TauriOs = platform.os === 'windows' ? 'windows' : 'mac';
  const [cta, setCta] = useState<TauriOs>(initialTauriOs);

  useEffect(() => {
    if (platform.supportsPwaInstall) {
      void trackEvent('pwa_install_prompt_shown', {
        surface: hasTauriBuild ? 'desktop-secondary' : 'desktop-primary',
        browser: platform.browser,
      });
    }
  }, [platform.supportsPwaInstall, platform.browser, hasTauriBuild]);

  const handlePwaInstall = async () => {
    if (!promptEvent) return;
    await runInstallPrompt(promptEvent, hasTauriBuild ? 'desktop-secondary' : 'desktop-primary');
  };

  // No Tauri build for this OS; PWA is primary, no misleading .dmg CTA.
  if (!hasTauriBuild) {
    return (
      <section className="border-4 border-black bg-white p-8 shadow-neo-lg sm:p-12">
        <p className="text-xs font-black uppercase tracking-widest text-black/50">
          {INSTALL_DESKTOP_LINUX_EYEBROW}
        </p>
        <h2 className="mt-3 text-xl font-black uppercase leading-tight tracking-tight text-black sm:text-2xl">
          {APP_NAME} on{' '}
          <span className="relative inline-block whitespace-nowrap">
            <span className="relative z-10">your desktop.</span>
            <span
              className="absolute bottom-1 left-0 -z-0 h-3 w-full -rotate-1 bg-neo-accent"
              aria-hidden="true"
            />
          </span>
        </h2>
        <p className="mt-4 text-sm font-medium text-black/70">{INSTALL_DESKTOP_LINUX_BODY}</p>

        {platform.supportsPwaInstall ? (
          <>
            <button
              type="button"
              onClick={() => void handlePwaInstall()}
              disabled={!promptEvent}
              className="mt-6 cursor-pointer border-2 border-black bg-neo-accent px-6 py-3 text-sm font-bold uppercase tracking-wide text-black shadow-neo transition-all hover:-translate-y-0.5 hover:shadow-neo-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {INSTALL_DESKTOP_PWA_BUTTON}
            </button>
            <p className="mt-3 text-xs font-medium text-black/60">
              {INSTALL_DESKTOP_BYOK_NOTE}{' '}
              <button
                type="button"
                onClick={() => setByokOpen(true)}
                className="cursor-pointer underline hover:text-black"
              >
                {INSTALL_DESKTOP_BYOK_LINK}
              </button>
            </p>
          </>
        ) : (
          <p className="mt-6 text-sm font-medium text-black/70">
            Your browser doesn&apos;t support installing this site as a web app. Open {APP_NAME} in{' '}
            <strong>Chrome, Edge, or Brave</strong> on Linux to get an installable PWA, or just keep
            using it in your current browser tab. It works the same either way.
          </p>
        )}
        <ByokExplainerModal open={byokOpen} onOpenChange={setByokOpen} />
      </section>
    );
  }

  return (
    <section className="border-4 border-black bg-white p-8 shadow-neo-lg sm:p-12">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-12">
        <DownloadCta platform={cta} onSwitch={setCta} />
        <OsWarning platform={cta} />
      </div>

      {/* PWA secondary, Chromium desktop only (supportsPwaInstall is true). */}
      {platform.supportsPwaInstall ? (
        <div className="mt-6 border-t-2 border-black/20 pt-6">
          <p className="text-sm font-bold text-black">
            Or install as a lightweight web app.{' '}
            <button
              type="button"
              onClick={() => void handlePwaInstall()}
              disabled={!promptEvent}
              className="underline hover:bg-neo-secondary disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
            >
              {INSTALL_DESKTOP_PWA_BUTTON}
            </button>
            {!promptEvent ? (
              <span className="ml-1 text-xs font-medium text-black/50">
                {INSTALL_DESKTOP_PWA_LOCKED_HINT}
              </span>
            ) : null}
          </p>
          <p className="mt-2 text-xs font-medium text-black/60">
            {INSTALL_DESKTOP_BYOK_NOTE}{' '}
            <button
              type="button"
              onClick={() => setByokOpen(true)}
              className="cursor-pointer underline hover:text-black"
            >
              {INSTALL_DESKTOP_BYOK_LINK}
            </button>
          </p>
          <ByokExplainerModal open={byokOpen} onOpenChange={setByokOpen} />
        </div>
      ) : null}

      {/* Sonoma+ Safari has File → Add to Dock but no JS API; Firefox has nothing. */}
      {!platform.supportsPwaInstall && platform.browser === 'safari' ? (
        <p className="mt-6 border-t-2 border-black/20 pt-6 text-sm font-medium text-black/70">
          Or use <strong>File → Add to Dock</strong> in Safari to install as a web app. No
          programmatic prompt in Safari.
        </p>
      ) : null}
    </section>
  );
}
