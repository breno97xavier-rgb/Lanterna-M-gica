// ==============================================================================
// Vercel Serverless Function: POST /api/tmdb/movies/credits/reconcile
// Arquivo: api/tmdb/movies/credits/reconcile.ts
// ==============================================================================

import { handleTmdbApiRequest } from '../../../_lib/router.js';

export default async function handler(req: any, res: any) {
  return handleTmdbApiRequest(req, res);
}
