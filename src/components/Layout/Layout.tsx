import { type ReactNode, useState, useRef, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { SettingsModal } from '@/components/SettingsModal/SettingsModal';
import { APP_NAME, GITHUB_REPO_URL, HEADER_GITHUB_STAR_LABEL } from '@/constants/copy';
import { useHasSessions } from '@/hooks/useHasSessions/useHasSessions';
import { cn } from '@/lib/utils';
import logoSvg from '@/assets/logo.svg';

// GitHub Octocat mark. Lucide dropped its brand-icon set, so the icon is
// inlined here. Single use site, not worth a separate component file.
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1-.02-1.97-3.2.69-3.87-1.54-3.87-1.54-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.73-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18.91-.25 1.89-.38 2.86-.39.97.01 1.95.13 2.86.39 2.18-1.49 3.14-1.18 3.14-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.09 0 4.42-2.7 5.4-5.27 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.67.79.56 4.57-1.52 7.86-5.83 7.86-10.91C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const menuItemRefs = useRef<(HTMLElement | null)[]>([]);
  const location = useLocation();
  const hasSessions = useHasSessions();

  const isSessionRoute = location.pathname === '/session';
  const isHomeRoute = location.pathname === '/';
  /*
    History/Settings reveal once the user has saved at least one session,
    and stay hidden during an active interview to discourage navigating
    away mid-recording.
  */
  const showActions = hasSessions === true && !isSessionRoute;
  const showStar = isHomeRoute;

  const closeMenu = useCallback(() => {
    setMobileMenuOpen(false);
    menuToggleRef.current?.focus();
  }, []);

  const onMenuKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = menuItemRefs.current.filter(Boolean) as HTMLElement[];
      if (!items.length) return;
      const currentIndex = items.indexOf(document.activeElement as HTMLElement);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[next].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prev].focus();
      } else if (e.key === 'Escape') {
        closeMenu();
      }
    },
    [closeMenu],
  );

  // Focus first menu item when menu opens
  useEffect(() => {
    if (mobileMenuOpen) menuItemRefs.current[0]?.focus();
  }, [mobileMenuOpen]);

  // Reset mobile menu on route change so it doesn't render pre-opened after
  // the dropdown remounts (e.g. coming back from /session). Render-time
  // pattern per React docs, not an effect.
  const [prevPathname, setPrevPathname] = useState(location.pathname);
  if (prevPathname !== location.pathname) {
    setPrevPathname(location.pathname);
    setMobileMenuOpen(false);
  }

  // Global shortcut: Cmd+, (macOS) / Ctrl+, (Windows/Linux) opens Settings.
  // Skip when typing in an editable field so the modal does not interrupt input.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey || e.altKey) return;
      if (!(e.metaKey || e.ctrlKey) || e.key !== ',') return;
      const { target } = e;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      setSettingsOpen(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background neo-grid-pattern">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:border-2 focus:border-black focus:bg-neo-secondary focus:px-4 focus:py-2 focus:font-bold"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-50 border-b-4 border-black bg-neo-cream">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4"
        >
          <Link to="/" aria-label={`${APP_NAME} — Home`} className="flex items-center gap-2">
            <img
              src={logoSvg}
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              className="h-11 w-11"
            />
            <span className="text-xl font-bold uppercase leading-none tracking-tight text-black">
              {APP_NAME}
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {showStar && (
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={HEADER_GITHUB_STAR_LABEL}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'bg-neo-cream hover:bg-neo-accent',
                )}
              >
                <GitHubIcon className="size-4" />
                <span className="hidden md:inline">{HEADER_GITHUB_STAR_LABEL}</span>
              </a>
            )}

            {showActions && (
              <div className="hidden items-center gap-2 md:flex">
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<Link to="/history" />}
                >
                  History
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSettingsOpen(true)}
                  aria-haspopup="dialog"
                >
                  Settings
                </Button>
              </div>
            )}

            {showActions && (
              <div className="relative md:hidden">
                <Button
                  ref={menuToggleRef}
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-expanded={mobileMenuOpen}
                  aria-haspopup="menu"
                  aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                >
                  {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                </Button>

                {mobileMenuOpen && (
                  /* eslint-disable-next-line jsx-a11y/interactive-supports-focus -- WAI-ARIA menu pattern: focus lives on individual menuitems, not the container */
                  <div
                    role="menu"
                    onKeyDown={onMenuKeyDown}
                    className="absolute right-0 top-full z-50 mt-2 w-44 flex-col border-4 border-black bg-neo-cream shadow-neo-md"
                  >
                    <Link
                      ref={(el) => {
                        menuItemRefs.current[0] = el;
                      }}
                      role="menuitem"
                      tabIndex={-1}
                      to="/history"
                      className="block px-4 py-3 text-sm font-bold uppercase tracking-wide hover:bg-neo-secondary"
                      onClick={closeMenu}
                    >
                      History
                    </Link>
                    <hr className="border-t-2 border-black" />
                    <button
                      ref={(el) => {
                        menuItemRefs.current[1] = el;
                      }}
                      role="menuitem"
                      tabIndex={-1}
                      className="w-full px-4 py-3 text-left text-sm font-bold uppercase tracking-wide hover:bg-neo-secondary"
                      onClick={() => {
                        closeMenu();
                        setSettingsOpen(true);
                      }}
                    >
                      Settings
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 outline-none"
      >
        {children}
      </main>

      {settingsOpen && <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />}
    </div>
  );
}
