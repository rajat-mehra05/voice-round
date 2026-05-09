import { expect, test } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { platform } from '@/platform';
import { makeSession } from '@/test/factories';
import { Layout } from './Layout';

async function seedOneSession(): Promise<void> {
  await platform.storage.sessions.deleteAll();
  await platform.storage.sessions.create(makeSession());
}

async function clearSessions(): Promise<void> {
  await platform.storage.sessions.deleteAll();
}

test('mobile hamburger opens dropdown with History and Settings, then closes on navigation', async () => {
  await seedOneSession();
  const user = userEvent.setup();

  renderWithProviders(
    <Layout>
      <p>Page content</p>
    </Layout>,
  );

  expect(screen.getByText('Page content')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();

  // Mobile menu only renders once a saved session exists. Wait for the
  // useHasSessions effect to resolve before asserting it appears.
  const menuButton = await screen.findByRole('button', { name: /open menu/i });
  expect(menuButton).toBeInTheDocument();

  await user.click(menuButton);

  const closeButton = screen.getByRole('button', { name: /close menu/i });
  expect(closeButton).toHaveAttribute('aria-expanded', 'true');

  const menu = screen.getByRole('menu');
  expect(menu).toBeInTheDocument();

  const menuItems = screen.getAllByRole('menuitem');
  const historyItem = menuItems.find((el) => el.textContent === 'History')!;
  expect(historyItem).toHaveAttribute('href', '/history');

  const settingsItem = menuItems.find((el) => el.textContent === 'Settings')!;
  expect(settingsItem).toBeInTheDocument();

  await user.click(historyItem);
  expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument();
});

test('mobile Settings button opens SettingsModal', async () => {
  await seedOneSession();
  const user = userEvent.setup();

  renderWithProviders(
    <Layout>
      <p>Page content</p>
    </Layout>,
  );

  await user.click(await screen.findByRole('button', { name: /open menu/i }));

  const menuItems = screen.getAllByRole('menuitem');
  const settingsItem = menuItems.find((el) => el.textContent === 'Settings')!;
  await user.click(settingsItem);

  expect(await screen.findByRole('dialog', { name: /settings/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/openai api key/i)).toBeInTheDocument();
});

test('mobile menu supports ArrowDown, ArrowUp, and Escape keyboard navigation', async () => {
  await seedOneSession();
  const user = userEvent.setup();

  renderWithProviders(
    <Layout>
      <p>Page content</p>
    </Layout>,
  );

  await user.click(await screen.findByRole('button', { name: /open menu/i }));

  const menuItems = screen.getAllByRole('menuitem');
  const [historyItem, settingsItem] = menuItems;

  expect(historyItem).toHaveFocus();

  await user.keyboard('{ArrowDown}');
  expect(settingsItem).toHaveFocus();

  await user.keyboard('{ArrowDown}');
  expect(historyItem).toHaveFocus();

  await user.keyboard('{ArrowUp}');
  expect(settingsItem).toHaveFocus();

  await user.keyboard('{ArrowUp}');
  expect(historyItem).toHaveFocus();

  await user.keyboard('{Escape}');
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /open menu/i })).toHaveFocus();
});

test('desktop Settings button opens SettingsModal', async () => {
  await seedOneSession();
  const user = userEvent.setup();

  renderWithProviders(
    <Layout>
      <p>Page content</p>
    </Layout>,
  );

  const desktopSettingsButton = await screen.findByRole('button', { name: /settings/i });
  await user.click(desktopSettingsButton);

  expect(await screen.findByRole('dialog', { name: /settings/i })).toBeInTheDocument();
});

test('Cmd+, keyboard shortcut opens SettingsModal and is guarded against editable-field focus', async () => {
  await clearSessions();
  const user = userEvent.setup();

  renderWithProviders(
    <Layout>
      <input aria-label="Name" />
    </Layout>,
  );

  expect(screen.queryByRole('dialog', { name: /settings/i })).not.toBeInTheDocument();

  const input = screen.getByRole('textbox', { name: /name/i });
  await user.click(input);
  await user.keyboard('{Meta>},{/Meta}');
  expect(screen.queryByRole('dialog', { name: /settings/i })).not.toBeInTheDocument();

  input.blur();
  await user.keyboard('{Meta>},{/Meta}');
  expect(await screen.findByRole('dialog', { name: /settings/i })).toBeInTheDocument();
});

test('skip-to-content link and landmarks are accessible', async () => {
  await clearSessions();

  renderWithProviders(
    <Layout>
      <p>Content</p>
    </Layout>,
  );

  expect(screen.getByText(/skip to content/i)).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
  expect(screen.getByRole('main')).toBeInTheDocument();
});

test('first-time visitor on home sees logo and Star on GitHub but no History or Settings', async () => {
  await clearSessions();

  renderWithProviders(
    <Layout>
      <p>Page content</p>
    </Layout>,
    { initialRoute: '/' },
  );

  // Star on GitHub link is present on the home route.
  const starLink = await screen.findByRole('link', { name: /star on github/i });
  expect(starLink).toHaveAttribute('href', 'https://github.com/rajat-mehra05/voice-round');
  expect(starLink).toHaveAttribute('target', '_blank');

  // History/Settings stay hidden until the first session is saved.
  expect(screen.queryByRole('button', { name: /^settings$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /^history$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /open menu/i })).not.toBeInTheDocument();
});

test('Star on GitHub is hidden on non-home routes', async () => {
  await seedOneSession();

  renderWithProviders(
    <Layout>
      <p>Page content</p>
    </Layout>,
    { initialRoute: '/history' },
  );

  // Wait for the actions to render (proves useHasSessions has resolved) before
  // asserting Star is absent — otherwise we could be reading the loading state.
  await screen.findByRole('button', { name: /^settings$/i });
  expect(screen.queryByRole('link', { name: /star on github/i })).not.toBeInTheDocument();
});

test('History and Settings are hidden during an active interview at /session', async () => {
  await seedOneSession();

  renderWithProviders(
    <Layout>
      <p>Recording…</p>
    </Layout>,
    { initialRoute: '/session' },
  );

  // Session route never shows History/Settings/Star, even with saved sessions.
  // Wait a tick so useHasSessions effect runs; if buttons were going to appear
  // they would by the time the page content is in the DOM.
  expect(await screen.findByText('Recording…')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^settings$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /^history$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /star on github/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /open menu/i })).not.toBeInTheDocument();
});
