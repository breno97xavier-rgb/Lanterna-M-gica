import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Resolve credentials from either standard Vite (import.meta.env) or Next.js (process.env / NEXT_PUBLIC_)
export function getSupabaseCredentials(): { url: string; anonKey: string } {
  // 1. Vite environment variables
  const viteUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const viteAnonKey =
    (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
    (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
    '';

  // 2. Next.js compatible environment variables
  let nextUrl = '';
  let nextAnonKey = '';
  try {
    if (typeof process !== 'undefined' && process.env) {
      nextUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      nextAnonKey =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        (process.env as any).NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        '';
    }
  } catch (_) {
    // Ignore in pure client without process
  }

  // 3. Fallback to localStorage configured credentials (if configured directly in admin UI test sandbox)
  let localUrl = '';
  let localAnonKey = '';
  try {
    localUrl = localStorage.getItem('lanterna_magica_supabase_custom_url') || '';
    localAnonKey = localStorage.getItem('lanterna_magica_supabase_custom_key') || '';
  } catch (_) {}

  const url = (viteUrl || nextUrl || localUrl).trim();
  const anonKey = (viteAnonKey || nextAnonKey || localAnonKey).trim();

  return { url, anonKey };
}

let supabaseInstance: SupabaseClient | null = null;

/**
 * Returns the Supabase client singleton if configured, or null if credentials are not yet entered.
 * Never throws at load time.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();

  if (!url || !anonKey) {
    return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return supabaseInstance;
}

/**
 * Diagnostic helper to test connection without creating tables, modifying data, or requiring auth.
 * Uses official @supabase/supabase-js client and verifies endpoint reachability.
 */
export async function testSupabaseConnection(customUrl?: string, customKey?: string): Promise<{
  connected: boolean;
  url: string;
  maskedKey: string;
  message: string;
  latencyMs?: number;
}> {
  const defaultCreds = getSupabaseCredentials();
  const url = (customUrl || defaultCreds.url).trim();
  const anonKey = (customKey || defaultCreds.anonKey).trim();

  if (!url || !anonKey) {
    return {
      connected: false,
      url: url || 'Não configurada',
      maskedKey: anonKey ? `${anonKey.slice(0, 8)}...` : 'Não configurada',
      message: 'Variáveis de ambiente do Supabase não encontradas. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no AI Studio.',
    };
  }

  const maskedKey =
    anonKey.length > 16
      ? `${anonKey.slice(0, 8)}...${anonKey.slice(-4)}`
      : `${anonKey.slice(0, 4)}...`;

  try {
    const startTime = performance.now();

    // 1. Initialize client using official @supabase/supabase-js
    const testClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 2. Validate client initialization and local session state (does not require auth or tables)
    await testClient.auth.getSession();

    // 3. Test HTTP reachability with the API key
    // NOTE: For 'sb_publishable_...' keys, we only send 'apikey', NEVER 'Authorization: Bearer'
    const headers: Record<string, string> = {
      apikey: anonKey,
    };

    // If key is a legacy JWT (contains 2 dots: header.payload.signature), we can attach Bearer; otherwise only apikey
    if (anonKey.split('.').length === 3) {
      headers['Authorization'] = `Bearer ${anonKey}`;
    }

    const cleanBaseUrl = url.replace(/\/$/, '');

    // Ping the Auth health endpoint (publicly exposed on every Supabase instance)
    const authHealthPromise = fetch(`${cleanBaseUrl}/auth/v1/health`, {
      method: 'GET',
      headers: { apikey: anonKey },
    });

    // Ping the REST root endpoint with the proper apikey header
    const restPromise = fetch(`${cleanBaseUrl}/rest/v1/`, {
      method: 'GET',
      headers,
    });

    const [authHealthRes, restRes] = await Promise.allSettled([authHealthPromise, restPromise]);

    const latencyMs = Math.round(performance.now() - startTime);

    const isAuthHealthy =
      authHealthRes.status === 'fulfilled' &&
      (authHealthRes.value.ok || authHealthRes.value.status === 200);

    const isRestHealthy =
      restRes.status === 'fulfilled' &&
      (restRes.value.ok || restRes.value.status === 200 || restRes.value.status === 404);

    if (isAuthHealthy || isRestHealthy) {
      return {
        connected: true,
        url,
        maskedKey,
        message: `Conexão bem-sucedida com o Supabase (${latencyMs}ms). O projeto está online, a chave pública (${anonKey.startsWith('sb_') ? 'Publishable Key' : 'Anon Key'}) é válida e o cliente oficial está pronto para uso.`,
        latencyMs,
      };
    }

    // Handle specific error codes if reachable but rejected
    if (restRes.status === 'fulfilled' && restRes.value.status === 401) {
      return {
        connected: false,
        url,
        maskedKey,
        message: 'A URL foi alcançada, mas a chave pública foi rejeitada (401). Verifique se a chave cadastrada é a Publishable / Anon Key do projeto.',
        latencyMs,
      };
    }

    return {
      connected: false,
      url,
      maskedKey,
      message: 'Não foi possível obter resposta de saúde do projeto Supabase. Verifique se a URL está correta.',
      latencyMs,
    };
  } catch (error: any) {
    return {
      connected: false,
      url,
      maskedKey,
      message: `Erro ao conectar com o Supabase: ${error?.message || 'Falha de rede ou URL inválida'}.`,
    };
  }
}
