// ==============================================================================
// Vercel Serverless Function: POST /api/tmdb/movies/import
// Arquivo: api/tmdb/movies/import.ts
// ==============================================================================

import { handleTmdbApiRequest } from '../../_lib/router.js';

export default async function handler(req: any, res: any) {
  return handleTmdbApiRequest(req, res);
}
