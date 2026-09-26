import { createClient } from '@supabase/supabase-js';
import { reconcileFilmCreditsDryRun } from '../api/_lib/creditReconciler.js';

async function testLeTrou() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const supabase = createClient(url, key);

  const { data: film } = await supabase
    .from('filmes')
    .select('id, title, year, tmdb_id')
    .eq('tmdb_id', 29259)
    .single();

  if (!film) throw new Error('Film not found');

  console.log(`Testing film "${film.title}" (${film.year}) [${film.id}]...`);

  const mockReq = { headers: {} };
  const res = await reconcileFilmCreditsDryRun(film.id, mockReq);

  console.log('\n--- SUMMARY ---');
  console.log(JSON.stringify(res.summary, null, 2));

  console.log('\n--- CREDITS RECONCILED ---');
  res.credits.forEach((c) => {
    console.log(`[${c.localCreditComparisonStatus}] ${c.personName} -> Dept: ${c.department}, Role: ${c.role}, Char: ${c.characterName} (Local Credit ID: ${c.localCreditId})`);
    if (c.semanticEquivalenceReason) {
      console.log(`    ↳ Reason: ${c.semanticEquivalenceReason}`);
      console.log(`    ↳ Local canonical: dept="${c.localDepartment}", role="${c.localRole}", char="${c.localCharacterName}", order=${c.localOrderIndex}`);
    }
  });

  console.log('\n--- LOCAL ONLY CREDITS (Unmatched) ---');
  console.log(`Count: ${res.localOnlyCredits.length}`);
  res.localOnlyCredits.forEach((lc) => {
    console.log(`  [UNMATCHED] ${lc.personName} - ${lc.department} / ${lc.role} (${lc.characterName})`);
  });
}

testLeTrou().catch(console.error);
