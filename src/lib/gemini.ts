import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeSymptoms(symptoms: string) {
  const model = "gemini-3-flash-preview";
  const prompt = `Você é um assistente de triagem de fisioterapia inteligente. 
  Analise os seguintes sintomas relatados pelo paciente: "${symptoms}".
  
  Forneça uma análise estruturada em Markdown com:
  1. Possíveis áreas afetadas.
  2. Nível de urgência (Baixo, Médio, Alto).
  3. Recomendações iniciais (ex: gelo, repouso, procurar especialista).
  4. Perguntas adicionais que o fisioterapeuta pode fazer.
  
  Lembre-se: Isso não substitui uma consulta profissional.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Erro na análise de IA:", error);
    throw new Error("Não foi possível realizar a triagem no momento.");
  }
}
