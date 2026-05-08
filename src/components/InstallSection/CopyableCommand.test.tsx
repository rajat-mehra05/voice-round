import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyableCommand } from './CopyableCommand';

test('clicking the copy button writes the command to the clipboard and briefly shows a copied state', async () => {
  const user = userEvent.setup();
  // jsdom's `navigator.clipboard` is a read-only getter; stub via defineProperty.
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
  vi.useFakeTimers({ shouldAdvanceTime: true });

  render(
    <CopyableCommand command="xattr -d com.apple.quarantine /Applications/VoiceRoundAI.app" />,
  );

  expect(
    screen.getByText('xattr -d com.apple.quarantine /Applications/VoiceRoundAI.app'),
  ).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /copy command to clipboard/i }));
  expect(writeText).toHaveBeenCalledWith(
    'xattr -d com.apple.quarantine /Applications/VoiceRoundAI.app',
  );
  expect(screen.getByRole('button', { name: /copied to clipboard/i })).toBeInTheDocument();

  vi.advanceTimersByTime(2_000);
  expect(
    await screen.findByRole('button', { name: /copy command to clipboard/i }),
  ).toBeInTheDocument();

  vi.useRealTimers();
  vi.restoreAllMocks();
});
