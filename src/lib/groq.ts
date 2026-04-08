import Groq from "groq-sdk";

const apiKey = import.meta.env.VITE_GROQ_API_KEY || (typeof process !== 'undefined' ? process.env.VITE_GROQ_API_KEY : undefined);

const groq = new Groq({
  apiKey: apiKey || "MISSING_API_KEY",
  dangerouslyAllowBrowser: true
});

const MODEL = "llama-3.3-70b-versatile"; // A good default for Groq

export async function analyzeSymptoms(symptoms: string) {
  if (!apiKey || apiKey === "MISSING_API_KEY") {
    throw new Error("Configuração de IA incompleta: VITE_GROQ_API_KEY não encontrada. Por favor, configure a chave de API nas configurações do projeto com o prefixo VITE_.");
  }
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Você é um assistente de triagem de fisioterapia inteligente. Forneça uma análise estruturada em Markdown com: 1. Possíveis áreas afetadas. 2. Nível de urgência (Baixo, Médio, Alto). 3. Recomendações iniciais (ex: gelo, repouso, procurar especialista). 4. Perguntas adicionais que o fisioterapeuta pode fazer. Lembre-se: Isso não substitui uma consulta profissional."
        },
        {
          role: "user",
          content: `Analise os seguintes sintomas relatados pelo paciente: "${symptoms}".`
        }
      ],
      model: MODEL,
    });

    return completion.choices[0]?.message?.content || "Não foi possível realizar a triagem no momento.";
  } catch (error: any) {
    console.error("Erro na análise de IA (Groq):", error);
    throw new Error(error.message || "Não foi possível realizar a triagem no momento.");
  }
}

export async function generateMedicalRecord(type: string, notes: string) {
  if (!apiKey || apiKey === "MISSING_API_KEY") {
    throw new Error("Configuração de IA incompleta: VITE_GROQ_API_KEY não encontrada.");
  }
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Você é um assistente especializado em documentação de fisioterapia. Gere um registro profissional baseado nas notas fornecidas, seguindo as melhores práticas da fisioterapia brasileira (CREFITO). Retorne o texto formatado em Markdown profissional."
        },
        {
          role: "user",
          content: `Tipo: ${type}, Notas: "${notes}".`
        }
      ],
      model: MODEL,
    });

    return completion.choices[0]?.message?.content || "Não foi possível gerar a documentação no momento.";
  } catch (error) {
    console.error("Erro na geração de prontuário (Groq):", error);
    throw new Error("Não foi possível gerar a documentação no momento.");
  }
}

export async function generateDocument(type: string, patientName: string, additionalInfo: string) {
  if (!apiKey || apiKey === "MISSING_API_KEY") {
    throw new Error("Configuração de IA incompleta: VITE_GROQ_API_KEY não encontrada.");
  }
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Você é um assistente administrativo para fisioterapeutas. Gere um documento profissional, formal e seguindo as normas brasileiras de saúde. Use Markdown para formatação."
        },
        {
          role: "user",
          content: `Tipo: "${type}", Paciente: "${patientName}", Informações adicionais: ${additionalInfo}`
        }
      ],
      model: MODEL,
    });

    return completion.choices[0]?.message?.content || "Não foi possível gerar o documento no momento.";
  } catch (error) {
    console.error("Erro na geração de documento (Groq):", error);
    throw new Error("Não foi possível gerar o documento no momento.");
  }
}

export async function generateSOAPRecord(rawText: string) {
  if (!apiKey || apiKey === "MISSING_API_KEY") {
    throw new Error("Configuração de IA incompleta: VITE_GROQ_API_KEY não encontrada.");
  }
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Você é um Arquiteto de Software e Consultor HealthTech Sênior especializado em Fisioterapia. Converta o relato bruto no padrão SOAP (Subjetivo, Objetivo, Avaliação, Plano). Retorne um objeto JSON com as chaves: 'subjective', 'objective', 'assessment', 'plan'."
        },
        {
          role: "user",
          content: `Relato Bruto: "${rawText}"`
        }
      ],
      model: MODEL,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Resposta da IA inválida");
    
    try {
      const cleanJson = content.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("Erro ao parsear JSON SOAP:", content);
      throw new Error("Formato de resposta inválido.");
    }
  } catch (error: any) {
    console.error("Erro na geração de SOAP (Groq):", error);
    throw new Error(error.message || "Não foi possível estruturar o prontuário SOAP no momento.");
  }
}

export async function summarizePatientHistory(history: string) {
  if (!apiKey || apiKey === "MISSING_API_KEY") {
    throw new Error("Configuração de IA incompleta: VITE_GROQ_API_KEY não encontrada.");
  }
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Você é um assistente sênior de fisioterapia. Resuma o histórico de atendimentos do paciente em um parágrafo conciso, destacando a evolução clínica, principais queixas e progresso no tratamento. Use uma linguagem profissional e técnica."
        },
        {
          role: "user",
          content: `Histórico de Prontuários: "${history}"`
        }
      ],
      model: MODEL,
    });

    return completion.choices[0]?.message?.content || "Não foi possível gerar o resumo no momento.";
  } catch (error: any) {
    console.error("Erro no resumo de histórico (Groq):", error);
    throw new Error(error.message || "Não foi possível gerar o resumo do histórico no momento.");
  }
}

