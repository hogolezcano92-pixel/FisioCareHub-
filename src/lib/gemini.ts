import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI directly in the frontend
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const modelName = "gemini-3-flash-preview";

export async function analyzeSymptoms(symptoms: string) {
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Você é um assistente de triagem de fisioterapia inteligente. 
      Analise os seguintes sintomas relatados pelo paciente: "${symptoms}".
      
      Forneça uma análise estruturada em Markdown com:
      1. Possíveis áreas afetadas.
      2. Nível de urgência (Baixo, Médio, Alto).
      3. Recomendações iniciais (ex: gelo, repouso, procurar especialista).
      4. Perguntas adicionais que o fisioterapeuta pode fazer.
      
      Lembre-se: Isso não substitui uma consulta profissional.`
    });

    if (!response || !response.text) {
      throw new Error("Resposta da IA inválida");
    }
    return response.text;
  } catch (error: any) {
    console.error("Erro na análise de IA:", error);
    throw new Error(error.message || "Não foi possível realizar a triagem no momento.");
  }
}

export async function generateMedicalRecord(type: string, notes: string) {
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Você é um assistente especializado em documentação de fisioterapia.
      Gere um registro profissional de ${type} baseado nestas notas breves: "${notes}".
      
      O registro deve ser estruturado, técnico e seguir as melhores práticas da fisioterapia brasileira (CREFITO).
      
      Se o tipo for "Avaliação Físico-Funcional", inclua seções como:
      - Queixa Principal
      - HMA (História da Moléstia Atual)
      - Exame Físico (Inspeção, Palpação, Testes Específicos)
      - Diagnóstico Fisioterapêutico
      
      Se o tipo for "Tratamento", inclua:
      - Objetivos do Tratamento
      - Conduta Fisioterapêutica (Exercícios, Recursos, Frequência)
      
      Se o tipo for "Evolução", inclua:
      - Estado atual do paciente
      - Resposta ao tratamento anterior
      - Ajustes na conduta
      
      Retorne o texto formatado em Markdown profissional.`
    });

    if (!response || !response.text) {
      throw new Error("Resposta da IA inválida");
    }
    return response.text;
  } catch (error) {
    console.error("Erro na geração de prontuário:", error);
    throw new Error("Não foi possível gerar a documentação no momento.");
  }
}

export async function generateDocument(type: string, patientName: string, additionalInfo: string) {
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Você é um assistente administrativo para fisioterapeutas. 
      Gere um documento do tipo "${type || 'Documento Geral'}" para o paciente "${patientName}".
      Informações adicionais: ${additionalInfo}
      O documento deve ser profissional, formal e seguir as normas brasileiras de saúde.
      Use Markdown para formatação.`
    });

    if (!response || !response.text) {
      throw new Error("Resposta da IA inválida");
    }
    return response.text;
  } catch (error) {
    console.error("Erro na geração de documento:", error);
    throw new Error("Não foi possível gerar o documento no momento.");
  }
}
