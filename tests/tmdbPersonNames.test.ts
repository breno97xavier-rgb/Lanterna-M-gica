import assert from 'node:assert/strict';
import { test } from 'node:test';
import { choosePersonDisplayName } from '../api/_lib/tmdbClient.js';
import { normalizePersonName } from '../api/_lib/personMatcher.js';

const examples: Array<[string, string[], string]> = [
  ['黒澤明', ['Akira Kurosawa'], 'Akira Kurosawa'],
  ['Андрей Тарковский', [], 'Андрей Тарковский'],
  ['张艺谋', ['Zhang Yimou', 'Yimou Zhang'], '张艺谋'],
  ['Liv Ullmann', ['リヴ・ウルマン'], 'Liv Ullmann'],
  ['봉준호', ['Bong Joon-ho'], 'Bong Joon-ho'],
  ['黒澤明', ['Akira Kurosawa', 'Akira Kurosawa'], 'Akira Kurosawa'],
  ['Сергей', ['Sérguei', 'Se\u0301rguei'], 'Sérguei'],
  ['山田太郎', ['カタカナ', '123', 'A山田'], '山田太郎'],
  ['  Chloé Zhao  ', ['赵婷'], 'Chloé Zhao'],
];

for (const [name, aliases, expected] of examples) {
  test(`TMDB international person name: ${name}`, () => {
    assert.equal(choosePersonDisplayName(name, aliases), expected);
  });
}

test('name matching distinguishes people across non-Latin scripts and retains Latin accent folding', () => {
  assert.equal(normalizePersonName(' João-Silva '), normalizePersonName('Joao Silva'));
  assert.equal(normalizePersonName('黒澤 明'), '黒澤明');
  assert.notEqual(normalizePersonName('黒澤明'), normalizePersonName('宮崎駿'));
  assert.notEqual(normalizePersonName('Иван'), normalizePersonName('Йван'));
  assert.notEqual(normalizePersonName('किरण'), normalizePersonName('करण'));
});
