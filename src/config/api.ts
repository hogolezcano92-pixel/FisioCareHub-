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
  supabaseUrl: "https://exciqetztunqgxbwwodo.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4Y2lxZXR6dHVucWd4Ynd3b2RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MDY0MDAsImV4cCI6MjA5MDA4MjQwMH0.nvxEce7JOaEIR7T2fpUwrtVOI3n84KcQtqveNr3OqAo",
  firebaseApiKey: "" 
};

// Esta função agora devolve os dados na hora, sem tentar buscar na rede,
// o que elimina o erro de tela branca no seu Preview.
export const fetchConfig = async (): Promise<APIConfig> => {
  return config;
};