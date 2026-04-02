import { GoogleGenAI } from "npm:@google/genai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, payload } = await req.json()
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set")
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
    const model = "gemini-3-flash-preview"

    let resultText = ""

    if (action === "analyzeSymptoms") {
      const { symptoms } = payload
      const prompt = `Você é um assistente de triagem de fisioterapia inteligente. 
      Analise os seguintes sintomas relatados pelo paciente: "${symptoms}".
      
      Forneça uma análise estruturada em Markdown com:
      1. Possíveis áreas afetadas.
      2. Nível de urgência (Baixo, Médio, Alto).
      3. Recomendações iniciais (ex: gelo, repouso, procurar especialista).
      4. Perguntas adicionais que o fisioterapeuta pode fazer.
      
      Lembre-se: Isso não substitui uma consulta profissional.`

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      })
      resultText = response.text
    } else if (action === "generateMedicalRecord") {
      const { type, notes } = payload
      const prompt = `Você é um assistente especializado em documentação de fisioterapia.
      Gere um registro profissional de ${type} baseado nestas notas breves: "${notes}".
      
      O registro deve ser estruturado, técnico e seguir as melhores práticas da fisioterapia brasileira (CREFITO).
      
      Se o tipo for "Avaliação Físico-Funcional", inclua seções como:
      - Queixa Principal
      - HMA (História da Moléstia Atual)
      - Exame Físico (Inspeção, Palpação, Testes Específicos)
      - Diagnóstico Fisioterapêutico
      
      Se o tipo for "Tratamento", inclua:
      - Objetivos do Tratamento
      - Conduta Fisioterapêutica (Exercícios, Recursos, Frequência)
      
      Se o tipo for "Evolução", inclua:
      - Estado atual do paciente
      - Resposta ao tratamento anterior
      - Ajustes na conduta
      
      Retorne o texto formatado em Markdown profissional.`

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      })
      resultText = response.text
    } else if (action === "generateDocument") {
      const { type, patientName, additionalInfo } = payload
      const prompt = `Você é um assistente administrativo para fisioterapeutas. 
      Gere um documento do tipo "${type || 'Documento Geral'}" para o paciente "${patientName}".
      Informações adicionais: ${additionalInfo}
      O documento deve ser profissional, formal e seguir as normas brasileiras de saúde.
      Use Markdown para formatação.`

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      })
      resultText = response.text
    } else {
      // Caso genérico: Deixa o Gemini decidir o que fazer com base na action e payload
      const prompt = `Você é o assistente inteligente do FisioCareHub, um sistema para fisioterapeutas.
      Ação solicitada: "${action}"
      Dados fornecidos: ${JSON.stringify(payload)}
      
      Por favor, execute a ação solicitada de forma profissional, técnica e útil para um fisioterapeuta.
      Use Markdown para formatar a resposta.`

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      })
      resultText = response.text
    }

    return new Response(JSON.stringify({ text: resultText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
