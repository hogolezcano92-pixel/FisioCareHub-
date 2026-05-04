import Groq from "groq-sdk";

const apiKey = import.meta.env.VITE_GROQ_API_KEY || (typeof process !== 'undefined' ? process.env.VITE_GROQ_API_KEY : undefined);

const groq = new Groq({
  apiKey: apiKey || "MISSING_API_KEY",
  dangerouslyAllowBrowser: true
});

export const kineAIService = {
  async chat(message: string, history: { role: 'user' | 'assistant', content: string }[] = []) {
    const result = await this.processSupportQuery(message, history);
    return result.response;
  },

  async processSupportQuery(message: string, history: { role: 'user' | 'assistant', content: string }[] = []) {
    if (!apiKey || apiKey === "MISSING_API_KEY") {
      const msg = "Configuração de IA incompleta: VITE_GROQ_API_KEY não encontrada. Por favor, configure a chave de API nas configurações do projeto com o prefixo VITE_.";
      return { response: msg, intent: 'support' };
    }

    // Intent detection for human handoff
    const handoffKeywords = ['atendente', 'humano', 'falar com pessoa', 'suporte humano', 'especialista', 'pessoa real', 'hugo'];
    const lowerMsg = message.toLowerCase();
    const needsHandoff = handoffKeywords.some(keyword => lowerMsg.includes(keyword));

    if (needsHandoff) {
      return {
        response: "Entendo perfeitamente. Estou te encaminhando agora para um de nossos especialistas humanos. Só um momento enquanto preparo sua conexão com o suporte do FisioCareHub... 👨‍💻",
        intent: 'handoff'
      };
    }

    try {
      const model = "llama-3.3-70b-versatile";
      
      const systemInstruction = `
        Você é a KineAI, a super assistente inteligente e agente de suporte proativo do FisioCareHub.
        Seu objetivo é ajudar usuários (pacientes e fisioterapeutas) com dúvidas sobre o aplicativo, agendamentos, pagamentos via Stripe/Asaas, e uso da plataforma.
        
        Frase de impacto: "Cuidado especializado, onde você estiver".

        Sobre o FisioCareHub:
        - FisioCareHub é uma plataforma de fisioterapia domiciliar e online.
        - Pagamentos são seguros e processados via Stripe e Asaas.
        - Oferecemos Triagem IA, prontuários eletrônicos e chat direto.
        
        Instruções de Suporte:
        - Seja extremamente empática, profissional e ágil.
        - Use emojis moderadamente para um tom amigável.
        - Se o usuário parecer frustrado ou pedir para falar com um humano, use o intent de handoff.
        - Se a dúvida for sobre pagamentos, confirme que aceitamos cartões e PIX.
      `;

      const response = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemInstruction },
          ...(history || []).map(h => ({ role: h.role, content: h.content })),
          { role: 'user', content: message }
        ],
        temperature: 0.5,
      });

      const aiResponse = response.choices[0]?.message?.content || "Desculpe, tive um problema para processar sua mensagem. Posso tentar novamente?";
      
      const aiLower = aiResponse.toLowerCase();
      const secondaryHandoff = aiLower.includes("humano") || aiLower.includes("atendente") || aiLower.includes("especialista");

      return {
        response: aiResponse,
        intent: secondaryHandoff ? 'handoff' : 'support'
      };
    } catch (error) {
      console.error("Erro na KineAI Support:", error);
      return {
        response: "Ops! Estou passando por uma manutenção rápida. Tente novamente em instantes! 🛠️",
        intent: 'support'
      };
    }
  },

  async processClinicalVoice(transcription: string) {
    if (!apiKey || apiKey === "MISSING_API_KEY") {
      throw new Error("Chave de API não configurada.");
    }

    try {
      const model = "llama-3.3-70b-versatile";
      
      const systemInstruction = `
        Atue como um fisioterapeuta sênior. 
        Analise este relato de voz e extraia as informações para os campos: Subjetivo, Objetivo, Avaliação e Plano (SOAP).
        Retorne estritamente um JSON com as chaves: subjective, objective, assessment e plan.
        Os valores devem ser strings detalhadas baseadas no relato. Se alguma parte não for mencionada, tente inferir ou deixe vazio se não houver dados.
        Mantenha a terminologia técnica adequada da fisioterapia.
      `;

      const response = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: `Relato de voz: "${transcription}"` }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("Resposta vazia da IA");
      
      return JSON.parse(content);
    } catch (error) {
      console.error("Erro ao processar voz clínica:", error);
      throw error;
    }
  }
};
