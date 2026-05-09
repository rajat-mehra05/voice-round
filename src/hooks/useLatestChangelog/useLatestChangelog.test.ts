import { expect, test } from 'vitest';
import { parseBullets } from './useLatestChangelog';

test('parseBullets strips list markers and conventional-commit prefixes, capitalising the first letter', () => {
  const body = [
    '* feat: add new feature',
    '- fix: handle edge case',
    '+ chore: bump deps',
    '* perf: enhance pipeline',
  ].join('\n');
  expect(parseBullets(body)).toEqual([
    'Add new feature',
    'Handle edge case',
    'Bump deps',
    'Enhance pipeline',
  ]);
});

test('parseBullets handles scope and breaking-change markers in the prefix', () => {
  const body = [
    '* feat(api): add endpoint',
    '* fix(scope)!: breaking fix',
    '* chore!: breaking chore',
  ].join('\n');
  expect(parseBullets(body)).toEqual(['Add endpoint', 'Breaking fix', 'Breaking chore']);
});

test('parseBullets strips GitHub-auto-generated `by @user` attribution in three documented forms', () => {
  const body = [
    '* feat: add thing by @rajat-mehra05',
    '* fix: another by @rajat-mehra05 in #42',
    '* perf: third by @rajat-mehra05 in https://github.com/foo/bar/pull/3',
  ].join('\n');
  expect(parseBullets(body)).toEqual(['Add thing', 'Another', 'Third']);
});

test('parseBullets preserves intentional casing on bullets without a recognised prefix', () => {
  // No prefix → bullet was authored with deliberate casing → don't touch it.
  const body = [
    '* iOS audio context resume timing fix',
    '* npm scripts cleanup',
    '* Some non-prefixed bullet',
  ].join('\n');
  expect(parseBullets(body)).toEqual([
    'iOS audio context resume timing fix',
    'npm scripts cleanup',
    'Some non-prefixed bullet',
  ]);
});

test('parseBullets does not capitalise brand acronyms even when stripped from a recognised prefix', () => {
  // After `fix: ` strips, second char `O` is uppercase → leave first char alone
  // so `iOS` does not become `IOS`. Same protection for `npm`-style lowercase
  // brand names is handled by the same heuristic only when authored without
  // a prefix; intentionally narrow scope.
  const body = ['* fix: iOS audio context resume timing'].join('\n');
  expect(parseBullets(body)).toEqual(['iOS audio context resume timing']);
});

test('parseBullets returns an empty array when no bullet lines exist', () => {
  expect(parseBullets('')).toEqual([]);
  expect(parseBullets('Just some prose, no bullets here.')).toEqual([]);
  expect(parseBullets("## What's Changed\n\nNothing this release.")).toEqual([]);
});

test('parseBullets filters bullets that become empty after all stripping', () => {
  const body = ['* feat: ', '* by @rajat-mehra05', '* '].join('\n');
  expect(parseBullets(body)).toEqual([]);
});
