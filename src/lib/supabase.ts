import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config/api";

export let supabase: SupabaseClient | null = null;

export const initSupabase = () => {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    console.warn("Supabase config not ready yet.");
    return;
  }
  supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
  return supabase;
};

export const getSupabase = (): SupabaseClient => {
  if (!supabase) {
    return initSupabase() as SupabaseClient;
  }
  return supabase;
};

/**
 * Helper to invoke Supabase Edge Functions
 */
export const invokeFunction = async (functionName: string, body: any = {}) => {
  try {
    const client = getSupabase();
    if (!client) throw new Error("Supabase client not initialized");

    const { data, error } = await client.functions.invoke(functionName, {
      body: body && Object.keys(body).length > 0 ? body : undefined,
    });

    if (error) {
      console.error(`Erro retornado pela função ${functionName}:`, error);
      throw error;
    }

    return data;
  } catch (err: any) {
    console.error(`Falha crítica ao invocar função ${functionName}:`, err);
    throw err;
  }
};

export async function callFisioAI(action: string, params: any = {}) {
  try {
    const client = getSupabase();
    if (!client) return null;

    const { data, error } = await client.functions.invoke('gemini-ai', {
      body: { 
        action: action,
        payload: params 
      },
    });

    if (error) {
      console.error('Erro ao chamar a IA (Edge Function):', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Falha crítica ao invocar callFisioAI:', err);
    return null;
  }
}
