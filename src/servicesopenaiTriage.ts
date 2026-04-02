import OpenAI from "openai";

// Nota: O Vercel lerá a chave diretamente do seu painel de Environment Variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "", 
  dangerouslyAllowBrowser: true // Necessário se for rodar direto no frontend
});

export const processarTriagemIA = async (relatoPaciente: string) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "Você é um assistente de triagem para o FisioCareHub. Analise o relato e retorne apenas: Urgência (Baixa/Média/Alta) e Especialidade recomendada." 
        },
        { role: "user", content: relatoPaciente }
      ],
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Erro na triagem OpenAI:", error);
    return "Erro ao processar triagem.";
  }
};
