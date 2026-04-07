import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

export const kineAIService = {
  async chat(message: string, history: { role: 'user' | 'assistant', content: string }[] = []) {
    try {
      const model = "llama-3.3-70b-versatile";
      
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

      const response = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemInstruction },
          ...history.map(h => ({ role: h.role, content: h.content })),
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 1,
        stream: false,
      });

      return response.choices[0]?.message?.content || "Desculpe, tive um problema para processar sua mensagem. Como posso ajudar de outra forma?";
    } catch (error) {
      console.error("Erro na KineAI (Groq):", error);
      return "Ops! Estou passando por uma manutenção rápida. Tente novamente em instantes! 🛠️";
    }
  }
};
