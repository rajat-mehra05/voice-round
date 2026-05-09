// `releases/latest` excludes drafts and prereleases. Unauthenticated
// rate limit is 60/hr/IP — nowhere near our usage, no token needed.
const RELEASES_URL = 'https://api.github.com/repos/rajat-mehra05/voice-round/releases/latest';
const FETCH_TIMEOUT_MS = 8_000;

export interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
}

export interface GitHubRelease {
  tag_name: string;
  html_url: string;
  // `fetchLatestRelease` normalises to `[]` when the upstream payload omits it,
  // so asset consumers can skip the null check.
  assets: GitHubReleaseAsset[];
  // Markdown release notes. Optional because some releases ship without a
  // body (older versions, drafts promoted to releases, etc).
  body?: string;
}

// Throws on any failure so callers can distinguish "here's the latest"
// from "can't check". Callers needing silence should catch.
export async function fetchLatestRelease(): Promise<GitHubRelease> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(RELEASES_URL, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`GitHub releases returned HTTP ${response.status}`);
    }
    const body = (await response.json()) as Partial<GitHubRelease>;
    if (typeof body.tag_name !== 'string' || typeof body.html_url !== 'string') {
      throw new Error('GitHub releases response missing tag_name or html_url');
    }
    const assets: GitHubReleaseAsset[] = Array.isArray(body.assets)
      ? body.assets
          .filter(
            (a): a is GitHubReleaseAsset =>
              !!a && typeof a.name === 'string' && typeof a.browser_download_url === 'string',
          )
          .map((a) => ({ name: a.name, browser_download_url: a.browser_download_url }))
      : [];
    return {
      tag_name: body.tag_name,
      html_url: body.html_url,
      assets,
      body: typeof body.body === 'string' ? body.body : undefined,
    };
  } finally {
    clearTimeout(timer);
  }
}

// Prefer `universal` .dmg (tauri-action's `--target universal-apple-darwin`
// output) and a `-setup.exe` NSIS installer on Windows. If the Windows
// release ever ships a non-installer .exe (e.g. a standalone updater
// binary), return null instead of handing the user the wrong file — the
// UI falls back to "Open releases page".
export function pickAssetForPlatform(
  assets: GitHubReleaseAsset[],
  platform: 'mac' | 'windows',
): GitHubReleaseAsset | null {
  if (platform === 'mac') {
    const dmgs = assets.filter((a) => a.name.toLowerCase().endsWith('.dmg'));
    return dmgs.find((a) => /universal/i.test(a.name)) ?? dmgs[0] ?? null;
  }
  const installer = assets.find(
    (a) => a.name.toLowerCase().endsWith('.exe') && /setup/i.test(a.name),
  );
  return installer ?? null;
}
