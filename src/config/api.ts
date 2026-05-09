export interface APIConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  firebaseApiKey: string;
  firebaseAuthDomain?: string;
  firebaseProjectId?: string;
  firebaseStorageBucket?: string;
  firebaseMessagingSenderId?: string;
  firebaseAppId?: string;
  firebaseMeasurementId?: string;
}

const getEnv = (key: string, fallback: string): string => {
  try {
    const env = (import.meta as any).env || {};
    const value = env[key];
    if (!value || value === "undefined" || value === "null" || value === "") return fallback;
    return value;
  } catch (e) {
    return fallback;
  }
};

// Inserindo seus dados reais para o motor do app ligar
export let config: APIConfig = {
  supabaseUrl: getEnv("VITE_SUPABASE_URL", "https://exciqetztunqgxbwwodo.supabase.co"),
  supabaseAnonKey: getEnv("VITE_SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4Y2lxZXR6dHVucWd4Ynd3b2RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MDY0MDAsImV4cCI6MjA5MDA4MjQwMH0.nvxEce7JOaEIR7T2fpUwrtVOI3n84KcQtqveNr3OqAo"),
  firebaseApiKey: getEnv("VITE_FIREBASE_API_KEY", "") 
};

export const API_BASE_URL = getEnv("VITE_API_BASE_URL", "https://api.fisiocarehub.com");

// Esta função agora devolve os dados na hora, sem tentar buscar na rede,
// o que elimina o erro de tela branca no seu Preview.
export const fetchConfig = async (): Promise<APIConfig> => {
  return config;
};