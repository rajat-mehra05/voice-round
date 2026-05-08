import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { StartModal } from '@/components/StartModal/StartModal';
import { InstallSection } from '@/components/InstallSection/InstallSection';
import { FEATURES } from '@/constants/home';
import {
  APP_NAME,
  HOME_BADGE,
  HOME_HERO_HEADING_LINE1,
  HOME_HERO_HEADING_LINE2,
  HOME_HERO_BODY,
  HOME_HERO_TAGLINE,
  HOME_START_LABEL,
  HOME_CTA_HINT,
  HOME_DESKTOP_CTA_HINT,
  HOME_DESKTOP_CTA_LABEL,
  HOME_FOOTER_OPEN_SOURCE,
  GITHUB_REPO_URL,
  GITHUB_ISSUES_URL,
  GITHUB_RELEASES_URL,
} from '@/constants/copy';

function preloadSession() {
  void import('@/pages/Session/Session');
}

export function Home() {
  const [startOpen, setStartOpen] = useState(false);

  return (
    <div className="flex flex-1 flex-col gap-16 py-4 sm:gap-20">
      {/* Hero — left copy, right CTA */}
      <section className="flex flex-col items-center gap-10 lg:flex-row lg:gap-16">
        {/* Left: copy */}
        <div className="flex-1 space-y-6 text-center lg:text-left">
          <div className="inline-block border-2 border-black bg-neo-secondary px-3 py-1 text-xs font-bold uppercase tracking-widest shadow-neo-sm">
            {HOME_BADGE}
          </div>

          <h1 className="text-4xl font-black uppercase leading-[1.1] tracking-tight text-black sm:text-5xl lg:text-6xl">
            {HOME_HERO_HEADING_LINE1}
            <br />
            <span className="relative inline-block">
              <span className="relative z-10">{HOME_HERO_HEADING_LINE2}</span>
              <span
                className="absolute bottom-1 left-0 -z-0 h-4 w-full -rotate-1 bg-neo-accent sm:h-5"
                aria-hidden="true"
              />
            </span>
          </h1>

          <p className="max-w-lg text-lg font-medium leading-relaxed text-black/70 lg:text-xl">
            {HOME_HERO_BODY} <strong className="text-black">{HOME_HERO_TAGLINE}</strong>
          </p>
        </div>

        {/* Right: CTA block */}
        <div className="relative flex shrink-0 flex-col items-center gap-6">
          {/* Big Start Button */}
          <button
            onClick={() => setStartOpen(true)}
            onMouseEnter={preloadSession}
            onFocus={preloadSession}
            aria-label={HOME_START_LABEL}
            className="group relative flex h-40 w-40 cursor-pointer items-center justify-center border-4 border-black bg-neo-accent text-2xl font-black uppercase tracking-wide text-black shadow-neo-lg transition-all duration-150 animate-neo-start-wiggle hover:-translate-y-2 hover:shadow-[16px_16px_0px_0px_#000] hover:[animation-play-state:paused] focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none sm:h-48 sm:w-48 sm:text-3xl"
          >
            <span className="transition-transform duration-150 group-hover:scale-110">Start</span>
          </button>

          <p className="max-w-[240px] text-center text-sm font-bold text-black/60">
            {HOME_CTA_HINT}
          </p>
        </div>
      </section>

      {/* Feature cards */}
      <section aria-labelledby="features-heading" className="space-y-8">
        <h2
          id="features-heading"
          className="flex items-center gap-1 text-2xl font-black uppercase tracking-tight text-black sm:text-3xl"
        >
          <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" strokeWidth={3} />
          Why{' '}
          <span className="relative inline-block">
            <span className="relative z-10">{APP_NAME}</span>
            <span
              className="absolute bottom-1 left-0 -z-0 h-2 w-full -rotate-1 bg-neo-accent sm:h-2.5"
              aria-hidden="true"
            />
          </span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, desc, color }) => (
            <div
              key={title}
              className="border-4 border-black bg-white p-5 shadow-neo-sm transition-all duration-100 hover:-translate-y-1 hover:shadow-neo-md"
            >
              <div
                className={`mb-3 inline-flex h-10 w-10 items-center justify-center border-2 border-black ${color}`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mb-1 text-sm font-bold uppercase tracking-wider">{title}</h3>
              <p className="text-sm font-medium text-black/60">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Install section — web-only and desktop-viewport-only. The CTAs pitch
          .dmg/.exe downloads which are useless on a phone, and the "You're on
          macOS/Windows" detection is desktop-shaped. PWA.4 will replace this
          with a real mobile install CTA. */}
      {import.meta.env.VITE_TARGET !== 'tauri' ? (
        <section aria-labelledby="install-heading" className="hidden space-y-8 md:block">
          <h2
            id="install-heading"
            className="flex items-center gap-1 text-2xl font-black uppercase tracking-tight text-black sm:text-3xl"
          >
            <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" strokeWidth={3} />
            Run it{' '}
            <span className="relative inline-block">
              <span className="relative z-10">anywhere</span>
              <span
                className="absolute bottom-1 left-0 -z-0 h-2 w-full -rotate-1 bg-neo-accent sm:h-2.5"
                aria-hidden="true"
              />
            </span>
          </h2>
          <InstallSection />
        </section>
      ) : null}

      {/* Footer */}
      <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pb-4 text-center text-sm font-bold text-black/60">
        <span>{HOME_FOOTER_OPEN_SOURCE}</span>
        <span aria-hidden="true" className="text-black/20">
          |
        </span>
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-black"
        >
          GitHub
        </a>
        <span aria-hidden="true" className="text-black/20">
          |
        </span>
        <a
          href={GITHUB_ISSUES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-black"
        >
          Open an issue
        </a>
        {/* Desktop download CTA — web-only and hidden on mobile (links a
            .dmg/.exe which the user can't run on a phone). PWA.4 replaces
            this with a per-device-aware install path. */}
        {import.meta.env.VITE_TARGET !== 'tauri' ? (
          <>
            <span aria-hidden="true" className="hidden text-black/20 md:inline">
              |
            </span>
            <a
              href={GITHUB_RELEASES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden underline hover:text-black md:inline"
              title={`${HOME_DESKTOP_CTA_HINT} macOS · Windows`}
            >
              {HOME_DESKTOP_CTA_LABEL}
            </a>
          </>
        ) : null}
      </footer>

      <StartModal open={startOpen} onOpenChange={setStartOpen} />
    </div>
  );
}
