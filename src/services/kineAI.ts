import Groq from "groq-sdk";
import { supabase } from "../lib/supabase";

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

  async getAvailablePhysios() {
    try {
      const { data, error } = await supabase
        .from('perfis')
        .select('nome_completo, especialidade')
        .eq('tipo_usuario', 'fisioterapeuta')
        .eq('status_aprovacao', 'aprovado')
        .limit(15);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Erro ao buscar fisioterapeutas para KineAI:", error);
      return [];
    }
  },

  async findUserByData(identifier: string) {
    try {
      // Basic check to see what kind of data it is
      let query = supabase.from('perfis').select('nome_completo, tipo_usuario, status_aprovacao, plano');
      
      const cleanData = identifier.trim();
      
      if (cleanData.includes('@')) {
        query = query.eq('email', cleanData);
      } else if (cleanData.length >= 11 && /^\d+$/.test(cleanData.replace(/\D/g, ""))) {
        // Simple CPF or Phone check
        const digits = cleanData.replace(/\D/g, "");
        if (digits.length === 11) {
          query = query.or(`cpf.eq.${digits},telefone.eq.${digits}`);
        } else {
          query = query.eq('telefone', digits);
        }
      } else {
        return null;
      }

      const { data, error } = await query.single();
      if (error) return null;
      return data;
    } catch (error) {
      console.error("Erro ao buscar usuário por dado:", error);
      return null;
    }
  },

  async processSupportQuery(message: string, history: { role: 'user' | 'assistant', content: string }[] = []) {
    if (!apiKey || apiKey === "MISSING_API_KEY") {
      const msg = "Configuração de IA incompleta: VITE_GROQ_API_KEY não encontrada. Por favor, configure a chave de API nas configurações do projeto com o prefixo VITE_.";
      return { response: msg, intent: 'support' };
    }

    const lowerMsg = message.toLowerCase();
    
    // Intent detection for human handoff
    const handoffKeywords = ['atendente', 'humano', 'falar com pessoa', 'suporte humano', 'especialista', 'pessoa real', 'hugo'];
    const needsHandoff = handoffKeywords.some(keyword => lowerMsg.includes(keyword));

    if (needsHandoff) {
      return {
        response: "Entendo perfeitamente. Estou te encaminhando agora para um de nossos especialistas humanos. Só um momento enquanto preparo sua conexão com o suporte do FisioCareHub... 👨‍💻",
        intent: 'handoff'
      };
    }

    // Check if user is asking for physiotherapists
    const physioKeywords = ['fisioterapeuta', 'fisio', 'profissional', 'quem pode me atender', 'especialistas disponíveis', 'médico'];
    const isAskingForPhysio = physioKeywords.some(keyword => lowerMsg.includes(keyword));
    
    let context = "";
    
    if (isAskingForPhysio) {
      const availablePhysios = await this.getAvailablePhysios();
      if (availablePhysios.length > 0) {
        context += `
          FISIOTERAPEUTAS DISPONÍVEIS AGORA (DADOS REAIS DO SISTEMA):
          ${availablePhysios.map(p => `- Dr(a). ${p.nome_completo} (${p.especialidade || 'Fisioterapeuta Geral'})`).join('\n')}
          
          REGRAS CRÍTICAS:
          1. Use APENAS os nomes acima se for indicar alguém.
          2. NUNCA invente nomes de profissionais.
        `;
      } else {
        context += `
          STATUS DO SISTEMA: No momento não há fisioterapeutas cadastrados ou aprovados no sistema.
          REGRA: Informe ao usuário que não há profissionais disponíveis no momento. NÃO INVENTE NOMES.
        `;
      }
    }

    // Intelligent Data Collection Check
    // Look for patterns like email or numerical sequences in the message
    const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneCpfMatch = message.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/) || message.match(/\d{10,11}/);
    
    if (emailMatch || phoneCpfMatch) {
      const identifier = (emailMatch ? emailMatch[0] : phoneCpfMatch ? phoneCpfMatch[0] : "");
      if (identifier) {
        const foundUser = await this.findUserByData(identifier);
        if (foundUser) {
          context += `
            DADOS ENCONTRADOS DO USUÁRIO (CONSULTA REAL):
            - Nome: ${foundUser.nome_completo}
            - Tipo: ${foundUser.tipo_usuario}
            - Status: ${foundUser.status_aprovacao}
            - Plano: ${foundUser.plano || 'Sem plano ativo'}
            
            REGRA: Use esses dados para personalizar a resposta. Informe que encontrou o registro dele com sucesso.
          `;
        } else {
          context += `
            STATUS DA CONSULTA: Não foi encontrado nenhum usuário com o dado "${identifier}".
            REGRA: Peça para o usuário conferir a informação ou oferecer suporte para criar uma conta.
          `;
        }
      }
    }

    try {
      const model = "llama-3.3-70b-versatile";
      
      const systemInstruction = `
        Você é a KineAI, a super assistente inteligente e agente de suporte proativo do FisioCareHub.
        Seu objetivo é ajudar usuários (pacientes e fisioterapeutas) com dúvidas sobre o aplicativo, agendamentos, pagamentos via Stripe/Asaas, e uso da plataforma.
        
        Frase de impacto: "Cuidado especializado, onde você estiver".

        SOBRE COLETA DE DADOS (LGPD):
        - Se precisar consultar algo específico do usuário (status da conta, pagamentos, etc), peça educadamente o e-mail cadastrado ou CPF.
        - EXPLIQUE sempre o motivo: "Para que eu possa verificar sua conta no sistema, você poderia me informar seu e-mail ou CPF?"
        - Garanta que os dados são usados apenas para a consulta imediata.

        REGRAS DE CONSTITUIÇÃO DE RESPOSTA:
        - Seja extremamente empática, profissional e ágil.
        - Use emojis moderadamente.
        - Se houver dados reais no contexto abaixo, PRIORIZE-OS. NUNCA invente dados.
        - Se não souber algo, direcione para o suporte humano (Handoff).

        CONTEXTO ATUALIZADO (DADOS REAIS):
        ${context}

        IMPORTANTE: Você é PROIBIDA de inventar nomes de fisioterapeutas, status de usuários ou qualquer informação factual. Se o dado não estiver no contexto, você não o conhece.
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
