import { getMovieCredits } from '../api/_lib/tmdbClient.js';

async function checkLeTrouCredits() {
  const credits = await getMovieCredits(29259);
  console.log('=== CAST IN TMDB FOR LE TROU (29259) ===');
  credits.cast.forEach(c => {
    console.log(`- TMDB #${c.tmdbPersonId} "${c.name}" (order ${c.order}): character="${c.character}"`);
  });

  console.log('\n=== CREW IN TMDB FOR LE TROU (29259) ===');
  credits.crew.forEach(c => {
    console.log(`- TMDB #${c.tmdbPersonId} "${c.name}": dept="${c.department}", job="${c.job}"`);
  });
}

checkLeTrouCredits().catch(console.error);
