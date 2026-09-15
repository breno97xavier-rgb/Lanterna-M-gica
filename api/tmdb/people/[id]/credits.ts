// ==============================================================================
// Vercel Serverless Function: GET /api/tmdb/people/:id/credits
// Arquivo: api/tmdb/people/[id]/credits.ts
// ==============================================================================

import { handleTmdbApiRequest } from '../../../_lib/router';

export default async function handler(req: any, res: any) {
  return handleTmdbApiRequest(req, res);
}
