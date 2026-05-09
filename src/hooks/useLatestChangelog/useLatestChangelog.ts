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
  Strips the `* `, `- `, `+ ` markers from markdown bullets, plus the
  GitHub-auto-generated `by @user ...` attribution. The attribution can
  appear as `by @user`, `by @user in #42`, or `by @user in https://...`,
  so we greedily strip from `by @<handle>` through end of line.
*/
function parseBullets(body: string): string[] {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[*\-+]\s+/.test(line))
    .map((line) =>
      line
        .replace(/^[*\-+]\s+/, '')
        .replace(/\s+by\s+@[\w-]+.*$/i, '')
        .trim(),
    )
    .filter((line) => line.length > 0);
}

/*
  Maps a semver tag to a user-facing category badge. In pre-1.0 (v0.x)
  land the public surface is not stable, so any `0.X.0` bump (Y change
  with no patch) is shown as Major. Once we hit v1.0.0+ the standard
  semver position rules apply: X bump = Major, Y bump = Minor, Z = Patch.
*/
function categorizeRelease(tag: string): ReleaseCategory {
  const match = tag.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) return 'patch';
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (major === 0) {
    return patch > 0 ? 'patch' : 'major';
  }
  if (patch > 0) return 'patch';
  if (minor > 0) return 'minor';
  return 'major';
}
