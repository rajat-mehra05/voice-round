import { expect, test, vi } from 'vitest';
import { triggerDownload } from './triggerDownload';

test('triggerDownload dispatches a click on a short-lived anchor with href / download / rel set, then removes it', () => {
  // Spy on the prototype so the real DOM insertion runs (so we can
  // assert the anchor was removed afterwards). `mock.contexts[0]`
  // gives us the element `click()` was invoked on.
  const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  triggerDownload('https://example.com/file.dmg', 'VoiceRoundAI_0.1.0_universal.dmg');

  expect(clickSpy).toHaveBeenCalledOnce();
  const link = clickSpy.mock.contexts[0] as HTMLAnchorElement;
  expect(link.href).toBe('https://example.com/file.dmg');
  expect(link.download).toBe('VoiceRoundAI_0.1.0_universal.dmg');
  expect(link.rel).toBe('noopener noreferrer');
  // Cleanup: the anchor is removed after the click so repeat calls
  // don't litter the DOM.
  expect(document.body.contains(link)).toBe(false);

  vi.restoreAllMocks();
});
