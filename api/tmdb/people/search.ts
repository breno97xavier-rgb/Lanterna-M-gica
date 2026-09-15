// ==============================================================================
// Vercel Serverless Function: GET /api/tmdb/people/search
// Arquivo: api/tmdb/people/search.ts
// ==============================================================================

import { handleTmdbApiRequest } from '../../_lib/router.js';

export default async function handler(req: any, res: any) {
  return handleTmdbApiRequest(req, res);
}
