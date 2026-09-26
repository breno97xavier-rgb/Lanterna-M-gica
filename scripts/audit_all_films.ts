import { createClient } from '@supabase/supabase-js';
import { reconcileFilmCreditsDryRun } from '../api/_lib/creditReconciler.js';

async function testAllFilms() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const supabase = createClient(url, key);

  const { data: films } = await supabase.from('filmes').select('id, title, year, tmdb_id').not('tmdb_id', 'is', null);

  console.log(`Auditing ${films?.length} films with TMDB ID...`);

  for (const f of films || []) {
    try {
      const mockReq = { headers: {} };
      const res = await reconcileFilmCreditsDryRun(f.id, mockReq);
      console.log(`Film: "${f.title}" (${f.year}) [TMDB #${f.tmdb_id}]:`);
      console.log(`  Local credits total: ${res.summary.totalLocalCredits}`);
      console.log(`  Exact TMDB person matches: ${res.summary.exactTmdbMatchesCount}`);
      console.log(`  Possible local person matches: ${res.summary.possibleLocalMatchesCount}`);
      console.log(`  Local only preserved: ${res.summary.localOnlyPreservedCount}`);
    } catch (e: any) {
      console.error(`  Error in film ${f.title}:`, e.message);
    }
  }
}

testAllFilms().catch(console.error);
