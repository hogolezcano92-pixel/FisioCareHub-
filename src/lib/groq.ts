import Groq from "groq-sdk";

// Lazy initialization to ensure environment variables are loaded
let groqInstance: Groq | null = null;

function getGroqClient() {
  if (groqInstance) return groqInstance;

  const apiKey = import.meta.env.VITE_GROQ_API_KEY || (typeof process !== 'undefined' ? process.env.VITE_GROQ_API_KEY : undefined);
  
  if (!apiKey || apiKey === "MISSING_API_KEY") {
    console.error("VITE_GROQ_API_KEY não encontrada nas variáveis de ambiente.");
    return null;
  }

  groqInstance = new Groq({
    apiKey,
    dangerouslyAllowBrowser: true
  });
  
  return groqInstance;
}

const MODEL = "llama-3.3-70b-versatile";

export async function analyzeSymptoms(symptoms: string) {
  const client = getGroqClient();
  if (!client) {
    throw new Error("Configuração de IA incompleta: VITE_GROQ_API_KEY não encontrada. Por favor, configure a chave de API nas configurações do projeto.");
  }

  try {
    const completion = await client.chat.completions.create({
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
  const client = getGroqClient();
  if (!client) throw new Error("Configuração de IA incompleta.");

  try {
    const completion = await client.chat.completions.create({
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
  const client = getGroqClient();
  if (!client) throw new Error("Configuração de IA incompleta.");

  try {
    const completion = await client.chat.completions.create({
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
  const client = getGroqClient();
  if (!client) throw new Error("Configuração de IA incompleta.");

  try {
    const completion = await client.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Você é um Arquiteto de Software e Consultor HealthTech Sênior especializado em Fisioterapia. Converta o relato bruto no padrão SOAP (Subjetivo, Objetivo, Avaliação, Plano). Retorne um objeto JSON onde TODAS as chaves ('subjective', 'objective', 'assessment', 'plan') DEVEM ter valores do tipo STRING. Não use objetos ou arrays aninhados."
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
  const client = getGroqClient();
  if (!client) throw new Error("Configuração de IA incompleta.");

  try {
    const completion = await client.chat.completions.create({
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
  const client = getGroqClient();
  if (!client) {
    throw new Error("Configuração de IA incompleta: VITE_GROQ_API_KEY não encontrada. Por favor, configure a chave de API nas configurações do projeto.");
  }

  const prompt = `
    Você é o Especialista de Triagem do FisioCareHub. Sua função é processar dados de pacientes e gerar um relatório de Raciocínio Clínico Fisioterapêutico de alto nível.

    # DADOS DO PACIENTE
    - Idade: ${data.idade} | Sexo: ${data.sexo} | Profissão: ${data.profissao}
    - Região da Dor: ${data.regiao_dor}
    - Início: ${data.inicio_sintomas} | Tempo: ${data.tempo_sintomas}
    - Escala de Dor: ${data.escala_dor}/10
    - Limitação Funcional: ${data.avaliacao_funcional?.limitacao_atividades || 'Não informada'}
    - Perguntas Específicas da Região: ${JSON.stringify(data.perguntas_especificas || {})}
    - Red Flags: ${JSON.stringify(data.red_flags || {})}
    - Histórico: ${JSON.stringify(data.historico_clinico || {})}
    - Doenças: ${Array.isArray(data.doencas_preexistentes) ? data.doencas_preexistentes.join(', ') : 'Nenhuma'}

    # OBJETIVOS DA ANÁLISE
    1. CLASSIFICAÇÃO CLÍNICA: Musculoesquelético, Neurológico, Cardiorrespiratório, Pós-operatório ou Esportivo.
    2. SCORE DE GRAVIDADE: Verde (Leve), Amarelo (Moderado) ou Vermelho (Alto Risco/Red Flags).
    3. HIPÓTESES FUNCIONAIS: Liste no máximo 3 hipóteses baseadas na biomecânica e sintomas.
    4. TRIAGEM DE SEGURANÇA: Destaque Red Flags se houver.

    # FORMATO DE SAÍDA (JSON)
    {
      "classificacao": "string",
      "gravidade": "Verde | Amarelo | Vermelho",
      "red_flag_detected": boolean,
      "relatorio": "Markdown string"
    }

    # ESTRUTURA DO RELATÓRIO (Markdown)
    ## 📑 Resumo da Triagem
    - **Região:** ${data.regiao_dor}
    - **Tempo:** ${data.tempo_sintomas}
    - **Dor:** ${data.escala_dor}/10
    - **Limitação:** ${data.avaliacao_funcional?.limitacao_atividades || 'Não informada'}

    ### 🔍 Análise Clínica Inicial
    [Análise técnica unindo idade, ocupação e comportamento dos sintomas].

    ### 💡 Hipóteses Funcionais
    1. [Hipótese 1]
    2. [Hipótese 2]
    3. [Hipótese 3]

    ### 🚨 Triagem de Risco
    - **Classificação:** [Classificação Clínica]
    - **Gravidade:** [Score]
    - **Red Flags:** [Detalhes se houver]

    ### 🩺 Sugestões de Avaliação
    *O que o fisioterapeuta deve priorizar:*
    - [Sugestão 1]
    - [Sugestão 2]

    ### 🏠 Recomendações Iniciais
    - [Recomendação 1]
    - [Recomendação 2]

    ---
    *Aviso: Suporte à decisão profissional. Imprescindível avaliação física.*
  `;

  try {
    const completion = await client.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Você é o Especialista de Triagem do FisioCareHub. Você deve sempre responder em formato JSON válido conforme as instruções. Não inclua blocos de código markdown, apenas o JSON puro."
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
      // Tenta limpar possíveis marcações de markdown se a IA ignorar o system prompt
      const cleanJson = content.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("Erro ao parsear JSON Triagem:", content);
      throw new Error("A IA retornou um formato inválido. Por favor, tente novamente.");
    }
  } catch (error: any) {
    console.error("Erro na geração de triagem (Groq):", error);
    
    // Se for erro de autenticação, fornece mensagem clara
    if (error.status === 401) {
      throw new Error("Chave de API do Groq inválida ou expirada. Verifique as configurações.");
    }
    
    throw new Error(error.message || "Não foi possível realizar a triagem no momento.");
  }
}

export async function categorizeContent(title: string, description: string) {
  const client = getGroqClient();
  if (!client) return "Reabilitação";

  try {
    const completion = await client.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Você é um especialista em fisioterapia e saúde. Sua tarefa é categorizar um conteúdo educativo para uma biblioteca de saúde.
          
          Categorias Disponíveis:
          - Dor Lombar
          - Lesões Esportivas
          - Postura
          - Mobilidade
          - Recuperação Pós-Cirúrgica
          - Reabilitação
          
          Retorne APENAS o nome da categoria que melhor se encaixa em texto puro. Se nenhuma se encaixar perfeitamente, retorne "Reabilitação".`
        },
        {
          role: "user",
          content: `Título: ${title}\nDescrição: ${description}`
        }
      ],
      model: MODEL,
    });

    return completion.choices[0]?.message?.content?.trim() || "Reabilitação";
  } catch (error) {
    console.error("Error categorizing content (Groq):", error);
    return "Reabilitação";
  }
}

export async function generateLibraryContent(theme: string, type: string, level: string) {
  const client = getGroqClient();
  if (!client) throw new Error("Configuração de IA incompleta.");

  const prompt = `
    Você é um especialista em fisioterapia senior e criador de conteúdo educacional.
    Gere um conteúdo técnico-educacional completo e interativo para pacientes.

    TEMA: ${theme}
    TIPO: ${type}
    NÍVEL: ${level}

    O conteúdo deve seguir rigorosamente este formato JSON:
    {
      "title": "Título impactante",
      "category": "Uma das: Dor Lombar, Lesões Esportivas, Postura, Mobilidade, Recuperação Pós-Cirúrgica, Reabilitação",
      "description": "Uma breve introdução motivadora para o paciente (máx 200 caracteres)",
      "clinical_objective": "O objetivo terapêutico principal deste material",
      "sections": [
        {
          "type": "text",
          "content": {
            "title": "Explicação do Problema",
            "body": "Texto detalhado sobre as causas e sintomas comuns."
          }
        },
        {
          "type": "step-by-step",
          "content": {
             "steps": ["Primeiro passo prático ou exercício", "Segundo passo...", "Dica prática do dia a dia"]
          }
        },
        {
          "type": "alert",
          "content": {
            "message": "Cuidados importantes e sinal vermelho para procurar ajuda."
          }
        }
      ]
    }

    Garanta que os exercícios sejam descritos de forma clara para que o paciente consiga fazer sozinho com segurança.
    IMPORTANTE: Retorne APENAS o JSON puro, sem blocos de código ou explicações.
  `;

  try {
    const completion = await client.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Você é um assistente de IA que fornece apenas respostas em formato JSON válido."
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
    if (!content) throw new Error("Resposta da IA vazia");
    
    return JSON.parse(content);
  } catch (error: any) {
    console.error("Error generating content (Groq):", error);
    throw new Error(error.message || "Não foi possível gerar o conteúdo no momento.");
  }
}
