import { callFisioAI } from "./supabase";

export async function analyzeSymptoms(symptoms: string) {
  try {
    const data = await callFisioAI("analyzeSymptoms", { symptoms });
    if (!data || !data.text) {
      throw new Error("Resposta da IA inválida");
    }
    return data.text;
  } catch (error) {
    console.error("Erro na análise de IA:", error);
    throw new Error("Não foi possível realizar a triagem no momento.");
  }
}

export async function generateMedicalRecord(type: string, notes: string) {
  try {
    const data = await callFisioAI("generateMedicalRecord", { type, notes });
    if (!data || !data.text) {
      throw new Error("Resposta da IA inválida");
    }
    return data.text;
  } catch (error) {
    console.error("Erro na geração de prontuário:", error);
    throw new Error("Não foi possível gerar a documentação no momento.");
  }
}

export async function generateDocument(type: string, patientName: string, additionalInfo: string) {
  try {
    const data = await callFisioAI("generateDocument", { type, patientName, additionalInfo });
    if (!data || !data.text) {
      throw new Error("Resposta da IA inválida");
    }
    return data.text;
  } catch (error) {
    console.error("Erro na geração de documento:", error);
    throw new Error("Não foi possível gerar o documento no momento.");
  }
}
