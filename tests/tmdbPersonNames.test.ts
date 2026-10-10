import assert from 'node:assert/strict';
import { test } from 'node:test';
import { choosePersonDisplayName } from '../api/_lib/tmdbClient.js';

const examples: Array<[string, string[], string]> = [
  ['黒澤明', ['Akira Kurosawa'], 'Akira Kurosawa'],
  ['Андрей Тарковский', [], 'Андрей Тарковский'],
  ['张艺谋', ['Zhang Yimou', 'Yimou Zhang'], '张艺谋'],
  ['Liv Ullmann', ['リヴ・ウルマン'], 'Liv Ullmann'],
  ['봉준호', ['Bong Joon-ho'], 'Bong Joon-ho'],
  ['黒澤明', ['Akira Kurosawa', 'Akira Kurosawa'], 'Akira Kurosawa'],
];

for (const [name, aliases, expected] of examples) {
  test(`TMDB international person name: ${name}`, () => {
    assert.equal(choosePersonDisplayName(name, aliases), expected);
  });
}
