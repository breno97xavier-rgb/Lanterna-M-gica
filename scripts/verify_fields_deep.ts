import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function checkEditorialFields() {
  const snapshot = JSON.parse(fs.readFileSync('acervo_pre_tmdb_link_snapshot.json', 'utf-8'));
  const { data: dbFilmes } = await supabase.from('filmes').select('*').order('id');
  const { data: dbPessoas } = await supabase.from('pessoas').select('*').order('id');

  console.log('Sample snapshot filme:', Object.keys(snapshot.filmes[0]));
  console.log('Sample db filme:', Object.keys(dbFilmes![0]));

  let movieFieldChanges = 0;
  for (const dbF of dbFilmes!) {
    const snapF = snapshot.filmes.find((f: any) => f.id === dbF.id);
    if (!snapF) { console.log('Filme não encontrado no snapshot:', dbF.title); movieFieldChanges++; continue; }
    
    const fields = ['title', 'original_title', 'slug', 'legacy_id', 'year', 'synopsis', 'poster_url', 'backdrop_url', 'legacy_director_name', 'editorial_rating', 'status'];
    for (const fld of fields) {
      const dbVal = dbF[fld] === undefined ? null : dbF[fld];
      const snapVal = snapF[fld] === undefined ? null : snapF[fld];
      if (dbVal !== snapVal) {
        console.log(`[ALTERAÇÃO FILME] ${dbF.title} (${fld}): Snap="${snapVal}" vs DB="${dbVal}"`);
        movieFieldChanges++;
      }
    }
  }

  let personFieldChanges = 0;
  for (const dbP of dbPessoas!) {
    const snapP = snapshot.pessoas.find((p: any) => p.id === dbP.id);
    if (!snapP) { console.log('Pessoa não encontrada no snapshot:', dbP.name); personFieldChanges++; continue; }
    
    const fields = ['name', 'slug', 'legacy_id', 'birth_date', 'death_date', 'bio', 'editorial_profile', 'primary_roles', 'status', 'photo_url', 'country'];
    for (const fld of fields) {
      const dbVal = JSON.stringify(dbP[fld] === undefined ? null : dbP[fld]);
      const snapVal = JSON.stringify(snapP[fld] === undefined ? null : snapP[fld]);
      if (dbVal !== snapVal) {
        console.log(`[ALTERAÇÃO PESSOA] ${dbP.name} (${fld}): Snap=${snapVal} vs DB=${dbVal}`);
        personFieldChanges++;
      }
    }
  }

  console.log('Total de campos editoriais alterados em filmes:', movieFieldChanges);
  console.log('Total de campos editoriais alterados em pessoas:', personFieldChanges);
}

checkEditorialFields().catch(console.error);
