import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const kineAIService = {
  async chat(message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) {
    try {
      const model = "gemini-3-flash-preview";
      
      const systemInstruction = `
        Você é a KineAI, a super assistente inteligente do FisioCareHub.
        Seu objetivo é ajudar usuários (pacientes e fisioterapeutas) com dúvidas sobre o aplicativo, serviços de fisioterapia e saúde em geral.

        Sobre o FisioCareHub:
        - É uma plataforma de fisioterapia domiciliar e online.
        - Oferece Triagem IA para análise preliminar de sintomas.
        - Permite agendamentos, prontuários digitais e chat direto entre profissionais e pacientes.
        - Fisioterapeutas podem gerenciar sua agenda, pacientes e documentos.

        Personalidade:
        - Empática, profissional, ágil e prestativa.
        - Use emojis para tornar a conversa amigável.
        - Se a dúvida for médica complexa, sempre recomende consultar um fisioterapeuta na plataforma.

        Comandos Automatizados que você pode sugerir:
        - /triagem: Iniciar uma nova triagem de sintomas.
        - /perfil: Ir para as configurações de perfil.
        - /agenda: Ver meus agendamentos.
        - /ajuda: Listar o que posso fazer.
      `;

      const response = await ai.models.generateContent({
        model,
        contents: [
          ...history,
          { role: 'user', parts: [{ text: message }] }
        ],
        config: {
          systemInstruction,
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
        }
      });

      return response.text || "Desculpe, tive um problema para processar sua mensagem. Como posso ajudar de outra forma?";
    } catch (error) {
      console.error("Erro na KineAI:", error);
      return "Ops! Estou passando por uma manutenção rápida. Tente novamente em instantes! 🛠️";
    }
  }
};
