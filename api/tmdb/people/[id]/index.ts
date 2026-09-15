// ==============================================================================
// Vercel Serverless Function: GET /api/tmdb/people/:id
// Arquivo: api/tmdb/people/[id]/index.ts
// ==============================================================================

import { handleTmdbApiRequest } from '../../../_lib/router.js';

export default async function handler(req: any, res: any) {
  return handleTmdbApiRequest(req, res);
}
