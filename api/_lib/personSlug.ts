/** Deterministic collision handling for newly created TMDB people. */
export function reserveTmdbPersonSlug(
  normalizedName: string,
  tmdbPersonId: number,
  reserved: Set<string>,
): string {
  if (!Number.isSafeInteger(tmdbPersonId) || tmdbPersonId <= 0) {
    throw new Error('Invalid TMDB person identifier');
  }
  const base = `${normalizedName || 'pessoa'}-tmdb-${tmdbPersonId}`;
  let slug = base;
  let suffix = 2;
  while (reserved.has(slug)) slug = `${base}-${suffix++}`;
  reserved.add(slug);
  return slug;
}
