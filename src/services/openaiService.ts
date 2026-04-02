import OpenAI from "openai";

// Configuração para o Vite reconhecer a chave no Vercel
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true 
});

export const realizarTriagemIA = async (relatoPaciente: string) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "Você é um assistente de triagem fisioterapêutica para o app FisioCareHub. Analise o relato e retorne: 1. Nível de Urgência, 2. Possível Especialidade (Motora, Neuro ou Geriatria) e 3. Um breve conselho inicial." 
        },
        { role: "user", content: relatoPaciente }
      ],
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("Erro na OpenAI:", error);
    return "Não foi possível realizar a triagem agora. Tente novamente.";
  }
};
