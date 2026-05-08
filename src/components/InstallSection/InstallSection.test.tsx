import { http, HttpResponse } from 'msw';
import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/test/msw/server';
import { triggerDownload } from '@/lib/triggerDownload';
import { InstallSection } from './InstallSection';

// jsdom can't observe a real browser download; spy on our own wrapper.
vi.mock('@/lib/triggerDownload', () => ({
  triggerDownload: vi.fn(),
}));

const RELEASES_API = 'https://api.github.com/repos/rajat-mehra05/voice-round/releases/latest';
const MAC_ASSET = {
  name: 'VoiceRoundAI_0.2.0_universal.dmg',
  browser_download_url: 'https://example.com/VoiceRoundAI_0.2.0_universal.dmg',
};
const WIN_ASSET = {
  name: 'VoiceRoundAI_0.2.0_x64-setup.exe',
  browser_download_url: 'https://example.com/VoiceRoundAI_0.2.0_x64-setup.exe',
};
const MAC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
const WIN_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

test('macOS visitor can download the mac asset, then switch to Windows and download that instead', async () => {
  const user = userEvent.setup();
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(MAC_UA);
  const downloadSpy = vi.mocked(triggerDownload);
  downloadSpy.mockClear();
  server.use(
    http.get(RELEASES_API, () =>
      HttpResponse.json({
        tag_name: 'v0.2.0',
        html_url: 'https://github.com/example/repo/releases/tag/v0.2.0',
        assets: [MAC_ASSET, WIN_ASSET],
      }),
    ),
  );

  render(<InstallSection />);

  expect(screen.getByRole('heading', { name: /you're on macos/i })).toBeInTheDocument();
  expect(screen.getByText(/expect a one-time os warning/i)).toBeInTheDocument();
  expect(screen.getByText(/xattr -dr com\.apple\.quarantine/)).toBeInTheDocument();
  const primary = screen.getByRole('button', { name: /download for macos/i });

  await user.click(primary);
  expect(downloadSpy).toHaveBeenCalledWith(MAC_ASSET.browser_download_url, MAC_ASSET.name);

  await user.click(screen.getByRole('button', { name: /^windows$/i }));
  expect(screen.getByRole('heading', { name: /you're on windows/i })).toBeInTheDocument();
  expect(screen.getByText(/Windows protected your PC/i)).toBeInTheDocument();
  expect(screen.queryByText(/xattr -dr com\.apple\.quarantine/)).not.toBeInTheDocument();
  expect(downloadSpy).toHaveBeenCalledWith(WIN_ASSET.browser_download_url, WIN_ASSET.name);

  vi.restoreAllMocks();
});

test('falls back to opening the releases page when the latest release has no matching asset', async () => {
  const user = userEvent.setup();
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(WIN_UA);
  const downloadSpy = vi.mocked(triggerDownload);
  downloadSpy.mockClear();
  // Release only ships a mac binary; windows visitor must still land somewhere.
  server.use(
    http.get(RELEASES_API, () =>
      HttpResponse.json({
        tag_name: 'v0.2.0',
        html_url: 'https://github.com/example/repo/releases/tag/v0.2.0',
        assets: [MAC_ASSET],
      }),
    ),
  );
  const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

  render(<InstallSection />);

  await user.click(screen.getByRole('button', { name: /download for windows/i }));

  // First click: fetch fails, state flips to `error`. We do NOT call
  // window.open here because the click's user-activation has been
  // consumed by the awaited fetch; popup blockers would reject it.
  expect(openSpy).not.toHaveBeenCalled();
  expect(downloadSpy).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: /open releases page/i })).toBeInTheDocument();

  // Second click runs synchronously (no await before `window.open`) so
  // user activation is preserved and the popup opens. Swap the handler
  // to one that *would* succeed so a regression (re-fetching instead
  // of honouring the label) would trigger a real download.
  server.use(
    http.get(RELEASES_API, () =>
      HttpResponse.json({
        tag_name: 'v0.2.0',
        html_url: 'https://github.com/example/repo/releases/tag/v0.2.0',
        assets: [MAC_ASSET, WIN_ASSET],
      }),
    ),
  );
  await user.click(screen.getByRole('button', { name: /open releases page/i }));
  expect(downloadSpy).not.toHaveBeenCalled();
  expect(openSpy).toHaveBeenCalledTimes(1);
  expect(openSpy).toHaveBeenCalledWith(
    'https://github.com/rajat-mehra05/voice-round/releases/latest',
    '_blank',
    'noopener,noreferrer',
  );

  vi.restoreAllMocks();
});
