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

export const generateLibraryContent = async (theme: string, type: string, level: string) => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });
    
    const prompt = `
      Você é um especialista em fisioterapia senior e criador de conteúdo educacional.
      Gere um conteúdo técnico-educacional completo e interativo para pacientes.

      TEMA: ${theme}
      TIPO: ${type}
      NÍVEL: ${level}

      O conteúdo deve seguir rigorosamente este formato JSON:
      {
        "title": "Título impactante",
        "category": "Uma das: Dor Lombar, Lesões Esportivas, Postura, Mobilidade, Recuperação Pós-Cirúrgica, Reabilitação",
        "description": "Uma breve introdução motivadora para o paciente (máx 200 caracteres)",
        "clinical_objective": "O objetivo terapêutico principal deste material",
        "sections": [
          {
            "type": "text",
            "content": {
              "title": "Subtítulo da Seção",
              "body": "Texto explicativo detalhado sobre a condição ou benefício"
            }
          },
          {
            "type": "step-by-step",
            "content": {
               "steps": ["Primeiro passo prático ou exercício", "Segundo passo..."]
            }
          },
          {
            "type": "alert",
            "content": {
              "message": "Um alerta clínico importante de segurança (Sinal Vermelho)"
            }
          }
        ]
      }

      Garanta que os exercícios sejam descritos de forma clara para que o paciente consiga fazer sozinho com segurança.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text());
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
};