export async function generateTriageReport(data: any) {
  if (!apiKey || apiKey === "MISSING_API_KEY") {
    throw new Error("Configuração de IA incompleta: VITE_GROQ_API_KEY não encontrada.");
  }

  try {
    const prompt = `
      # PERSONA
      Você é o "FisioCare Intelligence", um assistente de triagem clínica de alta performance para a plataforma FisioCareHub. Sua missão é transformar dados brutos de um formulário em um relatório de raciocínio clínico que auxilie o fisioterapeuta na tomada de decisão rápida e segura.

      # DIRETRIZES DE ANÁLISE (O SEU RACIOCÍNIO)
      1. CRUZAMENTO ERGONÔMICO: Relacione a profissão e a atividade física do paciente com a queixa atual. (Ex: Cuidadores de idosos têm alta carga compressiva em ombros e lombar).
      2. FILTRO DE GRAVIDADE: Identifique "Red Flags" (febre, perda de peso inexplicada, fraqueza progressiva, perda de controle esfincteriano) e destaque-os com prioridade máxima.
      3. PADRÃO DA DOR: Analise se a dor é mecânica (melhora com repouso), inflamatória ou neurogênica.
      4. FOCO NO DOMICÍLIO: Como o FisioCareHub é focado em Home Care, priorize orientações de segurança para o ambiente domiciliar.

      # DADOS DO PACIENTE:
      - Idade: ${data.idade}
      - Sexo: ${data.sexo}
      - Profissão: ${data.profissao}
      - Atividade Física: ${data.atividade_fisica}
      
      # QUEIXA:
      - Região: ${data.regiao_dor}
      - Início: ${data.inicio_sintomas}
      - Tempo: ${data.tempo_sintomas}
      - Escala de Dor: ${data.escala_dor}/10
      
      # HISTÓRICO:
      - Fisioterapia anterior: ${data.historico_clinico.fisioterapia_anterior ? 'Sim' : 'Não'}
      - Diagnóstico médico: ${data.historico_clinico.diagnostico_medico ? 'Sim' : 'Não'}
      - Exames: ${data.historico_clinico.exames_imagem.join(', ')}
      - Doenças: ${data.doencas_preexistentes.join(', ')}
      
      # AVALIAÇÃO FUNCIONAL:
      - Movimentos normais: ${data.avaliacao_funcional.movimentos_normais ? 'Sim' : 'Não'}
      - Piora com movimento: ${data.avaliacao_funcional.piora_movimento ? 'Sim' : 'Não'}
      - Melhora com repouso: ${data.avaliacao_funcional.melhora_repouso ? 'Sim' : 'Não'}
      - Limitação atividades: ${data.avaliacao_funcional.limitacao_atividades}
      
      # RED FLAGS:
      - Febre: ${data.red_flags.febre ? 'Sim' : 'Não'}
      - Perda de peso: ${data.red_flags.perda_peso ? 'Sim' : 'Não'}
      - Fraqueza progressiva: ${data.red_flags.fraqueza ? 'Sim' : 'Não'}
      - Perda de sensibilidade: ${data.red_flags.sensibilidade ? 'Sim' : 'Não'}
      - Perda de controle (urinário/intestinal): ${data.red_flags.controle_urinario ? 'Sim' : 'Não'}
      - Dor intensa à noite: ${data.red_flags.dor_noturna ? 'Sim' : 'Não'}

      # FORMATO DE SAÍDA (MARKDOWN PARA O CAMPO 'relatorio')
      Você deve gerar o relatório EXATAMENTE neste formato para o campo 'relatorio':

      ## 📑 Relatório de Triagem Inteligente
      **Paciente:** [Idade] anos, [Sexo] | **Profissão:** [Profissão]
      **Região Principal:** [Região] | **Intensidade:** [Escala de Dor]/10

      ---

      ### 🔍 Análise Clínica Sugerida
      *Descreva em 2 ou 3 frases a correlação entre a atividade do paciente, o início dos sintomas e o provável comportamento do tecido (ex: sobrecarga mecânica ou fase inflamatória).*

      ### ⚠️ Alertas e Gravidade (Red/Yellow Flags)
      - **Status:** [Ex: Gravidade Moderada / Atenção Imediata]
      - **Observação:** [Destaque pontos como "Fraqueza Progressiva" ou "Dor 8/10". Se não houver alertas graves, informe "Sem Red Flags evidentes"].

      ### 💡 Plano de Ataque para o Fisioterapeuta
      *Sugira o que o profissional deve focar na primeira visita:*
      * **Testes Prioritários:** [Liste 2 ou 3 testes ortopédicos ou funcionais específicos para a região].
      * **Foco da Avaliação:** [Ex: Avaliar amplitude passiva vs ativa, ou estabilidade de CORE].

      ### 🏠 Orientações para o Paciente (Home Care)
      * Forneça uma orientação breve e segura (Ex: Evitar carregar peso com o braço afetado até a avaliação presencial).

      ---
      *Aviso: Este relatório é um suporte à decisão e não substitui a avaliação física presencial.*

      # REQUISITO TÉCNICO
      Retorne obrigatoriamente um JSON com o seguinte formato:
      {
        "classificacao": "string",
        "gravidade": "string",
        "red_flag_detected": boolean,
        "relatorio": "string (markdown seguindo o formato acima)"
      }
    `;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Você é o FisioCare Intelligence. Você deve sempre responder em formato JSON válido conforme as instruções."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: MODEL,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Resposta da IA inválida");
    
    try {
      const cleanJson = content.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("Erro ao parsear JSON Triagem:", content);
      throw new Error("A IA retornou um formato inválido. Por favor, tente novamente.");
    }
  } catch (error: any) {
    console.error("Erro na geração de triagem (Groq):", error);
    throw new Error(error.message || "Não foi possível realizar a triagem no momento.");
  }
}
