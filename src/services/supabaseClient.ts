import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Resolve credentials directly from standard Vite environment variables (import.meta.env)
export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const anonKey = (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  return { url, anonKey };
}

// Log safe diagnostic for production troubleshooting (without exposing actual keys)
console.info('[Supabase production diagnostic]', {
  mode: import.meta.env.MODE,
  prod: import.meta.env.PROD,
  hasUrl: Boolean(import.meta.env.VITE_SUPABASE_URL),
  hasPublishableKey: Boolean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
  hasAnonKey: Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY),
});

let supabaseInstance: SupabaseClient | null = null;

/**
 * Resilient fetch wrapper that intercepts PostgREST clock-drift errors (e.g. PGRST303 "JWT issued at future").
 * When clock drift or stale JWTs occur, it waits briefly for server time to catch up and retries,
 * and if necessary cleans invalid localStorage sessions so public queries continue working.
 */
const resilientSupabaseFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  let response = await fetch(input, init);

  if (response.status === 401) {
    try {
      const cloned = response.clone();
      const body = await cloned.json().catch(() => null);

      const isJwtFuture =
        body &&
        (body.code === 'PGRST303' ||
          (typeof body.message === 'string' &&
            body.message.toLowerCase().includes('jwt issued at future')));

      if (isJwtFuture) {
        console.warn(
          '[Supabase Client] PGRST303 (JWT issued at future) detectado. Compensando desvio de relógio (clock skew) e repetindo requisição...'
        );

        // Aguarda 1.2s para compensar pequenas diferenças de timestamp entre cliente e servidor
        await new Promise((r) => setTimeout(r, 1200));

        // Repete a requisição original
        response = await fetch(input, init);

        // Se persistir o erro de JWT futuro, limpa sessão local corrompida e tenta como anônimo
        if (response.status === 401) {
          const secondClone = response.clone();
          const secondBody = await secondClone.json().catch(() => null);
          if (
            secondBody &&
            (secondBody.code === 'PGRST303' ||
              (typeof secondBody.message === 'string' &&
                secondBody.message.toLowerCase().includes('jwt issued at future')))
          ) {
            console.warn(
              '[Supabase Client] Erro persistente de JWT futuro. Limpando tokens locais corrompidos e repetindo...'
            );
            if (typeof window !== 'undefined' && window.localStorage) {
              try {
                const keysToRemove: string[] = [];
                for (let i = 0; i < localStorage.length; i++) {
                  const k = localStorage.key(i);
                  if (k && (k.startsWith('sb-') || k.includes('supabase.auth.token'))) {
                    keysToRemove.push(k);
                  }
                }
                keysToRemove.forEach((k) => localStorage.removeItem(k));
              } catch (_) {}
            }

            // Repete sem o header de Authorization expirado/futuro
            if (init) {
              const headers = new Headers(init.headers);
              headers.delete('Authorization');
              const { anonKey } = getSupabaseCredentials();
              if (anonKey) {
                headers.set('apikey', anonKey);
              }
              response = await fetch(input, { ...init, headers });
            }
          }
        }
      }
    } catch (_) {
      // Ignora falhas de parse em respostas 401 não-JSON
    }
  }

  return response;
};

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
      global: {
        fetch: resilientSupabaseFetch,
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
      message: 'Variáveis de ambiente do Supabase não encontradas. Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY nas variáveis de ambiente da Vercel.',
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
