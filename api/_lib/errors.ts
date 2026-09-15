// ==============================================================================
// LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
// Utilitários de Resposta e Tratamento de Erros da API
// Arquivo: api/_lib/errors.ts
// ==============================================================================

import { ApiErrorCode, ApiErrorResponse } from './types';

export class AppError extends Error {
  public statusCode: number;
  public code: ApiErrorCode;

  constructor(statusCode: number, code: ApiErrorCode, message: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Cria payload JSON padronizado de erro
 */
export function createErrorPayload(code: ApiErrorCode, message: string): ApiErrorResponse {
  return {
    error: {
      code,
      message,
    },
  };
}

/**
 * Envia resposta de erro formatada para um response HTTP padrão Node/Vercel
 */
export function sendApiError(
  res: any,
  statusCode: number,
  code: ApiErrorCode,
  message: string
): void {
  const payload = createErrorPayload(code, message);
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(statusCode).json(payload);
  } else if (typeof res.writeHead === 'function' && typeof res.end === 'function') {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }
}
