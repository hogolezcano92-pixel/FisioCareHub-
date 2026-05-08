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
    
    // Explicit handoff detection (only if user REALLY wants a human)
    const explicitHandoffKeywords = ['falar com atendente', 'quero falar com humano', 'falar com pessoa', 'suporte humano', 'preciso de atendente'];
    const isExplicitHandoff = explicitHandoffKeywords.some(keyword => lowerMsg.includes(keyword));

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
          REGRA: Informe ao usuário que não há profissionais disponíveis no momento. NÃO INVENTE NOMES. Ofereça transferir para o suporte se ele quiser deixar um recado.
        `;
      }
    }

    // Intelligent Data Collection Check
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
            
            REGRA: Use esses dados para resolver a dúvida ANTES de oferecer suporte humano. Tente ser o mais resolutivo possível com essas informações.
          `;
        } else {
          context += `
            STATUS DA CONSULTA: Não foi encontrado nenhum usuário com o dado "${identifier}".
            REGRA: Informe que não encontrou os dados e peça para o usuário conferir as informações ou falar com suporte humano para verificação manual.
          `;
        }
      }
    }

    try {
      const model = "llama-3.3-70b-versatile";
      
      const systemInstruction = `
        Você é a KineAI, a assistente oficial e proativa do FisioCareHub.
        Seu objetivo principal é RESOLVER as solicitações do usuário usando dados REAIS do sistema ANTES de qualquer encaminhamento humano.

        Frase de impacto: "Cuidado especializado, onde você estiver".

        DIRETRIZES DE ATENDIMENTO:
        1. COLETA DE DADOS: Se precisar consultar algo específico, peça o e-mail ou CPF educadamente e explique o motivo (ex: "Para verificar seu status no sistema...").
        2. CONSULTA: Use os dados do CONTEXTO abaixo (que vêm de buscas reais no banco) para responder.
        3. RESOLUÇÃO: Responda diretamente com a informação encontrada. Nunca pule essa etapa.
        4. HANDOFF (Humano): Só encaminhe para um atendente se:
           - O usuário pedir explicitamente (ex: "falar com atendente").
           - Após a consulta, os dados não serem suficientes para resolver.
           - O usuário demonstrar frustração persistente.

        REGRAS DE CONSTITUIÇÃO DE RESPOSTA:
        - Seja empática, profissional e ágil.
        - Se decidir que precisa transferir, confirme ao usuário: "Vou te conectar com um atendente agora para resolvermos isso juntos." e inclua o termo [HANDOFF_REQUIRED] discretamente ao final da resposta se necessário para disparar a lógica do sistema.
        - Se os dados estiverem no contexto, PRIORIZE-OS. NUNCA invente dados fictícios.

        CONTEXTO ATUALIZADO (DADOS REAIS):
        ${context}

        IMPORTANTE: Você é PROIBIDA de inventar nomes de fisioterapeutas ou status. Se o dado não estiver no contexto, você não o conhece.
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
      const needsHandoff = isExplicitHandoff || aiLower.includes("[handoff_required]") || aiLower.includes("vou te conectar com um atendente");

      return {
        response: aiResponse.replace("[HANDOFF_REQUIRED]", ""),
        intent: needsHandoff ? 'handoff' : 'support'
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
  },

  async generateClinicalInsights(context: any) {
    if (!apiKey || apiKey === "MISSING_API_KEY") {
      return {
        statusDay: "Bem-vindo ao seu dashboard profissional.",
        alerts: ["Configuração de IA pendente."],
        suggestions: ["Configure sua chave de API para liberar insights."]
      };
    }

    try {
      const model = "llama-3.3-70b-versatile";
      
      const systemInstruction = `
        Você é o "Assistente Clínico Inteligente" do dashboard de um fisioterapeuta.
        Seu objetivo é transformar dados reais da clínica em INSIGHTS ÚTEIS e AÇÕES práticas.

        DIRETRIZES:
        - Use APENAS os dados fornecidos no contexto.
        - Não invente nomes ou eventos.
        - Se não houver dados, diga "Sem dados suficientes".
        - Mantenha linguagem curta, objetiva e profissional.

        ESTRUTURA DE RETORNO (JSON):
        {
          "statusDay": "Resumo curto do dia (atendimentos, próximo, janelas livres, carga)",
          "alerts": ["Lista de alertas (faltas recorrentes, evolução pendente, ociosidade)"],
          "suggestions": ["Lista de ações sugeridas (reagendar, preencher furos, revisar pacientes)"],
          "nextPatientSummary": "Breve resumo do próximo paciente: última sessão + queixa + evolução",
          "daySummary": "Resumo opcional para fim de dia"
        }

        REGRAS DE ALERTAS:
        - Paciente faltou 2x ou mais consecutivas -> Alerta Crítico.
        - Mais de 2 agendamentos 'concluídos' nos últimos 7 dias sem evolução registrada -> Alerta de Prontuário.
        - Muitos furos na agenda (ex: apenas 2 atendimentos num dia longo) -> Alerta de Ociosidade.
      `;

      const response = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: `DADOS CLÍNICOS REAIS (CONTEXTO): ${JSON.stringify(context)}` }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("Resposta vazia da IA");
      
      return JSON.parse(content);
    } catch (error) {
      console.error("Erro ao gerar insights clínicos:", error);
      return {
        statusDay: "Olá! Como está sua agenda hoje?",
        alerts: ["Houve um erro ao processar os alertas em tempo real."],
        suggestions: ["Recarregue a página para tentar novamente."]
      };
    }
  }
};
