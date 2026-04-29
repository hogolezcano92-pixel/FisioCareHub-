import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const categorizeContent = async (title: string, description: string) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    
    const prompt = `
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
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    return text;
  } catch (error) {
    console.error("Error categorizing content:", error);
    return "Reabilitação";
  }
};
