import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config/api";

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    try {
      // Prioritize config from api.ts which is the source of truth
      let supabaseUrl = (config.supabaseUrl || "").trim();
      let supabaseAnonKey = (config.supabaseAnonKey || "").trim();

      // Fallback to environment variables if config is empty or invalid
      if (!supabaseUrl || !supabaseUrl.startsWith("http")) {
        supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
      }
      if (!supabaseAnonKey) {
        supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
      }

      // Final fallback to hardcoded values if still missing
      if (!supabaseUrl || !supabaseUrl.startsWith("http")) {
        supabaseUrl = "https://exciqetztunqgxbwwodo.supabase.co";
      }
      if (!supabaseAnonKey) {
        supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4Y2lxZXR6dHVucWd4Ynd3b2RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MDY0MDAsImV4cCI6MjA5MDA4MjQwMH0.nvxEce7JOaEIR7T2fpUwrtVOI3n84KcQtqveNr3OqAo";
      }

      console.log(`Inicializando Supabase com URL: ${supabaseUrl}`);

      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    } catch (err) {
      console.error("Erro fatal ao criar cliente Supabase:", err);
      // Retorna um objeto dummy funcional para evitar crashes em onAuthStateChange
      const dummyClient = {
        auth: {
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          getUser: async () => ({ data: { user: null }, error: null }),
          getSession: async () => ({ data: { session: null }, error: null }),
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: [], error: null })
              })
            })
          })
        })
      } as unknown as SupabaseClient;
      return dummyClient;
    }
  }
  return supabaseInstance;
};

// Proxy para permitir o uso de 'supabase' como se fosse a instância real, 
// mas inicializando-a apenas quando necessário.
export const supabase = new Proxy({} as SupabaseClient, {
  get: (target, prop) => {
    try {
      const instance = getSupabase();
      const value = (instance as any)[prop];
      if (value === undefined) return undefined;
      return typeof value === 'function' ? value.bind(instance) : value;
    } catch (err) {
      console.error(`Erro ao acessar propriedade '${String(prop)}' do Supabase:`, err);
      return undefined;
    }
  }
});

export const invokeFunction = async (name: string, body: any) => {
  const instance = getSupabase();
  
  console.log(`Invocando função: ${name}`, body);

  try {
    const { data, error } = await instance.functions.invoke(name, {
      body,
    });

    if (error) {
      // Se falhar com erro de rede ou CORS, tenta fetch direto como fallback
      const isNetworkError = 
        error.message?.includes("Failed to send a request") || 
        error.message?.includes("Load failed") ||
        error.message?.includes("Failed to fetch");

      if (isNetworkError) {
        console.warn(`SDK falhou ao invocar ${name} (${error.message}), tentando fetch direto...`);
        return await directInvoke(name, body);
      }
      
      console.error(`Erro ao invocar função ${name}:`, error);
      throw error;
    }

    return data;
  } catch (err: any) {
    const isNetworkError = 
      err.message?.includes("Failed to send a request") || 
      err.message?.includes("Load failed") ||
      err.message?.includes("Failed to fetch") ||
      err.name === 'TypeError';

    if (isNetworkError) {
      console.warn(`Capturado erro de rede ao invocar ${name}: ${err.message}. Tentando fetch direto...`);
      return await directInvoke(name, body);
    }
    throw err;
  }
};

/**
 * Fallback para invocar função via fetch direto caso o SDK falhe.
 */
async function directInvoke(name: string, body: any) {
  const instance = getSupabase();
  
  // Usa config como fonte primária de verdade para a URL e Key
  const supabaseUrl = config.supabaseUrl.replace(/\/$/, '');
  const supabaseAnonKey = config.supabaseAnonKey;
  
  const url = `${supabaseUrl}/functions/v1/${name}`;
  
  console.log(`Executando fetch direto para: ${url}`);

  try {
    const { data: { session } } = await instance.auth.getSession();
    const token = session?.access_token || supabaseAnonKey;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro na resposta do fetch direto (${response.status}):`, errorText);
      throw new Error(`Erro na função ${name} (HTTP ${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.log(`Sucesso no fetch direto para ${name}:`, result);
    return result;
  } catch (err: any) {
    console.error(`Falha total ao invocar ${name} via fetch direto:`, err);
    throw err;
  }
}

export const callFisioAI = async (action: string, payload: any) => {
  // Groq is now used for AI logic via src/lib/groq.ts
  throw new Error("Gemini function is deprecated. Use Groq service instead.");
};

export const initSupabase = () => {
  try {
    getSupabase();
    console.log("Supabase inicializado com sucesso.");
  } catch (error) {
    console.error("Falha ao inicializar Supabase:", error);
  }
};

export const handleSupabaseError = (error: any, operation: string, path: string) => {
  const errInfo = {
    error: error.message || String(error),
    operationType: operation,
    path,
    authInfo: {
      userId: supabase.auth.getUser().then(({ data }) => data.user?.id).catch(() => null),
    }
  };
  console.error('Supabase Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};
