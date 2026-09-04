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

const MODEL = "openai/gpt-oss-120b";

export async function analyzeSymptoms(symptoms: string) {
  const client = getGroqClient();
  if (!client) {
    throw new Error("Configuração de IA incompleta: VITE_GROQ_API_KEY não encontrada. Por favor, configure a chave de API nas configurações do projeto.");
  }

  try {
    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: "Você é um assistente de triagem de fisioterapia inteligente. Forneça uma análise estruturada em Markdown com: 1. Possíveis áreas afetadas. 2. Nível de urgência (Baixo, Médio, Alto). 3. Recomendações iniciais. 4. Perguntas adicionais. Isso não substitui consulta profissional." },
        { role: "user", content: `Analise os seguintes sintomas relatados pelo paciente: "${symptoms}".` }
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
        { role: "system", content: "Você é um assistente especializado em documentação de fisioterapia. Gere um registro profissional baseado nas notas fornecidas, seguindo as melhores práticas da fisioterapia brasileira (CREFITO). Retorne o texto formatado em Markdown profissional." },
        { role: "user", content: `Tipo: ${type}, Notas: "${notes}".` }
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
        { role: "system", content: `Você é um assistente administrativo para fisioterapeutas no Brasil. Gere documentos claros, formais e úteis para apoio administrativo. Não invente CREFITO, CPF, endereço, valores, datas ou forma de pagamento. Se algum dado obrigatório não foi informado, deixe indicado como "Não informado". Use português brasileiro. Retorne texto profissional em Markdown.` },
        { role: "user", content: `Tipo de documento: ${type}\nPaciente: ${patientName}\nInformações adicionais: ${additionalInfo}` }
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

  const normalizedText = rawText.trim();
  if (!normalizedText) throw new Error("Relato do atendimento vazio.");

  try {
    const completion = await client.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Você é um fisioterapeuta especialista em documentação clínica. Converta o relato bruto no padrão SOAP.

Retorne SOMENTE um objeto JSON válido, sem Markdown, sem texto antes ou depois, usando exatamente estas quatro chaves:
{"subjective":"...","objective":"...","assessment":"...","plan":"..."}

Não invente dados clínicos ausentes. Quando uma informação não estiver no relato, escreva "Não informado no relato".
- subjective: queixa, sintomas, evolução e percepção do paciente.
- objective: somente achados observáveis, testes ou medidas realmente informados.
- assessment: interpretação fisioterapêutica baseada apenas nos dados disponíveis.
- plan: condutas, orientações e próximos passos mencionados ou justificáveis pelo relato.

Use português brasileiro e linguagem clínica profissional.`
        },
        { role: "user", content: `Relato bruto do atendimento:\n${normalizedText}` }
      ],
      model: MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Resposta da IA inválida.");
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== "object") throw new Error("A IA não retornou um objeto SOAP válido.");

    return {
      subjective: typeof parsed.subjective === "string" ? parsed.subjective.trim() : "Não informado no relato",
      objective: typeof parsed.objective === "string" ? parsed.objective.trim() : "Não informado no relato",
      assessment: typeof parsed.assessment === "string" ? parsed.assessment.trim() : "Não informado no relato",
      plan: typeof parsed.plan === "string" ? parsed.plan.trim() : "Não informado no relato",
    };
  } catch (error: any) {
    console.error("Erro na geração de SOAP (Groq):", error);
    throw new Error(error?.message || "Não foi possível estruturar o prontuário SOAP no momento.");
  }
}

export async function summarizePatientHistory(history: string) {
  const client = getGroqClient();
  if (!client) throw new Error("Configuração de IA incompleta.");
  try {
    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: "Você é um assistente sênior de fisioterapia. Resuma o histórico de atendimentos do paciente em um parágrafo conciso, destacando a evolução clínica, principais queixas e progresso no tratamento. Use linguagem profissional e técnica." },
        { role: "user", content: `Histórico de Prontuários: "${history}"` }
      ],
      model: MODEL,
    });
    return completion.choices[0]?.message?.content || "Não foi possível resumir o histórico no momento.";
  } catch (error) {
    console.error("Erro ao resumir histórico (Groq):", error);
    throw new Error("Não foi possível resumir o histórico no momento.");
  }
}

export async function generateTriageReport(data: any) {
  const client = getGroqClient();
  if (!client) throw new Error("Configuração de IA incompleta: VITE_GROQ_API_KEY não encontrada. Por favor, configure a chave de API nas configurações do projeto.");

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
        { role: "system", content: "Você é o Especialista de Triagem do FisioCareHub. Responda sempre em formato JSON válido, sem blocos de código Markdown." },
        { role: "user", content: prompt }
      ],
      model: MODEL,
      response_format: { type: "json_object" }
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Resposta da IA inválida");
    return JSON.parse(content.replace(/```json\n?|```/g, '').trim());
  } catch (error: any) {
    console.error("Erro na geração de triagem (Groq):", error);
    if (error.status === 401) throw new Error("Chave de API do Groq inválida ou expirada. Verifique as configurações.");
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
        { role: "user", content: `Título: ${title}\nDescrição: ${description}` }
      ],
      model: MODEL,
    });
    return completion.choices[0]?.message?.content?.trim() || "Reabilitação";
  } catch (error) {
    console.error("Error categorizing content (Groq):", error);
    return "Reabilitação";
  }
}
