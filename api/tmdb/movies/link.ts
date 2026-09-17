// ==============================================================================
// Vercel Serverless Function: POST /api/tmdb/movies/link
// Arquivo: api/tmdb/movies/link.ts
// ==============================================================================

import { handleTmdbApiRequest } from '../../_lib/router.js';

export default async function handler(req: any, res: any) {
  return handleTmdbApiRequest(req, res);
}
