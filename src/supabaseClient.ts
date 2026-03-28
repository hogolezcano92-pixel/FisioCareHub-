import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (supabaseInstance) return supabaseInstance;

  // Tenta pegar as chaves tanto no formato Vite quanto no formato Next.js (que você configurou)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  console.log("Configuração Supabase detectada:", {
    url: supabaseUrl ? "Presente" : "Ausente",
    key: supabaseKey ? "Presente" : "Ausente"
  });

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing. Please set VITE_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL in your environment variables.');
  }

  // Remove barra final se existir para evitar erros de URL
  let cleanUrl = supabaseUrl.trim().replace(/\/$/, "");
  
  // Garante que a URL comece com https://
  if (!cleanUrl.startsWith('http')) {
    cleanUrl = `https://${cleanUrl}`;
  }
  
  const cleanKey = supabaseKey.trim();

  supabaseInstance = createClient(cleanUrl, cleanKey);
  return supabaseInstance;
};
