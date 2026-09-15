// ==============================================================================
// LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
// Middleware de Autenticação e Autorização Admin-Only
// Arquivo: api/_lib/authMiddleware.ts
// ==============================================================================

import { createClient, User } from '@supabase/supabase-js';
import { sendApiError } from './errors';

export interface AuthValidationResult {
  authorized: boolean;
  user?: User;
  statusCode?: number;
  errorCode?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INTERNAL_ERROR';
  errorMessage?: string;
}

/**
 * Obtém as credenciais do Supabase das variáveis de ambiente server-side
 */
function getServerSupabaseConfig() {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const anonKey = (
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();

  return { url, anonKey };
}

/**
 * Valida se a requisição possui um token JWT válido do Supabase e se o usuário é Administrador
 */
export async function validateAdminAuth(req: any): Promise<AuthValidationResult> {
  const authHeader =
    (req.headers && (req.headers['authorization'] || req.headers['Authorization'])) || '';

  if (!authHeader || typeof authHeader !== 'string') {
    return {
      authorized: false,
      statusCode: 401,
      errorCode: 'UNAUTHORIZED',
      errorMessage: 'Cabeçalho de autorização não fornecido.',
    };
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return {
      authorized: false,
      statusCode: 401,
      errorCode: 'UNAUTHORIZED',
      errorMessage: 'Formato de autorização inválido. Esperado "Bearer <token>".',
    };
  }

  const token = parts[1];
  if (!token) {
    return {
      authorized: false,
      statusCode: 401,
      errorCode: 'UNAUTHORIZED',
      errorMessage: 'Token de acesso vazio.',
    };
  }

  const { url, anonKey } = getServerSupabaseConfig();
  if (!url || !anonKey) {
    console.error('[AuthMiddleware] Variáveis de ambiente do Supabase não encontradas no servidor.');
    return {
      authorized: false,
      statusCode: 500,
      errorCode: 'INTERNAL_ERROR',
      errorMessage: 'Configuração do servidor de autenticação incompleta.',
    };
  }

  try {
    const supabase = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // 1. Validar token e recuperar dados do usuário
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return {
        authorized: false,
        statusCode: 401,
        errorCode: 'UNAUTHORIZED',
        errorMessage: 'Sessão inválida ou expirada. Faça login novamente.',
      };
    }

    // 2. Validar privilégio de administrador através da função RPC is_admin()
    const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin');
    if (rpcError || isAdmin !== true) {
      return {
        authorized: false,
        statusCode: 403,
        errorCode: 'FORBIDDEN',
        errorMessage: 'Acesso negado. Apenas administradores podem utilizar os recursos do TMDB.',
      };
    }

    return {
      authorized: true,
      user: userData.user,
    };
  } catch (err: any) {
    console.error('[AuthMiddleware] Erro inesperado ao validar autenticação:', err?.message || err);
    return {
      authorized: false,
      statusCode: 500,
      errorCode: 'INTERNAL_ERROR',
      errorMessage: 'Falha interna ao validar autorização.',
    };
  }
}

/**
 * Middleware auxiliar para encerrar a requisição com erro caso a autenticação falhe
 */
export async function requireAdmin(req: any, res: any): Promise<boolean> {
  const auth = await validateAdminAuth(req);
  if (!auth.authorized) {
    sendApiError(
      res,
      auth.statusCode || 401,
      auth.errorCode || 'UNAUTHORIZED',
      auth.errorMessage || 'Não autorizado.'
    );
    return false;
  }
  return true;
}
