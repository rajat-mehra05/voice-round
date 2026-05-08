import { http, HttpResponse } from 'msw';
import { expect, test } from 'vitest';
import { server } from '@/test/msw/server';
import { fetchLatestRelease, pickAssetForPlatform } from './githubLatestRelease';

const RELEASES_URL = 'https://api.github.com/repos/rajat-mehra05/voice-round/releases/latest';

test('fetchLatestRelease returns tag_name + html_url + assets on a 200 response', async () => {
  server.use(
    http.get(RELEASES_URL, () =>
      HttpResponse.json({
        tag_name: 'v0.2.0',
        html_url: 'https://github.com/example/repo/releases/tag/v0.2.0',
        // Extra envelope fields must not trip the field-existence guard.
        draft: false,
        prerelease: false,
        body: 'release notes',
        assets: [
          {
            name: 'VoiceRoundAI_0.2.0_universal.dmg',
            browser_download_url: 'https://example.com/VoiceRoundAI_0.2.0_universal.dmg',
            // Extra asset fields (size, id, ...) must be stripped on the way out.
            size: 12345,
          },
          {
            name: 'VoiceRoundAI_0.2.0_x64-setup.exe',
            browser_download_url: 'https://example.com/VoiceRoundAI_0.2.0_x64-setup.exe',
          },
        ],
      }),
    ),
  );
  await expect(fetchLatestRelease()).resolves.toEqual({
    tag_name: 'v0.2.0',
    html_url: 'https://github.com/example/repo/releases/tag/v0.2.0',
    assets: [
      {
        name: 'VoiceRoundAI_0.2.0_universal.dmg',
        browser_download_url: 'https://example.com/VoiceRoundAI_0.2.0_universal.dmg',
      },
      {
        name: 'VoiceRoundAI_0.2.0_x64-setup.exe',
        browser_download_url: 'https://example.com/VoiceRoundAI_0.2.0_x64-setup.exe',
      },
    ],
  });
});

test('fetchLatestRelease normalises a missing assets array to an empty list instead of throwing', async () => {
  // Drafts can arrive with no `assets`; normalising to `[]` lets the picker return null.
  server.use(
    http.get(RELEASES_URL, () =>
      HttpResponse.json({
        tag_name: 'v0.2.0',
        html_url: 'https://github.com/example/repo/releases/tag/v0.2.0',
      }),
    ),
  );
  await expect(fetchLatestRelease()).resolves.toMatchObject({ assets: [] });
});

test('pickAssetForPlatform picks the universal .dmg for macOS when multiple dmgs exist', () => {
  const assets = [
    { name: 'VoiceRoundAI_0.2.0_aarch64.dmg', browser_download_url: 'https://x/a.dmg' },
    { name: 'VoiceRoundAI_0.2.0_universal.dmg', browser_download_url: 'https://x/u.dmg' },
  ];
  expect(pickAssetForPlatform(assets, 'mac')?.name).toBe('VoiceRoundAI_0.2.0_universal.dmg');
});

test('pickAssetForPlatform falls back to the first .dmg when no universal build is present', () => {
  const assets = [
    { name: 'VoiceRoundAI_0.2.0_aarch64.dmg', browser_download_url: 'https://x/a.dmg' },
  ];
  expect(pickAssetForPlatform(assets, 'mac')?.name).toBe('VoiceRoundAI_0.2.0_aarch64.dmg');
});

test('pickAssetForPlatform prefers the NSIS setup.exe over other .exe binaries', () => {
  const assets = [
    { name: 'VoiceRoundAI_0.2.0_x64.nsis.zip', browser_download_url: 'https://x/z.zip' },
    { name: 'VoiceRoundAI_0.2.0_x64-setup.exe', browser_download_url: 'https://x/setup.exe' },
    // An updater .exe must NOT win over the NSIS installer.
    { name: 'VoiceRoundAI-updater.exe', browser_download_url: 'https://x/upd.exe' },
  ];
  expect(pickAssetForPlatform(assets, 'windows')?.name).toBe('VoiceRoundAI_0.2.0_x64-setup.exe');
});

test('pickAssetForPlatform returns null when no matching extension exists', () => {
  const assets = [
    { name: 'VoiceRoundAI_0.2.0_aarch64.dmg', browser_download_url: 'https://x/a.dmg' },
  ];
  expect(pickAssetForPlatform(assets, 'windows')).toBeNull();
  expect(pickAssetForPlatform([], 'mac')).toBeNull();
});

test('pickAssetForPlatform returns null on Windows when only non-setup .exe binaries exist', () => {
  // A loose fallback would hand the user a non-installer binary (e.g. a
  // standalone updater). Better to return null and let the UI surface
  // "Open releases page" so the user picks the right file themselves.
  const assets = [{ name: 'VoiceRoundAI-updater.exe', browser_download_url: 'https://x/upd.exe' }];
  expect(pickAssetForPlatform(assets, 'windows')).toBeNull();
});

test('fetchLatestRelease throws on a 403 so callers can distinguish "up to date" from "can\'t check"', async () => {
  // Swallowing to null would collapse "rate-limited" with "up to date".
  server.use(
    http.get(RELEASES_URL, () =>
      HttpResponse.json({ message: 'rate limit exceeded' }, { status: 403 }),
    ),
  );
  await expect(fetchLatestRelease()).rejects.toThrow(/HTTP 403/);
});

test('fetchLatestRelease rejects on a network error instead of resolving', async () => {
  server.use(http.get(RELEASES_URL, () => HttpResponse.error()));
  await expect(fetchLatestRelease()).rejects.toBeInstanceOf(Error);
});

test('fetchLatestRelease throws when the response body is missing tag_name or html_url', async () => {
  server.use(
    http.get(RELEASES_URL, () => HttpResponse.json({ tag_name: 'v0.2.0' /* no html_url */ })),
  );
  await expect(fetchLatestRelease()).rejects.toThrow(/missing tag_name or html_url/);
});

test('fetchLatestRelease rejects on invalid JSON', async () => {
  server.use(
    http.get(RELEASES_URL, () =>
      HttpResponse.text('not json at all', { headers: { 'Content-Type': 'application/json' } }),
    ),
  );
  await expect(fetchLatestRelease()).rejects.toBeInstanceOf(Error);
});
