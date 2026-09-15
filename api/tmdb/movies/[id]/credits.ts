// ==============================================================================
// Vercel Serverless Function: GET /api/tmdb/movies/:id/credits
// Arquivo: api/tmdb/movies/[id]/credits.ts
// ==============================================================================

import { handleTmdbApiRequest } from '../../../_lib/router';

export default async function handler(req: any, res: any) {
  return handleTmdbApiRequest(req, res);
}
