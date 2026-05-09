import { PreviewCard } from '@base-ui/react/preview-card';
import {
  type ReleaseCategory,
  useLatestChangelog,
} from '@/hooks/useLatestChangelog/useLatestChangelog';
import {
  CHANGELOG_BADGE_MAJOR,
  CHANGELOG_BADGE_MINOR,
  CHANGELOG_BADGE_PATCH,
  CHANGELOG_PILL_LABEL,
  CHANGELOG_POPUP_TITLE_PREFIX,
} from '@/constants/copy';

const BADGE_LABEL: Record<ReleaseCategory, string> = {
  major: CHANGELOG_BADGE_MAJOR,
  minor: CHANGELOG_BADGE_MINOR,
  patch: CHANGELOG_BADGE_PATCH,
};

const BADGE_COLOR: Record<ReleaseCategory, string> = {
  major: 'bg-red-200 text-red-900',
  minor: 'bg-neo-accent text-black',
  patch: 'bg-neo-secondary text-black',
};

export function ChangelogPill() {
  const changelog = useLatestChangelog();

  if (!changelog) return null;

  return (
    <div className="flex justify-center">
      <PreviewCard.Root>
        <PreviewCard.Trigger
          delay={120}
          closeDelay={150}
          render={
            // eslint-disable-next-line jsx-a11y/anchor-has-content -- children are injected by PreviewCard.Trigger via the render prop pattern; static analysis cannot see them on the literal <a>.
            <a
              href={changelog.releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border-2 border-black bg-neo-cream px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-black shadow-neo-sm transition-colors hover:bg-neo-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            />
          }
        >
          <span className="relative flex size-2 shrink-0">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75"
              aria-hidden="true"
            />
            <span
              className="relative inline-flex size-2 rounded-full bg-green-500"
              aria-hidden="true"
            />
          </span>
          {changelog.version}. {CHANGELOG_PILL_LABEL}
        </PreviewCard.Trigger>
        <PreviewCard.Portal>
          <PreviewCard.Positioner sideOffset={8} align="center">
            <PreviewCard.Popup className="max-h-[60vh] w-[min(calc(100vw-2rem),28rem)] overflow-y-auto border-4 border-black bg-neo-cream p-5 shadow-neo-md transition-[opacity,transform] duration-150 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
              <div className="mb-3 flex items-center justify-between gap-3 border-b-2 border-black pb-2">
                <h3 className="text-sm font-black uppercase tracking-tight text-black">
                  {CHANGELOG_POPUP_TITLE_PREFIX} {changelog.version}
                </h3>
                <span
                  className={`shrink-0 whitespace-nowrap border-2 border-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${BADGE_COLOR[changelog.category]}`}
                >
                  {BADGE_LABEL[changelog.category]}
                </span>
              </div>
              <ul className="space-y-2 text-sm font-medium leading-relaxed text-black/80">
                {changelog.bullets.map((bullet, i) => (
                  <li key={i} className="flex gap-2">
                    <span
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-neo-accent"
                      aria-hidden="true"
                    />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </PreviewCard.Popup>
          </PreviewCard.Positioner>
        </PreviewCard.Portal>
      </PreviewCard.Root>
    </div>
  );
}
