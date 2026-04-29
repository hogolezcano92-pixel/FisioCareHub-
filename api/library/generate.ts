import type { VercelRequest, VercelResponse } from '@vercel/node';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string, fallback: string): string => {
  const value = process.env[key];
  if (!value) return fallback;
  const trimmed = value.trim();
  if (trimmed === "undefined" || trimmed === "null" || trimmed === "") return fallback;
  return trimmed;
};

const getSupabaseAdmin = () => {
  const supabaseUrl = getEnv("VITE_SUPABASE_URL", "https://exciqetztunqgxbwwodo.supabase.co");
  const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  
  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

const getGroqClient = () => {
  const apiKey = process.env.VITE_GROQ_API_KEY;
  if (!apiKey) return null;
  return new Groq({ apiKey });
};

function sanitizeStrict(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim();
}

async function generateLibraryContentAI(theme: string, type: string, level: string) {
  const client = getGroqClient();
  if (!client) throw new Error("Configuração de IA (GROQ) incompleta.");

  const prompt = `
    Você é um especialista em fisioterapia senior e criador de conteúdo educacional.
    Gere um conteúdo técnico-educacional completo para pacientes.

    TEMA: ${theme}
    TIPO: ${type}
    NÍVEL: ${level}

    O conteúdo deve seguir RIGOROSAMENTE este formato JSON:
    {
      "title": "Titulo sem acentos ou simbolos",
      "topic": "Tema clinico sem acentos",
      "complexity": "low",
      "content": {
        "description": "Uma breve introdução motivadora para o paciente (máx 200 caracteres)",
        "clinical_objective": "Objetivo sem acentos e sem caracteres especiais apenas letras e numeros",
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
               "steps": ["Descreva o passo 1 claramente", "Descreva o passo 2 claramente", "Descreva o passo 3 claramente"]
            }
          },
          {
            "type": "alert",
            "content": {
              "message": "Cuidados importantes e sinais de alerta para procurar o profissional."
            }
          }
        ]
      }
    }

    REGRAS CRITICAS DE VALIDACAO:
    1. O campo "clinical_objective" e "title" NAO podem ter acentos, cedilhas ou símbolos (&, :, %, /, -, etc). 
    2. Use apenas letras básicas (A-Z), números e espaços nesses campos.
    3. A complexidade DEVE ser exatamente uma destas strings: low, medium, high.
    4. Retorne apenas o JSON.
  `;

  const completion = await client.chat.completions.create({
    messages: [
      { role: "system", content: "Você é um assistente de IA que fornece apenas respostas em formato JSON válido, sem explicações adicionais. Obedeça estritamente as regras de caracteres simples." },
      { role: "user", content: prompt }
    ],
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" }
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error("Resposta da IA vazia");
  
  const parsed = JSON.parse(text);
  
  if (parsed.title) parsed.title = sanitizeStrict(parsed.title);
  if (parsed.topic) parsed.topic = sanitizeStrict(parsed.topic);
  if (parsed.clinical_objective) parsed.clinical_objective = sanitizeStrict(parsed.clinical_objective);
  if (parsed.content?.clinical_objective) parsed.content.clinical_objective = sanitizeStrict(parsed.content.clinical_objective);
  
  if (!parsed.title) parsed.title = `Guia de ${sanitizeStrict(theme)}`;
  if (!parsed.topic) parsed.topic = sanitizeStrict(theme);
  if (!['low', 'medium', 'high'].includes(parsed.complexity)) parsed.complexity = 'low';
  
  return parsed;
}

const CATEGORY_PRESETS = [
  { name: 'Exercicios e Reabilitacao', price: 35.99, image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80&w=800' },
  { name: 'Dor Lombar', price: 45.99, image: 'https://images.unsplash.com/photo-1591258739299-5b65d5cbb235?auto=format&fit=crop&q=80&w=800' },
  { name: 'Lesoes Esportivas', price: 50.00, image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=800' },
  { name: 'Postura', price: 18.99, image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800' },
  { name: 'Mobilidade', price: 25.99, image: 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?auto=format&fit=crop&q=80&w=800' },
  { name: 'Recuperacao Pos-Cirurgica', price: 65.99, image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800' }
];

const calculateLibraryPrice = (complexity: string, topic: string, theme: string) => {
  const normalizedTheme = sanitizeStrict(theme).toLowerCase();
  const normalizedTopic = sanitizeStrict(topic).toLowerCase();

  // Check for exact category matches first
  for (const preset of CATEGORY_PRESETS) {
    const normalizedPreset = sanitizeStrict(preset.name).toLowerCase();
    if (normalizedTheme.includes(normalizedPreset) || normalizedTopic.includes(normalizedPreset)) {
      return Math.round(preset.price * 100);
    }
  }

  // Fallback to dynamic pricing
  let base = 990;
  const comp = String(complexity || 'low').toLowerCase();
  if (comp === 'medium') base = 1990;
  if (comp === 'high') base = 2990;

  const topicUpper = String(topic || '').toUpperCase();
  const premiumKeywords = ["UTI", "CARDIORRESPIRATÓRIO", "NEUROLÓGICO", "PÓS-OPERATÓRIO", "CARDIO", "NEURO"];
  const isPremium = premiumKeywords.some(kw => topicUpper.includes(kw));
  if (isPremium) base += 2000;

  return base;
};

const resolveCoverImage = (topic: string, theme: string) => {
  const normalizedTheme = sanitizeStrict(theme).toLowerCase();
  const normalizedTopic = sanitizeStrict(topic).toLowerCase();

  for (const preset of CATEGORY_PRESETS) {
    const normalizedPreset = sanitizeStrict(preset.name).toLowerCase();
    if (normalizedTheme.includes(normalizedPreset) || normalizedTopic.includes(normalizedPreset)) {
      return preset.image;
    }
  }

  return `https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1000&auto=format&fit=crop`;
};

const resolveCategory = (topic: string, theme: string) => {
  const normalizedTheme = sanitizeStrict(theme).toLowerCase();
  const normalizedTopic = sanitizeStrict(topic).toLowerCase();

  for (const preset of CATEGORY_PRESETS) {
    const normalizedPreset = sanitizeStrict(preset.name).toLowerCase();
    if (normalizedTheme.includes(normalizedPreset) || normalizedTopic.includes(normalizedPreset)) {
      return preset.name.replace(/Reabilitacao/g, 'Reabilitação').replace(/Pos-Cirurgica/g, 'Pós-Cirúrgica');
    }
  }

  return 'Reabilitação';
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { theme, type, level } = req.body;
    if (!theme || !type || !level) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const aiResponse = await generateLibraryContentAI(theme, type, level);
    const priceCents = calculateLibraryPrice(aiResponse.complexity, aiResponse.topic, theme);
    const coverImage = resolveCoverImage(aiResponse.topic, theme);
    const category = resolveCategory(aiResponse.topic, theme);

    const supabase = getSupabaseAdmin();
    const { data: material, error } = await supabase
      .from('library_materials')
      .insert({
        title: aiResponse.title,
        topic: aiResponse.topic,
        complexity: aiResponse.complexity,
        price_cents: priceCents,
        price: priceCents / 100,
        description: aiResponse.content.description || aiResponse.content.clinical_objective || "Sem descrição",
        clinical_objective: aiResponse.content.clinical_objective || "Objetivo Clínico",
        sections: aiResponse.content.sections,
        level: (level || 'beginner').toLowerCase(),
        type: (type || 'educational').toLowerCase(),
        category: category,
        is_premium: priceCents > 0,
        cover_image: coverImage
      })
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(material);
  } catch (err: any) {
    console.error("[Library Generate API Error]:", err);
    res.status(500).json({ error: err.message });
  }
}
