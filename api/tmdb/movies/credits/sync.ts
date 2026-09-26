// ==============================================================================
// Vercel Serverless Function: POST /api/tmdb/movies/credits/sync
// Arquivo: api/tmdb/movies/credits/sync.ts
// ==============================================================================

import { handleTmdbApiRequest } from '../../../_lib/router.js';

export default async function handler(req: any, res: any) {
  return handleTmdbApiRequest(req, res);
}
