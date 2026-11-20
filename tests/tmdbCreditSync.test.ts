import assert from 'node:assert/strict';
import { test } from 'node:test';
import { executeCreditsSync } from '../api/_lib/creditExecutionBuilder.js';
import type { CreditsSyncExecuteRequest } from '../api/_lib/types.js';

const updatedAt = '2026-10-01T12:00:00Z';
const film = { id: 'film', tmdb_id: 50, updated_at: updatedAt };
const cast = [
  { id: 11, credit_id: 'a', name: '黒澤明', character: 'A', order: 0 },
  { id: 12, credit_id: 'b', name: 'João Silva', character: 'B', order: 1 },
  { id: 13, credit_id: 'c', name: 'João Silva', character: 'C', order: 2 },
  { id: 14, credit_id: 'd', name: 'Лив', character: 'D', order: 3 },
  { id: 11, credit_id: 'duplicate', name: '黒澤明', character: 'A', order: 4 },
];
const selection: CreditsSyncExecuteRequest = {
  filmId: film.id,
  selectedCredits: ['cast:a', 'cast:b', 'cast:c', 'cast:d'],
  personDecisions: [],
  baseUpdatedAt: updatedAt,
  dryRun: true,
};
const req = { user: { id: 'admin' }, headers: { authorization: 'Bearer fixture' } };

test('credit preview and execution preserve identity, collisions and local credits', async (t) => {
  const env = {
    VITE_SUPABASE_URL: 'https://lanterna.test',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'fixture',
    TMDB_READ_ACCESS_TOKEN: 'fixture',
  };
  for (const [key, value] of Object.entries(env)) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
  }

  const localCredit = {
    id: 'local-credit', film_id: film.id, person_id: 'local-person',
    department: 'Elenco', role: 'Atriz', character_name: 'D', order_index: 3,
  };
  const detailsRequested: string[] = [];
  const writes: unknown[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, options?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : input);
    switch (url.pathname) {
      case '/3/movie/50/credits':
        return Response.json({ cast, crew: [] });
      case '/rest/v1/filmes':
        return Response.json(film);
      case '/rest/v1/pessoas':
        assert.equal(url.searchParams.get('order'), 'id.asc');
        switch (url.searchParams.get('id')) {
          case null:
            return Response.json([{ id: 'first-page', name: 'Outra pessoa', slug: 'outra-pessoa' }]);
          case 'gt.first-page':
            return Response.json([
              { id: 'legacy', name: 'Outro nome', slug: 'pessoa-tmdb-11' },
              { id: 'local-person', name: 'Nome editorial', slug: 'slug-editorial', tmdb_id: 14 },
            ]);
          case 'gt.local-person':
            return Response.json([]);
          default:
            assert.fail('Unexpected catalog cursor');
        }
      case '/rest/v1/film_credits':
        return Response.json([localCredit]);
      case '/rest/v1/rpc/sync_film_credits_from_tmdb':
        assert.equal(options?.method, 'POST');
        writes.push(JSON.parse(String(options?.body)));
        return Response.json({ persons_created: 3, credits_inserted: 3, credits_unchanged: 1 });
      case '/3/person/11':
      case '/3/person/12':
      case '/3/person/13':
        detailsRequested.push(url.pathname);
        return Response.json({ name: 'Grafia alternativa', biography: 'Biografia TMDB' });
      default:
        assert.fail(`Unexpected request: ${url.pathname}`);
    }
  });

  const preview = await executeCreditsSync(selection, req);
  assert.equal(preview.executionStatus, 'DRY_RUN');
  assert.deepEqual(writes, []);
  assert.deepEqual(detailsRequested, []);
  const identities = (response: typeof preview) => response.payload?.p_persons_to_create.map(
    ({ name, slug }) => [name, slug],
  );
  assert.deepEqual(identities(preview), [
    ['黒澤明', 'pessoa-tmdb-11-2'],
    ['João Silva', 'joao-silva-tmdb-12'],
    ['João Silva', 'joao-silva-tmdb-13'],
  ]);

  const execution = { ...selection, dryRun: false, confirmExecution: true };
  await assert.rejects(executeCreditsSync({ ...execution, confirmExecution: false }, req), { code: 'CONFIRMATION_REQUIRED' });
  await assert.rejects(executeCreditsSync({ ...execution, baseUpdatedAt: 'invalid' }, req), { code: 'INVALID_PARAMS' });
  await assert.rejects(executeCreditsSync({ ...execution, baseUpdatedAt: '2026-09-01T12:00:00Z' }, req), { code: 'STALE_RECONCILIATION' });
  await assert.rejects(executeCreditsSync({ ...execution, selectedCredits: ['cast:a', 'cast:duplicate'] }, req), { code: 'INVALID_PARAMS' });
  assert.deepEqual(detailsRequested, []);
  assert.deepEqual(writes, []);

  const result = await executeCreditsSync(execution, req);
  assert.equal(result.executionStatus, 'SUCCESS');
  assert.deepEqual(identities(result), identities(preview));
  assert.equal(detailsRequested.length, 3);
  assert.deepEqual(writes, [result.payload]);
  assert.deepEqual(result.payload?.p_persons_to_link, []);
  assert.deepEqual(result.payload?.p_credits_to_sync.find(credit => credit.tmdb_person_id === 14), {
    tmdb_person_id: 14, department: 'Elenco', role: 'Atriz', character_name: 'D', order_index: 3,
  });
});
