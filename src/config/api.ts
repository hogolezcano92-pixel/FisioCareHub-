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

// Inserindo seus dados reais para o motor do app ligar
export let config: APIConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "https://exciqetztunqgxbwwodo.supabase.co",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4Y2lxZXR6dHVucWd4Ynd3b2RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MDY0MDAsImV4cCI6MjA5MDA4MjQwMH0.nvxEce7JOaEIR7T2fpUwrtVOI3n84KcQtqveNr3OqAo",
  firebaseApiKey: "" 
};

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.fisiocarehub.com";

// Esta função agora devolve os dados na hora, sem tentar buscar na rede,
// o que elimina o erro de tela branca no seu Preview.
export const fetchConfig = async (): Promise<APIConfig> => {
  return config;
};