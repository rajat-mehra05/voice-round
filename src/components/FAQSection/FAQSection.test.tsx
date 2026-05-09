import { expect, test } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { FAQ_ITEMS } from '@/constants/copy';
import { FAQSection } from './FAQSection';

test('all questions render under a single FAQ heading', () => {
  renderWithProviders(<FAQSection />);

  expect(screen.getByRole('heading', { name: /frequently asked questions/i })).toBeInTheDocument();
  for (const item of FAQ_ITEMS) {
    expect(screen.getByRole('button', { name: item.question })).toBeInTheDocument();
  }
});

test('opening one item collapses any previously open item (single-expand mode)', async () => {
  const user = userEvent.setup();
  renderWithProviders(<FAQSection />);

  const firstQuestion = FAQ_ITEMS[0].question;
  const secondQuestion = FAQ_ITEMS[1].question;
  const firstTrigger = screen.getByRole('button', { name: firstQuestion });
  const secondTrigger = screen.getByRole('button', { name: secondQuestion });

  // Both closed at first.
  expect(firstTrigger).toHaveAttribute('aria-expanded', 'false');
  expect(secondTrigger).toHaveAttribute('aria-expanded', 'false');

  await user.click(firstTrigger);
  expect(firstTrigger).toHaveAttribute('aria-expanded', 'true');
  expect(secondTrigger).toHaveAttribute('aria-expanded', 'false');

  await user.click(secondTrigger);
  // Single-expand: opening the second one closes the first.
  expect(firstTrigger).toHaveAttribute('aria-expanded', 'false');
  expect(secondTrigger).toHaveAttribute('aria-expanded', 'true');

  // Clicking an open item collapses it.
  await user.click(secondTrigger);
  expect(secondTrigger).toHaveAttribute('aria-expanded', 'false');
});

test('open panel surfaces its answer text', async () => {
  const user = userEvent.setup();
  renderWithProviders(<FAQSection />);

  // base-ui keeps closed panels mounted, so assert toBeVisible to prove expansion.
  const answerStart = FAQ_ITEMS[0].answer.slice(0, 40);
  const answerMatcher = new RegExp(answerStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  await user.click(screen.getByRole('button', { name: FAQ_ITEMS[0].question }));
  expect(screen.getByText(answerMatcher)).toBeVisible();
});
