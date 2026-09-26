import { createClient } from '@supabase/supabase-js';

async function auditCredits() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const supabase = createClient(url, key);

  const { data: credits, error } = await supabase
    .from('film_credits')
    .select('id, film_id, person_id, fallback_person_name, department, role, character_name, order_index')
    .order('film_id')
    .order('order_index');

  if (error) {
    console.error('Error fetching credits:', error);
    return;
  }

  console.log(`Total credits in DB: ${credits.length}`);

  const { data: people } = await supabase.from('pessoas').select('id, name, tmdb_id');
  const personMap = new Map((people || []).map(p => [p.id, p]));

  const { data: films } = await supabase.from('filmes').select('id, title, year, tmdb_id');
  const filmMap = new Map((films || []).map(f => [f.id, f]));

  console.log('\n--- DEPARTMENTS AND ROLES DISTRIBUTION ---');
  const deptRoles = new Map<string, number>();
  credits.forEach(c => {
    const key = `${c.department} | ${c.role || '(null)'} | char: ${c.character_name ? 'YES' : 'NO'}`;
    deptRoles.set(key, (deptRoles.get(key) || 0) + 1);
  });
  deptRoles.forEach((cnt, k) => {
    console.log(`  ${k} => ${cnt}`);
  });

  console.log('\n--- CREDITS OF "LE TROU" (A Um Passo da Liberdade) ---');
  const leTrouFilm = (films || []).find(f => f.tmdb_id === 29259);
  if (leTrouFilm) {
    const leTrouCredits = credits.filter(c => c.film_id === leTrouFilm.id);
    leTrouCredits.forEach(c => {
      const p = c.person_id ? personMap.get(c.person_id) : null;
      console.log(`  ID: ${c.id}`);
      console.log(`  Person: ${p ? p.name : c.fallback_person_name} (UUID: ${c.person_id}, TMDB: ${p?.tmdb_id})`);
      console.log(`  Dept: "${c.department}", Role: "${c.role}", Char: "${c.character_name}", Order: ${c.order_index}`);
      console.log('  ---');
    });
  }

  console.log('\n--- ALL CAST CREDITS IN DB (ROLES AND CHARACTERS) ---');
  const castCredits = credits.filter(c => c.department.toLowerCase().includes('elenco') || c.department.toLowerCase().includes('acting'));
  castCredits.forEach(c => {
    const p = c.person_id ? personMap.get(c.person_id) : null;
    const f = filmMap.get(c.film_id);
    console.log(`  Film: ${f?.title} | Person: ${p?.name} | Role: "${c.role}" | Char: "${c.character_name}"`);
  });
}

auditCredits().catch(console.error);
