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
          content: `Você é um assistente administrativo para fisioterapeutas no Brasil. Gere documentos claros, formais e úteis para apoio administrativo.

REGRAS IMPORTANTES:
- Não invente CREFITO, CPF, endereço, valores, datas ou forma de pagamento.
- Se algum dado obrigatório não foi informado, deixe indicado como "Não informado".
- Use português brasileiro.
- Retorne texto profissional em Markdown.`
        },
        {
          role: "user",
          content: `Tipo de documento: ${type}\nPaciente: ${patientName}\nInformações adicionais: ${additionalInfo}`
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

  const normalizedText = rawText.trim();
  if (!normalizedText) throw new Error("Relato do atendimento vazio.");

  try {
    const completion = await client.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Você é um fisioterapeuta especialista em documentação clínica. Converta o relato bruto no padrão SOAP. Não invente dados clínicos ausentes. Quando uma informação não estiver no relato, escreva 'Não informado'. Em S registre relato/queixa do paciente; em O, achados observáveis ou mensuráveis; em A, interpretação fisioterapêutica baseada apenas nos dados disponíveis; em P, condutas e próximos passos mencionados ou justificáveis pelo relato."
        },
        {
          role: "user",
          content: `Relato bruto do atendimento:\n${normalizedText}`
        }
      ],
      model: MODEL,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "soap_record",
          strict: true,
          schema: {
            type: "object",
            properties: {
              subjective: { type: "string" },
              objective: { type: "string" },
              assessment: { type: "string" },
              plan: { type: "string" }
            },
            required: ["subjective", "objective", "assessment", "plan"],
            additionalProperties: false
          }
        }
      }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Resposta da IA inválida.");

    const parsed = JSON.parse(content);
    return {
      subjective: String(parsed.subjective).trim(),
      objective: String(parsed.objective).trim(),
      assessment: String(parsed.assessment).trim(),
      plan: String(parsed.plan).trim(),
    };
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

    return completion.choices[0]?.message?.content || "Não foi possível resumir o histórico no momento.";
  } catch (error: any) {
    console.error("Erro ao resumir histórico (Groq):", error);
    throw new Error("Não foi possível resumir o histórico no momento.");
  }
}
