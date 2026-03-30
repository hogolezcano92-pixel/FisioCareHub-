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

export let config: APIConfig = {
  supabaseUrl: "",
  supabaseAnonKey: "",
  firebaseApiKey: ""
};

export const fetchConfig = async (): Promise<APIConfig> => {
  try {
    const response = await fetch("/api/get-config");
    if (!response.ok) throw new Error("Falha ao carregar configurações");
    const data = await response.json();
    config = data;
    return data;
  } catch (error) {
    console.error("Erro ao carregar configurações:", error);
    throw error;
  }
};
