import { useEffect, useState } from 'react';
import { fetchLatestRelease } from '@/lib/githubLatestRelease';

export type ReleaseCategory = 'major' | 'minor' | 'patch';

export interface Changelog {
  version: string;
  bullets: string[];
  releaseUrl: string;
  category: ReleaseCategory;
}

/*
  Pulls the latest GitHub Release and extracts bullet lines from its
  markdown body. Returns undefined while loading, on fetch failure, or
  when the release has no parseable bullets, so callers hide the pill
  rather than rendering a "no changelog" placeholder.
*/
export function useLatestChangelog(): Changelog | undefined {
  const [changelog, setChangelog] = useState<Changelog | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchLatestRelease()
      .then((release) => {
        if (cancelled) return;
        const bullets = parseBullets(release.body ?? '');
        if (bullets.length === 0) return;
        setChangelog({
          version: release.tag_name,
          bullets,
          releaseUrl: release.html_url,
          category: categorizeRelease(release.tag_name),
        });
      })
      .catch(() => {
        // Network failure / 403 rate limit / no release. Silently hide.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return changelog;
}

/*
  Strips the `* `, `- `, `+ ` markers from markdown bullets, the
  GitHub-auto-generated `by @user ...` attribution (can appear as
  `by @user`, `by @user in #42`, or `by @user in https://...`, so we
  greedily drop from `by @<handle>` through end of line), and the
  conventional-commit type prefix (`feat:`, `fix:`, `chore:`, etc.)
  which is engineer-facing noise in a user-visible changelog. After
  stripping the prefix we capitalise the first letter so bullets read
  as proper sentences, with two safeguards: (1) we only capitalise
  when a prefix was actually stripped, since bullets without one were
  authored with intentional casing, and (2) we skip capitalisation
  when the second character is uppercase, to avoid mangling brand
  acronyms like `iOS` into `IOS`.
*/
const CONVENTIONAL_PREFIX =
  /^(?:feat|fix|chore|perf|refactor|docs|style|test|build|ci|revert)(?:\([^)]+\))?!?:\s*/i;

// Matches the auto-generated attribution at the start of a bullet (rare,
// happens when the bullet is just `by @user`) or after content
// (`feat: thing by @user in #42`). Anchored so it greedily eats to EOL.
const ATTRIBUTION = /(?:^|\s+)by\s+@[\w-]+.*$/i;

export function parseBullets(body: string): string[] {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[*\-+]\s+/.test(line))
    .map((line) => {
      const beforePrefix = line.replace(/^[*\-+]\s+/, '').replace(ATTRIBUTION, '');
      const afterPrefix = beforePrefix.replace(CONVENTIONAL_PREFIX, '');
      const cleaned = afterPrefix.trim();
      const prefixWasStripped = afterPrefix !== beforePrefix;
      const shouldCapitalise =
        prefixWasStripped && cleaned.length >= 2 && /^[a-z][a-z]/.test(cleaned);
      return shouldCapitalise ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : cleaned;
    })
    .filter((line) => line.length > 0);
}

/*
  Maps a semver tag to a user-facing category badge. Pre-1.0 (v0.x): a
  `0.X.0` bump is Minor, a `0.X.Y` patch is Patch. We never show Major
  before v1.0.0 — saving the badge for the actual stability promise
  prevents badge fatigue and matches how users read the version.
*/
function categorizeRelease(tag: string): ReleaseCategory {
  const match = tag.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) return 'patch';
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (major === 0) {
    return patch > 0 ? 'patch' : 'minor';
  }
  if (patch > 0) return 'patch';
  if (minor > 0) return 'minor';
  return 'major';
}
