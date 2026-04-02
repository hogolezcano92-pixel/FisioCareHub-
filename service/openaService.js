// Arquivo de integração com a OpenAI
import OpenAI from "openai";

// A chave será puxada das configurações de segurança do GitHub (Secrets)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const realizarTriagem = async (dados) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Você é um assistente de triagem fisioterapêutica." },
      { role: "user", content: dados }
    ],
  });
  return completion.choices[0].message.content;
};
