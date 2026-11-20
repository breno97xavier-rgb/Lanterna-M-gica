import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reserveTmdbPersonSlug } from '../api/_lib/personSlug.js';

test('non-Latin name gets a stable TMDB URL', () => {
  assert.equal(reserveTmdbPersonSlug('', 123, new Set()), 'pessoa-tmdb-123');
});

test('different TMDB IDs never share a slug', () => {
  const reserved = new Set<string>();
  assert.notEqual(reserveTmdbPersonSlug('akira-kurosawa', 1, reserved), reserveTmdbPersonSlug('akira-kurosawa', 2, reserved));
});

test('existing and in-batch collisions receive deterministic suffixes', () => {
  const reserved = new Set(['akira-kurosawa-tmdb-1']);
  assert.equal(reserveTmdbPersonSlug('akira-kurosawa', 1, reserved), 'akira-kurosawa-tmdb-1-2');
  assert.equal(reserveTmdbPersonSlug('akira-kurosawa', 1, reserved), 'akira-kurosawa-tmdb-1-3');
});

test('invalid TMDB ID is rejected', () => {
  for (const id of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => reserveTmdbPersonSlug('person', id, new Set()));
  }
});
