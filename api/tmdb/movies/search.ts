// ==============================================================================
// Vercel Serverless Function: GET /api/tmdb/movies/search
// Arquivo: api/tmdb/movies/search.ts
// ==============================================================================

import { handleTmdbApiRequest } from '../../_lib/router.js';

export default async function handler(req: any, res: any) {
  return handleTmdbApiRequest(req, res);
}
