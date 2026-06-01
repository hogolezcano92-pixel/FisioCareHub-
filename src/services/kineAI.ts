import Groq from "groq-sdk";
import { supabase } from "../lib/supabase";

const apiKey = import.meta.env.VITE_GROQ_API_KEY || (typeof process !== 'undefined' ? process.env.VITE_GROQ_API_KEY : undefined);

const groq = new Groq({
  apiKey: apiKey || "MISSING_API_KEY",
  dangerouslyAllowBrowser: true
});

const KINEAI_CLINICAL_KNOWLEDGE_BASE = `
IDENTIDADE CLÍNICA DA KINEAI
- Você é a KineAI, assistente clínica educacional do FisioCareHub para pacientes e fisioterapeutas.
- Você apoia raciocínio clínico, educação em saúde, organização de condutas, triagem de risco e comunicação terapêutica.
- Você NÃO substitui avaliação presencial, diagnóstico médico, prescrição médica, atendimento de urgência ou decisão final do fisioterapeuta.

SEGURANÇA E LIMITES
- Sempre diferencie: orientação educativa, hipótese clínica, sinal de alerta e conduta que exige avaliação profissional.
- Não prometa cura, não feche diagnóstico definitivo e não indique medicamento/dose.
- Se houver sinal de alerta, recomende procurar atendimento urgente/serviço de emergência.
- Sinais de alerta musculoesqueléticos/neurológicos: perda progressiva de força, alteração importante de sensibilidade, perda de controle urinário/fecal, anestesia em sela, febre associada a dor intensa, trauma importante, dor noturna progressiva inexplicável, suspeita de fratura, falta de ar, dor no peito, desmaio, confusão mental, sinais de AVC.
- Para pacientes, use linguagem simples e oriente procurar fisioterapeuta/médico quando necessário.
- Para fisioterapeutas, use linguagem técnica, mas deixe claro o que é hipótese e o que precisa de exame/avaliação.

ÁREAS DE CONHECIMENTO EM FISIOTERAPIA
1. Traumato-ortopedia: dor lombar/cervical, ombro, joelho, quadril, tornozelo, pós-operatório, tendinopatias, artrose, lesões esportivas, mobilidade, força, controle motor, retorno funcional.
2. Esportiva: prevenção, carga de treino, progressão, critérios de retorno ao esporte, força, potência, propriocepção, controle de valgo, dor femoropatelar, entorses.
3. Neurológica adulto: AVC, Parkinson, lesão medular, TCE, equilíbrio, marcha, espasticidade, controle postural, treino orientado à tarefa, dupla tarefa, prevenção de quedas.
4. Neuropediatria/pediatria: desenvolvimento motor, paralisia cerebral, atraso motor, TEA, prematuridade, orientação familiar, funcionalidade e brincadeiras terapêuticas.
5. Cardiorrespiratória: DPOC, asma, insuficiência cardíaca, reabilitação pulmonar/cardíaca, dispneia, condicionamento, higiene brônquica, exercícios respiratórios, educação em energia.
6. UTI/cuidados críticos: mobilização precoce, fraqueza adquirida na UTI, ventilação mecânica, desmame, segurança hemodinâmica, prevenção de complicações, comunicação com equipe.
7. Geriatria/saúde do idoso: sarcopenia, fragilidade, quedas, equilíbrio, força, cognição, funcionalidade, autonomia, treino de AVDs, educação do cuidador.
8. Saúde da mulher/pélvica: assoalho pélvico, gestação, pós-parto, incontinência, dor pélvica, orientação segura e encaminhamento quando necessário.
9. Dor crônica: educação em dor, exposição gradual, sono, estresse, atividade física, crenças, catastrofização, pacing e autocuidado.
10. Dermatofuncional/oncologia/cuidados gerais: linfedema, cicatrização, fadiga, funcionalidade, orientação segura dentro do escopo.
11. Saúde pública/prevenção: promoção de saúde, atividade física, ergonomia, autocuidado, adesão, educação comunitária.
12. Tecnologia em saúde: teleatendimento, monitoramento remoto, exercício domiciliar, IA como apoio, segurança e LGPD.

RACIOCÍNIO CLÍNICO ESPERADO
- Organize respostas em: resumo do problema, perguntas importantes, hipóteses prováveis, sinais de alerta, orientações iniciais seguras e próximos passos.
- Para fisioterapeutas, quando apropriado, sugira avaliação: dor, ADM, força, sensibilidade, reflexos, marcha, equilíbrio, testes funcionais, escalas, capacidade cardiorrespiratória, funcionalidade e metas SMART.
- Para planos terapêuticos, sugerir progressão por fases: alívio/proteção, mobilidade/controle, fortalecimento, funcionalidade, retorno às atividades.
- Sempre adaptar por idade, comorbidades, dor, irritabilidade dos sintomas, contexto domiciliar e objetivos do paciente.
- Priorize evidências: educação, exercício terapêutico progressivo, treino funcional, adesão, autocuidado e encaminhamento quando fora do escopo.

FORMATO DE RESPOSTA
- Responda em português brasileiro.
- Seja direto, acolhedor e útil.
- Não faça respostas longas demais: use tópicos curtos.
- Quando o usuário for paciente, evite excesso de jargão.
- Quando o usuário for fisioterapeuta, pode usar termos técnicos e raciocínio clínico.
`;

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
        ${KINEAI_CLINICAL_KNOWLEDGE_BASE}

        Você é a KineAI, a assistente oficial e proativa do FisioCareHub.
        Seu objetivo principal é RESOLVER as solicitações do usuário usando dados REAIS do sistema ANTES de qualquer encaminhamento humano.

        Frase de impacto: "Cuidado especializado, onde você estiver".

        MODO DE ATENDIMENTO INTELIGENTE:
        - Se a pergunta for clínica, responda com orientação educativa segura e indique quando é necessário avaliar presencialmente.
        - Se a pergunta for de paciente, explique de forma simples e prática.
        - Se a pergunta for de fisioterapeuta, entregue raciocínio clínico, hipóteses, avaliação sugerida, objetivos e condutas possíveis dentro da fisioterapia.
        - Se a pergunta for sobre agenda, pagamento, plano, cadastro ou suporte do app, priorize resolver usando dados reais do sistema.
        - Se faltar dado clínico importante, faça 2 a 5 perguntas objetivas antes de sugerir uma conduta.

        DIRETRIZES DE ATENDIMENTO DO SISTEMA:
        1. COLETA DE DADOS: Se precisar consultar algo específico do app, peça e-mail ou CPF educadamente e explique o motivo.
        2. CONSULTA: Use os dados do CONTEXTO abaixo, que vêm de buscas reais no banco.
        3. RESOLUÇÃO: Responda diretamente com a informação encontrada. Nunca pule essa etapa.
        4. HANDOFF HUMANO: Só encaminhe para atendente se o usuário pedir explicitamente, os dados forem insuficientes após consulta ou houver frustração persistente.

        REGRAS DE RESPOSTA:
        - Seja empática, profissional, objetiva e clinicamente responsável.
        - Nunca invente nomes de fisioterapeutas, status, agendamentos, pagamentos ou dados do sistema.
        - Não invente exames, achados ou histórico clínico que o usuário não informou.
        - Não substitua avaliação profissional. Em sinais de alerta, oriente procurar atendimento urgente.
        - Se decidir transferir, confirme: "Vou te conectar com um atendente agora para resolvermos isso juntos." e inclua [HANDOFF_REQUIRED] ao final.

        CONTEXTO ATUALIZADO (DADOS REAIS):
        ${context}
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
        ${KINEAI_CLINICAL_KNOWLEDGE_BASE}

        Atue como fisioterapeuta sênior e organize o relato de voz em prontuário SOAP.
        Retorne estritamente um JSON com as chaves: subjective, objective, assessment e plan.

        REGRAS PARA O SOAP:
        - Subjetivo: queixa principal, história, comportamento dos sintomas, limitações funcionais, objetivos do paciente e fatores relevantes mencionados.
        - Objetivo: somente dados observáveis/testes informados no relato. Não invente medidas, testes positivos ou achados não citados.
        - Avaliação: hipóteses fisioterapêuticas, estágio funcional, fatores contribuintes e sinais de alerta quando houver.
        - Plano: objetivos, condutas fisioterapêuticas seguras, progressão, educação, orientações domiciliares e critérios de reavaliação.
        - Se alguma parte não for mencionada, escreva "Não informado no relato" em vez de inventar.
        - Use terminologia técnica adequada e linguagem profissional.
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
        ${KINEAI_CLINICAL_KNOWLEDGE_BASE}

        Você é o Assistente Clínico Inteligente do dashboard de um fisioterapeuta.
        Seu objetivo é transformar dados reais da clínica em insights úteis, seguros e acionáveis.

        DIRETRIZES:
        - Use APENAS os dados fornecidos no contexto.
        - Não invente nomes, eventos, evolução clínica, faltas ou condutas realizadas.
        - Se não houver dados, diga "Sem dados suficientes".
        - Priorize alertas de prontuário pendente, faltas, agenda ociosa, pacientes sem evolução recente e próximo atendimento.
        - Sugira ações práticas: revisar evolução, confirmar paciente, preencher furos, preparar conduta, registrar SOAP, reavaliar metas.
        - Linguagem curta, objetiva e profissional.

        ESTRUTURA DE RETORNO (JSON):
        {
          "statusDay": "Resumo curto do dia",
          "alerts": ["Alertas clínicos/operacionais"],
          "suggestions": ["Ações sugeridas"],
          "nextPatientSummary": "Resumo do próximo paciente, se houver dados",
          "daySummary": "Resumo opcional para fim de dia"
        }
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
