import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { StartModal } from '@/components/StartModal/StartModal';
import { InstallSection } from '@/components/InstallSection/InstallSection';
import { FAQSection } from '@/components/FAQSection/FAQSection';
import { ChangelogPill } from '@/components/ChangelogPill/ChangelogPill';
import { FEATURES } from '@/constants/home';
import {
  APP_DISPLAY_NAME,
  FOOTER_TAGLINE,
  HOME_BADGE,
  HOME_HERO_HEADING_LINE1,
  HOME_HERO_HEADING_LINE2,
  HOME_HERO_BODY,
  HOME_HERO_TAGLINE,
  HOME_START_LABEL,
  HOME_CTA_HINT,
} from '@/constants/copy';
import logoSvg from '@/assets/logo.svg';

function preloadSession() {
  void import('@/pages/Session/Session');
}

export function Home() {
  const [startOpen, setStartOpen] = useState(false);

  return (
    <div className="flex flex-1 flex-col gap-16 py-4 sm:gap-20">
      <ChangelogPill />

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
            <span className="relative z-10">{APP_DISPLAY_NAME}</span>
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

      <FAQSection />

      {/* Footer */}
      <footer className="flex flex-col items-center gap-6 pb-8 pt-12 text-center">
        <div className="flex items-center gap-3">
          <img src={logoSvg} alt="" aria-hidden="true" className="h-12 w-12" />
          <span className="text-2xl font-black uppercase tracking-tight text-black">
            {APP_DISPLAY_NAME}
          </span>
        </div>
        <p className="max-w-xl text-base font-medium leading-relaxed text-black/70">
          {FOOTER_TAGLINE}
        </p>
        <p className="text-xs font-medium text-black/50">
          MIT License © {new Date().getFullYear()} {APP_DISPLAY_NAME}
        </p>
      </footer>

      <StartModal open={startOpen} onOpenChange={setStartOpen} />
    </div>
  );
}
