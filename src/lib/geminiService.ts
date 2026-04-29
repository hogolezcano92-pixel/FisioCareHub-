import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const categorizeContent = async (title: string, description: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Você é um especialista em fisioterapia e saúde. 
        Sua tarefa é categorizar um conteúdo educativo para uma biblioteca de saúde.
        
        Título: ${title}
        Descrição: ${description}
        
        Categorias Disponíveis:
        - Dor Lombar
        - Lesões Esportivas
        - Postura
        - Mobilidade
        - Recuperação Pós-Cirúrgica
        - Reabilitação
        
        Retorne APENAS o nome da categoria que melhor se encaixa. Se nenhuma se encaixar perfeitamente, retorne "Reabilitação".
      `,
    });
    
    const text = response.text?.trim() || "Reabilitação";
    return text;
  } catch (error) {
    console.error("Error categorizing content:", error);
    return "Reabilitação";
  }
};
