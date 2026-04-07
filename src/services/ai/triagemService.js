// src/services/ai/triagemService.js

/**
 * Serviço de IA para Triagem - FisioCareHub
 * Modelo: Llama 3 via Groq (Grátis e Ultra Rápido)
 */

export const realizarTriagemIA = async (textoUsuario) => {
    // Aqui usamos a API da Groq (você precisará da chave no .env)
    const API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY; 

    try {
        const resposta = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama3-8b-8192",
                messages: [
                    {
                        role: "system",
                        content: "Você é um classificador da FisioCareHub. Responda APENAS 'paciente' ou 'fisioterapeuta' com base no texto do usuário. Se ele quer ajuda/dor é paciente. Se ele quer trabalhar/atender é fisioterapeuta."
                    },
                    {
                        role: "user",
                        content: textoUsuario
                    }
                ],
                temperature: 0.1 // Para ser direto e não inventar texto
            })
        });

        const dados = await resposta.json();
        const resultado = dados.choices[0].message.content.toLowerCase().trim();

        // Validação extra para garantir que o banco de dados aceite
        if (resultado.includes("fisioterapeuta")) return "fisioterapeuta";
        return "paciente";

    } catch (error) {
        console.error("Erro na Triagem IA:", error);
        return "paciente"; // Fallback seguro para não travar o cadastro
    }
};
