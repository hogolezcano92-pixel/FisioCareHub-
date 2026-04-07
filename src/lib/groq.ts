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
    return JSON.parse(content);
  } catch (error: any) {
    console.error("Erro na geração de SOAP (Groq):", error);
    throw new Error(error.message || "Não foi possível estruturar o prontuário SOAP no momento.");
  }
}
