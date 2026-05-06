import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import twilio from "twilio";
import Groq from "groq-sdk";
import axios from "axios";
import { Resend } from 'resend';
import { generateEmailHTML } from './src/services/emailService.ts';
import { 
  generateRegistrationOptions, 
  verifyRegistrationResponse, 
  generateAuthenticationOptions, 
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';

dotenv.config();

let groqInstance: Groq | null = null;
const getGroqClient = () => {
  if (!groqInstance) {
    const apiKey = process.env.VITE_GROQ_API_KEY;
    if (!apiKey) return null;
    groqInstance = new Groq({ apiKey });
  }
  return groqInstance;
};

async function generateLibraryContentAI(theme: string, type: string, level: string) {
  const client = getGroqClient();
  if (!client) throw new Error("Configuração de IA (GROQ) incompleta no servidor.");

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

  try {
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
    
    // Sanitização forçada no Backend
    if (parsed.title) parsed.title = sanitizeStrict(parsed.title);
    if (parsed.topic) parsed.topic = sanitizeStrict(parsed.topic);
    if (parsed.clinical_objective) parsed.clinical_objective = sanitizeStrict(parsed.clinical_objective);
    
    // Check nested content clinical_objective
    if (parsed.content?.clinical_objective) {
      parsed.content.clinical_objective = sanitizeStrict(parsed.content.clinical_objective);
    }
    
    if (!parsed.title) parsed.title = `Guia de ${sanitizeStrict(theme)}`;
    if (!parsed.topic) parsed.topic = sanitizeStrict(theme);
    
    if (!['low', 'medium', 'high'].includes(parsed.complexity)) {
      parsed.complexity = 'low';
    }
    
    if (!parsed.content) throw new Error("Estrutura de conteúdo inválida no JSON da IA");

    return parsed;
  } catch (error) {
    console.error("Error in generateLibraryContentAI:", error);
    throw error;
  }
}

function sanitizeStrict(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-zA-Z0-9\s]/g, "") // Remove símbolos e caracteres especiais
    .trim();
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
  let base = 990; // R$ 9,90
  const comp = String(complexity || 'low').toLowerCase();
  
  if (comp === 'medium') base = 1990;
  if (comp === 'high') base = 2990;

  const topicUpper = String(topic || '').toUpperCase();
  const premiumKeywords = ["UTI", "CARDIORRESPIRATÓRIO", "NEUROLÓGICO", "PÓS-OPERATÓRIO", "CARDIO", "NEURO"];
  
  const isPremium = premiumKeywords.some(kw => topicUpper.includes(kw));
  if (isPremium) {
    base += 2000;
  }

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

let twilioClient: any = null;

const getTwilioClient = () => {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
      console.warn("[Twilio] Credentials missing. WhatsApp messages will be logged but not sent.");
      return null;
    }
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
};

async function sendWhatsAppMessage(to: string, message: string) {
  const from = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";
  const client = getTwilioClient();
  
  // Format "to" to ensure it starts with whatsapp:
  const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  if (!client) {
    console.log(`[Twilio Simulation] To: ${formattedTo}, Msg: ${message}`);
    return { sid: "SIMULATED_" + Date.now() };
  }

  try {
    const result = await client.messages.create({
      from,
      to: formattedTo,
      body: message
    });
    console.log(`[Twilio] Message sent: ${result.sid}`);
    return result;
  } catch (err) {
    console.error("[Twilio] Error sending WhatsApp message:", err);
    throw err;
  }
}

let stripeInstance: Stripe | null = null;
const getStripe = () => {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY || "";
    stripeInstance = new Stripe(key, {
      apiVersion: "2024-12-18.acacia" as any,
    });
  }
  return stripeInstance;
};

const ASAAS_API_KEY = process.env.ASAAS_API_KEY || "";
const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";

const getAsaasHeaders = () => ({
  'Content-Type': 'application/json',
  'access_token': getEnv("ASAAS_API_KEY", "")
});

async function getOrCreateAsaasCustomer(userId: string, email: string, name: string, phone?: string, cpf?: string) {
  try {
    const asaasApiKey = getEnv("ASAAS_API_KEY", "");
    if (!asaasApiKey) {
      throw new Error("ASAAS_API_KEY is not configured.");
    }
    const headers = {
      'Content-Type': 'application/json',
      'access_token': asaasApiKey
    };

    // 1. Try to find in Supabase first
    const { data: profile } = await getSupabaseAdmin()
      .from('perfis')
      .select('asaas_customer_id')
      .eq('id', userId)
      .single();

    if (profile?.asaas_customer_id) return profile.asaas_customer_id;

    const baseUrl = getEnv("ASAAS_BASE_URL", "https://api.asaas.com/v3").trim().replace(/\/$/, "");

    // 2. Search in Asaas by email
    console.log(`[Asaas] Searching customer by email: ${email}`);
    const searchRes = await axios.get(`${baseUrl}/customers?email=${encodeURIComponent(email)}`, { headers });
    const searchData = searchRes.data;

    if (searchData.data && searchData.data.length > 0) {
      const customer = searchData.data[0];
      const customerId = customer.id;
      console.log(`[Asaas] Found existing customer: ${customerId}`);
      
      // If we have a CPF but the existing customer doesn't, or if we just want to ensure it's synced
      if (cpf && !customer.cpfCnpj) {
        console.log(`[Asaas] Updating existing customer ${customerId} with CPF`);
        try {
          await axios.post(`${baseUrl}/customers/${customerId}`, {
            cpfCnpj: cpf.replace(/\D/g, '')
          }, { headers });
        } catch (updateErr) {
          console.warn("[Asaas] Failed to update customer CPF, continuing anyway:", updateErr);
        }
      }

      // Update Supabase for next time
      await getSupabaseAdmin().from('perfis').update({ asaas_customer_id: customerId }).eq('id', userId);
      return customerId;
    }

    // 3. Create new customer in Asaas
    console.log(`[Asaas] Creating new customer for ${email}`);
    const payload: any = {
      name,
      email,
      phone: phone || '',
      externalReference: userId
    };
    if (cpf) {
      payload.cpfCnpj = cpf.replace(/\D/g, '');
    }

    const createRes = await axios.post(`${baseUrl}/customers`, payload, { headers });
    const newData = createRes.data;

    if (newData.id) {
      console.log(`[Asaas] Customer created: ${newData.id}`);
      await getSupabaseAdmin().from('perfis').update({ asaas_customer_id: newData.id }).eq('id', userId);
      return newData.id;
    }
    
    throw new Error("Erro ao criar cliente no Asaas");
  } catch (err: any) {
    console.error("[Asaas] Error in getOrCreateAsaasCustomer:", err.response?.data || err.message);
    throw err;
  }
}

const getEnv = (key: string, fallback: string): string => {
  const value = process.env[key];
  if (!value) return fallback;
  const trimmed = value.trim();
  if (trimmed === "undefined" || trimmed === "null" || trimmed === "") return fallback;
  return trimmed;
};

let supabaseAdminInstance: any = null;

const getSupabaseAdmin = () => {
  if (!supabaseAdminInstance) {
    const supabaseUrl = getEnv("VITE_SUPABASE_URL", "https://exciqetztunqgxbwwodo.supabase.co");
    const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    
    if (!supabaseServiceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required for this operation.");
    }

    try {
      supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceRoleKey);
    } catch (err) {
      console.error("Failed to initialize Supabase Admin:", err);
      throw new Error("Failed to initialize Supabase client. Check your configuration.");
    }
  }
  return supabaseAdminInstance;
};

async function getCommissionRate(): Promise<number> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('system_settings')
      .select('value')
      .eq('key', 'commission_rate')
      .single();
    
    if (data && data.value) {
      return Number(data.value);
    }
  } catch (err) {
    console.warn("Could not fetch commission rate from DB, using fallback 12%", err);
  }
  return 12; // Fallback default
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Stripe Webhook (Must be before express.json())
  app.post("/api/stripe-webhook", express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`[Webhook] Event Received: ${event.type}`);

    // Handle Subscription/Plan Checkout
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (session.metadata?.type === 'subscription') {
        const userId = session.metadata.user_id;
        const planType = session.metadata.plan;

        console.log(`[Webhook] Subscription confirmed for user ${userId} - Plan: ${planType}`);

        if (userId && planType) {
          try {
            // Update profile in Supabase
            const { error: profileErr } = await getSupabaseAdmin()
              .from('perfis')
              .update({ 
                plan_type: planType,
                subscription_status: 'active',
                plano: planType, // legacy support
                is_pro: planType === 'pro'
              })
              .eq('id', userId);
            
            if (profileErr) console.error("[Webhook] Error updating profile:", profileErr);

            // Update/Insert into assinaturas table
            const { error: subError } = await getSupabaseAdmin()
              .from('assinaturas')
              .upsert({
                user_id: userId,
                plano: planType,
                status: 'ativo',
                valor: session.amount_total ? session.amount_total / 100 : 0,
                data_inicio: new Date().toISOString(),
                data_expiracao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                stripe_checkout_id: session.id
              });
              
            if (subError) console.error("[Webhook] Error updating subscription table:", subError);
          } catch (err) {
            console.error("[Webhook] Crash during subscription update:", err);
          }
        }
      } 
      else if (session.metadata?.type === 'library_purchase_bulk') {
        const userId = session.metadata.user_id;
        const materialIdsString = session.metadata.material_ids;

        if (userId && materialIdsString) {
          const materialIds = materialIdsString.split(',');
          console.log(`[Webhook] Bulk library purchase confirmed for user ${userId} - Materials: ${materialIdsString}`);

          try {
            const purchaseRecords = materialIds.map(id => ({
              patient_id: userId,
              material_id: id,
              purchased_at: new Date().toISOString()
            }));

            const { error: purchaseError } = await getSupabaseAdmin()
              .from('material_purchases')
              .insert(purchaseRecords);
            
            if (purchaseError) console.error("[Webhook] Error recording bulk material purchase:", purchaseError);
          } catch (err) {
            console.error("[Webhook] Crash during bulk library purchase update:", err);
          }
        }
      }
      // Handle legacy single purchase type if it ever happens
      else if (session.metadata?.type === 'library_purchase') {
        const userId = session.metadata.user_id;
        const materialId = session.metadata.material_id;

        if (userId && materialId) {
          try {
            await getSupabaseAdmin()
              .from('material_purchases')
              .insert({
                patient_id: userId,
                material_id: materialId,
                purchased_at: new Date().toISOString()
              });
          } catch (err) {
            console.error("[Webhook] Crash during library purchase update:", err);
          }
        }
      }
      // Handle appointment logic (confirmed via metadata.appointment_id)
      else if (session.metadata?.appointment_id) {
        const appointmentId = session.metadata.appointment_id;
        console.log(`Pagamento confirmado via Checkout para agendamento: ${appointmentId}`);
        
        try {
          // 1. Fetch appointment details
          const { data: appData, error: fetchErr } = await getSupabaseAdmin()
            .from('agendamentos')
            .select(`
              *,
              paciente:perfis!paciente_id (id, nome_completo, email, telefone),
              fisioterapeuta:perfis!fisio_id (id, nome_completo, email, telefone)
            `)
            .eq('id', appointmentId)
            .single();

          if (fetchErr || !appData) {
            console.error("Erro ao buscar agendamento no webhook:", fetchErr);
          } else {
            // 2. Calculations
            const totalPaid = (session.amount_total || 0) / 100;
            const currentRate = await getCommissionRate();
            const commission = totalPaid * (currentRate / 100);
            const netAmount = totalPaid * ((100 - currentRate) / 100);

            // 3. Update appointment status
            await getSupabaseAdmin()
              .from('agendamentos')
              .update({ status: 'confirmado' })
              .eq('id', appointmentId);

            // 4. Create financial record
            const { error: sessionError } = await getSupabaseAdmin()
              .from('sessoes')
              .insert({
                paciente_id: appData.paciente_id,
                fisioterapeuta_id: appData.fisio_id,
                agendamento_id: appointmentId,
                data: appData.data,
                hora: appData.hora,
                valor_sessao: netAmount, 
                status_pagamento: 'pago_app',
                stripe_payment_intent: session.payment_intent as string
              });

            if (sessionError) console.error("Erro ao registrar no financeiro:", sessionError);

            // 5. Notifications
            const formattedDate = new Date(appData.data_servico).toLocaleDateString('pt-BR');
            const formattedTime = new Date(appData.data_servico).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            // WhatsApp Notifications - Payment Approved
            if (appData.paciente.telefone) {
              await sendWhatsAppMessage(
                appData.paciente.telefone,
                `✅ *Pagamento Confirmado!* \n\nOlá ${appData.paciente.nome_completo}, seu pagamento foi processado com sucesso. Sua consulta com o(a) fisioterapeuta ${appData.fisioterapeuta.nome_completo} está oficialmente agendada para ${formattedDate} às ${formattedTime}.\n\nFisioCareHub 🏥`
              );
            }

            if (appData.fisioterapeuta.telefone) {
              await sendWhatsAppMessage(
                appData.fisioterapeuta.telefone,
                `💰 *Pagamento Recebido!* \n\nNovo atendimento confirmado.\n\n👤 *Paciente:* ${appData.paciente.nome_completo}\n📅 *Data:* ${formattedDate}\n⏰ *Hora:* ${formattedTime}\n📍 *Endereço:* ${appData.endereco || 'Consultar no app'}\n\nPrepare-se para o atendimento! 🏥`
              );
            }

            await getSupabaseAdmin().from('notificacoes').insert({
              user_id: appData.fisio_id,
              titulo: 'Novo Agendamento Confirmado',
              mensagem: `${appData.paciente.nome_completo} realizou o pagamento e confirmou o agendamento para o dia ${formattedDate} às ${formattedTime}.`,
              tipo: 'appointment',
              lida: false,
              link: '/appointments'
            });

            // Send Emails
            const baseUrl = process.env.APP_URL || process.env.VITE_APP_URL || "https://fisiocarehub.company";
            
            await getSupabaseAdmin().functions.invoke('Send-email', { 
              body: {
                to: appData.fisioterapeuta.email,
                subject: 'Novo Agendamento Recebido - FisioCareHub',
                appointmentId: appointmentId,
                html: `<h3>Novo Agendamento Confirmado!</h3><p>O paciente <strong>${appData.paciente.nome_completo}</strong> confirmou e pagou o agendamento.</p><p><strong>Data:</strong> ${formattedDate} às ${formattedTime}</p><a href="${baseUrl}/appointments">Ver na Agenda</a>`
              } 
            });
            
            await getSupabaseAdmin().functions.invoke('Send-email', { 
              body: {
                to: appData.paciente.email,
                subject: 'Pagamento Confirmado - FisioCareHub',
                html: `<h3>Pagamento Confirmado!</h3><p>Olá ${appData.paciente.nome_completo}, seu pagamento foi processado com sucesso.</p><p>Sua consulta com <strong>${appData.fisioterapeuta.nome_completo}</strong> está confirmada.</p>`
              }
            });

            // 6. Record in pagamentos table
            await getSupabaseAdmin().from('pagamentos').upsert({
              external_id: session.id,
              user_id: appData.paciente_id,
              external_reference: appointmentId,
              amount: totalPaid,
              status: 'paid',
              gateway: 'stripe',
              method: 'credit_card',
              confirmed_at: new Date().toISOString()
            });
          }
        } catch (err) {
          console.error("[Webhook] Crash during appointment update:", err);
        }
      }
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const sessionId = paymentIntent.metadata.sessionId;

      // Handle library purchase confirmation via PaymentIntent
      if (paymentIntent.metadata?.type === 'library_purchase_bulk') {
        const userId = paymentIntent.metadata.user_id;
        const materialIdsString = paymentIntent.metadata.material_ids;

        if (userId && materialIdsString) {
          const materialIds = materialIdsString.split(',');
          console.log(`[Webhook PI] Bulk library purchase confirmed for user ${userId} - Materials: ${materialIdsString}`);

          try {
            const purchaseRecords = materialIds.map(id => ({
              patient_id: userId,
              material_id: id,
              purchased_at: new Date().toISOString()
            }));

            const { error: purchaseError } = await getSupabaseAdmin()
              .from('material_purchases')
              .insert(purchaseRecords);
            
            if (purchaseError) console.error("[Webhook PI] Error recording bulk material purchase:", purchaseError);
          } catch (err) {
            console.error("[Webhook PI] Crash during bulk library purchase update:", err);
          }
        }
      } else if (sessionId) {
        console.log(`Pagamento aprovado para sessão: ${sessionId}`);
        const { error } = await getSupabaseAdmin()
          .from('sessoes')
          .update({ status_pagamento: 'pago_app' })
          .eq('id', sessionId);
        
        if (error) console.error("Erro ao atualizar status da sessão:", error);
      }
    }

    res.json({ received: true });
  });

  app.use(express.json());

  // --- WebAuthn (Biometric Auth) Implementation ---
  const challenges = new Map<string, string>();
  
  // Helper to get WebAuthn config dynamically from request
  const getWebAuthnConfig = (req: express.Request) => {
    const host = req.get('host') || 'localhost:3000';
    const rpID = host.split(':')[0];
    const protocol = (req.headers['x-forwarded-proto'] as string) || (host.includes('localhost') ? 'http' : 'https');
    const origin = `${protocol}://${host}`;
    return { rpID, origin, rpName: 'FisioCareHub Biometrics' };
  };

  app.get("/api/auth/webauthn/registration-options", async (req, res) => {
    try {
      const accessToken = req.headers.authorization?.split(' ')[1];
      if (!accessToken) return res.status(401).json({ error: "Unauthorized" });

      const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(accessToken);
      if (authError || !user) return res.status(401).json({ error: "Invalid session" });

      const { data: credentials } = await getSupabaseAdmin()
        .from('webauthn_credentials')
        .select('credential_id, transports')
        .eq('user_id', user.id);

      const { rpID, rpName } = getWebAuthnConfig(req);

      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: Buffer.from(user.id), // Ensure it's a Uint8Array
        userName: user.email || user.id,
        attestationType: 'none',
        excludeCredentials: (credentials || []).map(c => ({
          id: c.credential_id,
          type: 'public-key',
          transports: c.transports ? JSON.parse(c.transports) : undefined,
        })),
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
          authenticatorAttachment: 'platform',
        },
      });

      challenges.set(user.id, options.challenge);
      res.json(options);
    } catch (err: any) {
      console.error("[WebAuthn Registration Options] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/webauthn/register", async (req, res) => {
    try {
      const accessToken = req.headers.authorization?.split(' ')[1];
      const { body } = req;
      if (!accessToken) return res.status(401).json({ error: "Unauthorized" });

      const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(accessToken);
      if (authError || !user) return res.status(401).json({ error: "Invalid session" });

      const expectedChallenge = challenges.get(user.id);
      if (!expectedChallenge) return res.status(400).json({ error: "Challenge not found" });

      const { rpID, origin } = getWebAuthnConfig(req);

      const verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: [origin, origin.replace(/\/$/, '')],
        expectedRPID: rpID,
      });

      if (verification.verified && verification.registrationInfo) {
        const { credentialID, credentialPublicKey, counter } = verification.registrationInfo as any;

        const { error: dbError } = await getSupabaseAdmin()
          .from('webauthn_credentials')
          .insert({
            user_id: user.id,
            credential_id: isoBase64URL.fromBuffer(credentialID),
            public_key: isoBase64URL.fromBuffer(credentialPublicKey),
            counter,
            transports: JSON.stringify(body.response.transports || []),
          });

        if (dbError) throw dbError;
        challenges.delete(user.id);
        res.json({ verified: true });
      } else {
        res.status(400).json({ error: "Verification failed" });
      }
    } catch (err: any) {
      console.error("[WebAuthn Register] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/webauthn/login-options", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email required" });

      const { data: profile } = await getSupabaseAdmin()
        .from('perfis')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!profile) return res.status(404).json({ error: "User not found" });

      const { data: credentials } = await getSupabaseAdmin()
        .from('webauthn_credentials')
        .select('credential_id, transports')
        .eq('user_id', profile.id);

      if (!credentials || credentials.length === 0) {
        return res.status(400).json({ error: "No biometric credentials registered" });
      }

      const { rpID } = getWebAuthnConfig(req);

      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: credentials.map(c => ({
          id: c.credential_id,
          type: 'public-key',
          transports: c.transports ? JSON.parse(c.transports) : undefined,
        })),
        userVerification: 'preferred',
      });

      challenges.set(email, options.challenge);
      res.json(options);
    } catch (err: any) {
      console.error("[WebAuthn Login Options] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/webauthn/verify-login", async (req, res) => {
    try {
      const { body, email } = req.body;
      if (!email || !body) return res.status(400).json({ error: "Missing data" });

      const expectedChallenge = challenges.get(email);
      if (!expectedChallenge) return res.status(400).json({ error: "Challenge expired" });

      const { data: profile } = await getSupabaseAdmin()
        .from('perfis')
        .select('id, email')
        .eq('email', email)
        .single();

      const { data: credential } = await getSupabaseAdmin()
        .from('webauthn_credentials')
        .select('*')
        .eq('credential_id', body.id)
        .eq('user_id', profile.id)
        .single();

      if (!credential) return res.status(400).json({ error: "Credential not found" });

      const { rpID, origin } = getWebAuthnConfig(req);

      const verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: [origin, origin.replace(/\/$/, '')],
        expectedRPID: rpID,
        authenticator: {
          credentialID: isoBase64URL.toBuffer(credential.credential_id),
          credentialPublicKey: isoBase64URL.toBuffer(credential.public_key),
          counter: Number(credential.counter),
        },
      } as any);

      if (verification.verified && verification.authenticationInfo) {
        await getSupabaseAdmin()
          .from('webauthn_credentials')
          .update({ counter: (verification.authenticationInfo as any).newCounter })
          .eq('id', credential.id);

        challenges.delete(email);

        const { data: linkData, error: linkError } = await getSupabaseAdmin().auth.admin.generateLink({
          type: 'magiclink',
          email: profile.email,
          options: { redirectTo: `${origin}/dashboard` }
        });

        if (linkError) throw linkError;
        res.json({ verified: true, magicLink: linkData.properties.action_link });
      } else {
        res.status(400).json({ error: "Authentication failed" });
      }
    } catch (err: any) {
      console.error("[WebAuthn Verify Login] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Library Material Deletion (Secure Admin Endpoint)
  app.post("/api/library/delete", async (req, res) => {
    try {
      const { id, accessToken } = req.body;

      if (!id || !accessToken) {
        return res.status(400).json({ error: "Missing material id or access token" });
      }

      // 1. Verify the user and their admin status using the access token
      const supabaseAdmin = getSupabaseAdmin();
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

      if (authError || !user) {
        return res.status(401).json({ error: "Unauthorized access" });
      }

      // Check if user is actually an admin in the database
      const { data: profile } = await supabaseAdmin
        .from('perfis')
        .select('tipo_usuario')
        .eq('id', user.id)
        .single();

      const isAdmin = profile?.tipo_usuario === 'admin' || user.email?.toLowerCase() === 'hogolezcano92@gmail.com';

      if (!isAdmin) {
        return res.status(403).json({ error: "Forbidden: Admin privileges required" });
      }

      // 2. Perform deletion using service role (bypass RLS)
      const { error: deleteError } = await supabaseAdmin
        .from('library_materials')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      res.json({ success: true, message: "Material excluído com sucesso" });
    } catch (err: any) {
      console.error("[Library Delete] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Library Content Generation (Backend Logic)
  app.post("/api/library/generate", async (req, res) => {
    try {
      const { theme, type, level } = req.body;
      if (!theme || !type || !level) {
        return res.status(400).json({ error: "Missing required fields (theme, type, level)" });
      }

      const aiResponse = await generateLibraryContentAI(theme, type, level);
      const priceCents = calculateLibraryPrice(aiResponse.complexity, aiResponse.topic, theme);
      const coverImage = resolveCoverImage(aiResponse.topic, theme);
      const category = resolveCategory(aiResponse.topic, theme);

      const { data: material, error } = await getSupabaseAdmin()
        .from('library_materials')
        .insert({
          title: aiResponse.title,
          topic: aiResponse.topic,
          complexity: aiResponse.complexity,
          price_cents: priceCents,
          price: priceCents / 100, // Sync legacy price column
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

      res.json(material);
    } catch (err: any) {
      console.error("[Library Generate] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Updated Webhook to handle bulk material purchase
  // I will add this to the webhook block later or just update the metadata type check

  // Asaas Webhook (New Path)
  app.post("/api/webhooks/asaas", async (req, res) => {
    console.log("[Asaas Webhook Received - /api/webhooks/asaas]", JSON.stringify(req.body, null, 2));
    res.status(200).send("OK");
  });

  // Asaas Webhook (Detailed Handler)
  app.post("/api/asaas/webhook", async (req, res) => {
    try {
      console.log(`[Asaas Webhook] Received ${req.body?.event} event`);
      
      // Validate configuration
      const asaasApiKey = process.env.ASAAS_API_KEY;
      const asaasWebhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
      
      if (!asaasApiKey && !asaasWebhookToken) {
        console.error("[Asaas Webhook] CRITICAL: Neither ASAAS_API_KEY nor ASAAS_WEBHOOK_TOKEN found in environment.");
        // Return 200 to acknowledge but log error internally to avoid Asaas retries on config fail
        return res.status(200).json({ error: "Config error", received: true });
      }

      // Validate Asaas Token (Security Rule 8)
      const asaasToken = req.headers['asaas-access-token'];
      const expectedToken = asaasWebhookToken || asaasApiKey; 
      
      if (expectedToken && asaasToken !== expectedToken) {
        console.warn("[Asaas Webhook] Invalid token received");
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { event, payment } = req.body;

      // Ignore trivial events to avoid noise and potential 500s on incomplete data
      if (event === 'PAYMENT_CREATED') {
        console.log(`[Asaas Webhook] Ignoring ${event} for payment ${payment?.id}`);
        return res.status(200).json({ received: true, ignored: true });
      }

      // Process confirmation events
      if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED' || event === 'RECEIVED') {
        const paymentId = payment.id;
        const externalReference = payment.externalReference;
        
        console.log(`[Asaas Webhook] Processing ${event} for payment: ${paymentId}`);

        try {
          // 1. Look up the payment in our database to find user and materials
          const { data: savedPayment } = await getSupabaseAdmin()
            .from('pagamentos')
            .select('*')
            .eq('external_id', paymentId)
            .maybeSingle();

          if (savedPayment) {
            const userId = savedPayment.user_id;
            const ref = savedPayment.external_reference || '';

            // CASE A: Library Purchase
            if (ref.startsWith('library|') || ref.startsWith('lib:')) {
               let materialIds: string[] = [];
               
               if (ref.startsWith('lib:')) {
                 materialIds = ref.replace('lib:', '').split(',').filter(Boolean);
               } else if (ref.startsWith('library|')) {
                 // Try to recover materials from a potential 4th part if we add it,
                 // or just use what we have. 
                 // Actually, let's look at how we saved it.
                 // In the refined version I'll use "lib:id1,id2..."
                 materialIds = ref.split('|')[2]?.split(',').filter(Boolean) || [];
               }

               if (userId && materialIds.length > 0) {
                 console.log(`[Asaas Webhook] Awarding materials to user ${userId}: ${materialIds.join(',')}`);
                 const purchaseRecords = materialIds.map(id => ({
                   patient_id: userId,
                   material_id: id,
                   purchased_at: new Date().toISOString()
                 }));

                 await getSupabaseAdmin()
                   .from('material_purchases')
                   .insert(purchaseRecords);
                 
                 console.log(`[Asaas Webhook] Successfully recorded library purchase.`);
               }
            } else if (!ref.startsWith('library|') && !ref.startsWith('lib:')) {
               // CASE B: Appointment (Agendamento)
               const appointmentId = ref; // Old logic used externalReference directly
               
               // ... rest of appointment logic ...

            const { data: appData, error: fetchErr } = await getSupabaseAdmin()
              .from('agendamentos')
              .select(`
                *,
                paciente:perfis!paciente_id (id, nome_completo, email, telefone),
                fisioterapeuta:perfis!fisio_id (id, nome_completo, email, telefone)
              `)
              .eq('id', appointmentId)
              .single();

            if (fetchErr || !appData) {
              console.error("[Asaas Webhook] Error fetching appointment:", fetchErr);
            } else if (appData.status !== 'confirmado') {
              // 1. Calculations
              const totalPaid = Number(payment.value);
              const currentRate = await getCommissionRate();
              const commission = totalPaid * (currentRate / 100);
              const netAmount = totalPaid * ((100 - currentRate) / 100);

              // 2. Update appointment status
              await getSupabaseAdmin()
                .from('agendamentos')
                .update({ status: 'confirmado' })
                .eq('id', appointmentId);

              // 3. Create financial record
              await getSupabaseAdmin()
                .from('sessoes')
                .insert({
                  paciente_id: appData.paciente_id,
                  fisioterapeuta_id: appData.fisio_id,
                  agendamento_id: appointmentId,
                  data: appData.data,
                  hora: appData.hora,
                  valor_sessao: netAmount, 
                  status_pagamento: 'pago_app',
                  external_id: payment.id,
                  gateway: 'asaas'
                });

              // 4. Notifications
              const formattedDate = new Date(appData.data_servico).toLocaleDateString('pt-BR');
              const formattedTime = new Date(appData.data_servico).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

              if (appData.paciente.telefone) {
                await sendWhatsAppMessage(
                  appData.paciente.telefone,
                  `✅ *Pagamento Confirmado (Asaas)!* \n\nOlá ${appData.paciente.nome_completo}, seu pagamento via Pix/Boleto foi recebido. Sua consulta está confirmada para ${formattedDate} às ${formattedTime}.\n\nFisioCareHub 🏥`
                );
              }

              if (appData.fisioterapeuta.telefone) {
                await sendWhatsAppMessage(
                  appData.fisioterapeuta.telefone,
                  `💰 *Pagamento Confirmado (Asaas)!* \n\nNovo atendimento para: ${appData.paciente.nome_completo} em ${formattedDate} às ${formattedTime}.\n\nFisioCareHub 🏥`
                );
              }

              await getSupabaseAdmin().from('notificacoes').insert({
                user_id: appData.fisio_id,
                titulo: 'Novo Agendamento Confirmado (Asaas)',
                mensagem: `${appData.paciente.nome_completo} realizou o pagamento via Asaas e confirmou o agendamento para o dia ${formattedDate} às ${formattedTime}.`,
                tipo: 'appointment',
                lida: false,
                link: '/appointments'
              });
            }
          }
        }

        // Also record in a generic pagamentos table
          await getSupabaseAdmin()
            .from('pagamentos')
            .upsert({
              external_id: payment.id,
              external_reference: externalReference,
              amount: payment.value,
              status: 'paid',
              gateway: 'asaas',
              method: payment.billingType,
              confirmed_at: new Date().toISOString()
            });

        } catch (err) {
          console.error("[Asaas Webhook] Error processing payment:", err);
        }
      }
    } catch (err: any) {
      console.error("[Asaas Webhook Master Error]", err);
      return res.status(200).json({ received: true, error: "Internal processing error" });
    }
  });

  // ASASS Appointment Payment Route
  app.post("/api/asaas/create-payment", async (req, res) => {
    console.log("BODY REBIDO ASAAS:", JSON.stringify(req.body, null, 2));
    
    try {
      const { name, email, value, appointmentId, user_id, billingType, phone, cpf, installments } = req.body;

      console.log(`[Asaas] Received request for appointmentId: ${appointmentId}`);

      if (!appointmentId) {
        return res.status(400).json({ error: "id_agendamento é necessário." });
      }

      // SECURITY: Fetch data from Supabase instead of trusting frontend
      const { data: appointment, error: appError } = await getSupabaseAdmin()
        .from('agendamentos')
        .select('*, paciente:perfis!paciente_id(id, nome_completo, email, telefone)')
        .eq('id', appointmentId)
        .single();

      if (appError || !appointment) {
        console.error("[Asaas] Appointment not found:", appointmentId, appError);
        return res.status(404).json({ error: "Agendamento não encontrado." });
      }

      // Use data from DB
      const finalName = appointment.paciente?.nome_completo || name;
      const finalEmail = appointment.paciente?.email || email;
      const finalPhone = appointment.paciente?.telefone || phone;
      const finalUserId = appointment.paciente_id || user_id;
      const finalCPF = cpf?.replace(/\D/g, '') || '';
      
      // Ensure value is a valid number
      let finalValue = Number(appointment.valor || value);
      if (typeof value === 'string') {
        finalValue = parseFloat(value.replace(',', '.'));
      }
      
      if (isNaN(finalValue) || finalValue <= 0) {
        return res.status(400).json({ error: "Valor de pagamento inválido." });
      }

      if (!finalName || !finalEmail) {
        return res.status(400).json({ 
          error: "Dados obrigatórios ausentes: nome, email e id_agendamento são necessários." 
        });
      }

      // 1. Get or Create Customer
      const customerId = await getOrCreateAsaasCustomer(finalUserId, finalEmail, finalName, finalPhone, finalCPF);

      // 2. Prepare Payment Data
      const now = new Date();
      const dueDate = now.toISOString().split('T')[0];

      // Ensure billingType is valid (PIX, BOLETO, CREDIT_CARD)
      let finalBillingType = String(billingType || 'PIX').toUpperCase();
      if (!['PIX', 'BOLETO', 'CREDIT_CARD'].includes(finalBillingType)) {
        finalBillingType = 'PIX';
      }

      const paymentData: any = {
        customer: customerId,
        billingType: finalBillingType,
        value: Number(finalValue.toFixed(2)),
        dueDate: dueDate,
        description: `Agendamento ${appointmentId}`,
        externalReference: String(appointmentId),
        postalService: false
      };

      // Add Credit Card installments if applicable
      if (finalBillingType === "CREDIT_CARD" && installments && Number(installments) > 1) {
        const insCount = Number(installments);
        paymentData.installmentCount = insCount;
        paymentData.installmentValue = Number((finalValue / insCount).toFixed(2));
      }

      console.log("Asaas Appointment Payment Payload:", JSON.stringify(paymentData, null, 2));

      const baseUrl = getEnv("ASAAS_BASE_URL", "https://api.asaas.com/v3").trim().replace(/\/$/, "");
      const asaasApiKey = getEnv("ASAAS_API_KEY", "");

      if (!asaasApiKey) {
        throw new Error("ASAAS_API_KEY não configurada no servidor.");
      }

      const response = await axios.post(
        `${baseUrl}/payments`,
        paymentData,
        {
          headers: {
            'access_token': asaasApiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const payment = response.data;

      if (!payment || !payment.id) {
        throw new Error("Falha ao criar pagamento Asaas: resposta inválida");
      }

      console.log(`[Asaas] Payment created successfully: ${payment.id}`);
      
      // Record pending payment in Supabase
      await getSupabaseAdmin().from('pagamentos').upsert({
        external_id: payment.id,
        user_id: finalUserId,
        external_reference: appointmentId,
        amount: finalValue,
        status: 'pending',
        gateway: 'asaas',
        method: finalBillingType,
        invoice_url: payment.invoiceUrl || payment.bankSlipUrl
      }, { onConflict: 'external_id' });

      return res.status(200).json({
        id: payment.id,
        invoiceUrl: payment.invoiceUrl,
        bankSlipUrl: payment.bankSlipUrl,
        pixQrCode: payment.pixQrCode,
        pixCopyPaste: payment.pixCopyPaste,
        url: payment.invoiceUrl || payment.bankSlipUrl // Keep url for compatibility
      });

    } catch (err: any) {
      console.error("ASAAS ERROR:", err.response?.data || err.message);
      return res.status(500).json({
        error: err.message,
        details: err.response?.data
      });
    }
  });

  // ASASS Library Purchase Specialized Route
  app.post("/api/asaas/create-library-payment", async (req, res) => {
    try {
      const { user_id, email, name, phone, material_ids, billingType = "PIX", cpf } = req.body;

      console.log("[Asaas Library] Received request for materials:", material_ids);

      if (!user_id || !email || !material_ids || !Array.isArray(material_ids) || material_ids.length === 0) {
        return res.status(400).json({ error: "Dados insuficientes para criar pagamento da biblioteca." });
      }

      // 1. Fetch materials info to calculate total securely
      const { data: materials, error } = await getSupabaseAdmin()
        .from('library_materials')
        .select('id, title, price, price_cents')
        .in('id', material_ids);

      if (error || !materials || materials.length === 0) {
        return res.status(404).json({ error: "Materiais não encontrados no banco de dados." });
      }

      const totalValue = materials.reduce((sum, m) => {
        // Debug logs as requested
        console.log(`[Asaas Library Debug] materialId: ${m.id}`);
        
        let priceValue = 0;
        // Use price_cents if available, otherwise price
        const dbPrice = m.price_cents ? (m.price_cents / 100) : m.price;
        console.log(`[Asaas Library Debug] price vindo do banco: ${dbPrice}`);

        // Corrigir automaticamente casos como "49,90" -> 49.90
        if (typeof dbPrice === 'string') {
          priceValue = parseFloat(dbPrice.replace(',', '.'));
        } else {
          priceValue = Number(dbPrice);
        }

        const validPrice = isNaN(priceValue) ? 0 : priceValue;
        return sum + validPrice;
      }, 0);

      console.log(`[Asaas Library Debug] amount final: ${totalValue}`);

      if (totalValue <= 0) {
        return res.status(400).json({ error: "Valor total inválido (R$ 0)." });
      }

      // 2. Get or Create Asaas Customer
      let userName = name;
      let userPhone = phone;

      if (!userName || !userPhone) {
        try {
          const { data: profile } = await getSupabaseAdmin()
            .from('perfis')
            .select('nome_completo, telefone')
            .eq('id', user_id)
            .single();
          
          if (profile) {
            userName = userName || profile.nome_completo;
            userPhone = userPhone || profile.telefone;
          }
        } catch (e) {
          console.warn("[Asaas Library] Failed to fetch profile info:", e);
        }
      }

      const customerId = await getOrCreateAsaasCustomer(user_id, email, userName || email.split('@')[0], userPhone, cpf);

      // 3. Create Payment Payload as per spec
      const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Store material IDs in externalReference to recover in webhook
      // We use lib:prefix to identify and fit as many as possible
      const externalReference = `lib:${material_ids.join(',')}`.substring(0, 100);

      const paymentData = {
        customer: customerId,
        billingType: billingType,
        value: Number(totalValue.toFixed(2)),
        dueDate,
        description: `Biblioteca: ${materials.map(m => m.title).join(', ').substring(0, 50)}...`,
        externalReference: externalReference.substring(0, 100),
        postalService: false
      };

      // Exact log requested by user
      console.log("Biblioteca pagamento payload:", paymentData);

      const baseUrl = getEnv("ASAAS_BASE_URL", "https://api.asaas.com/v3").trim().replace(/\/$/, "");
      const asaasRes = await axios.post(`${baseUrl}/payments`, paymentData, {
        headers: getAsaasHeaders()
      });

      const data = asaasRes.data;

      if (data.id) {
        console.log(`[Asaas Library] Payment created: ${data.id}`);
        
        // Record pending payment
        await getSupabaseAdmin().from('pagamentos').insert({
          external_id: data.id,
          user_id: user_id,
          external_reference: externalReference,
          amount: totalValue,
          status: 'pending',
          gateway: 'asaas',
          invoice_url: data.invoiceUrl
        });

        res.json({ 
          id: data.id,
          invoiceUrl: data.invoiceUrl,
          bankSlipUrl: data.bankSlipUrl || data.invoiceUrl,
          url: data.invoiceUrl || data.bankSlipUrl,
          value: totalValue
        });
      } else {
        console.error("[Asaas Library] API Error:", data);
        const errorMsg = data.errors?.[0]?.description || "Erro ao criar cobrança na Asaas";
        res.status(400).json({ error: errorMsg, details: data.errors });
      }

    } catch (err: any) {
      console.error("[Asaas Library] Fatal Error:", err.response?.data || err.message);
      res.status(500).json({ error: err.response?.data?.errors?.[0]?.description || err.message });
    }
  });

  // Minimal API Routes (No secrets used here)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Twilio WhatsApp Send Route
  app.post("/api/notifications/send-whatsapp", async (req, res) => {
    try {
      const { to, message } = req.body;
      if (!to || !message) {
        return res.status(400).json({ error: "Parâmetros 'to' e 'message' são obrigatórios." });
      }
      const result = await sendWhatsAppMessage(to, message);
      res.json({ success: true, sid: result.sid });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Trigger Notification Events
  app.post("/api/notifications/trigger-event", async (req, res) => {
    try {
      const { event, appointment_id } = req.body;
      
      const { data: app, error } = await getSupabaseAdmin()
        .from('agendamentos')
        .select(`
          *,
          paciente:perfis!paciente_id (nome_completo, telefone),
          fisioterapeuta:perfis!fisio_id (nome_completo, telefone)
        `)
        .eq('id', appointment_id)
        .single();
      
      if (error || !app) {
        return res.status(404).json({ error: "Agendamento não encontrado." });
      }

      const formattedDate = new Date(app.data_servico).toLocaleDateString('pt-BR');
      const formattedTime = new Date(app.data_servico).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      switch (event) {
        case 'created':
          if (app.paciente.telefone) {
            await sendWhatsAppMessage(app.paciente.telefone, `🗓️ *Solicitação de Agendamento* \n\nOlá ${app.paciente.nome_completo}, sua solicitação foi recebida e está aguardando confirmação do profissional.\n\nFisioCareHub 🏥`);
          }
          if (app.fisioterapeuta.telefone) {
            await sendWhatsAppMessage(app.fisioterapeuta.telefone, `🚀 *Nova Solicitação de Agendamento!*\n\nOlá Profissional, o paciente ${app.paciente.nome_completo} solicitou um atendimento.\n\n📅 *Data:* ${formattedDate}\n⏰ *Hora:* ${formattedTime}\n📍 *Endereço:* ${app.endereco}\n\nAcesse o app para confirmar!`);
          }
          break;

        case 'canceled':
          if (app.paciente.telefone) {
            await sendWhatsAppMessage(app.paciente.telefone, `❌ *Agendamento Cancelado* \n\nOlá ${app.paciente.nome_completo}, seu agendamento para o dia ${formattedDate} foi cancelado.\n\nFisioCareHub 🏥`);
          }
          if (app.fisioterapeuta.telefone) {
            await sendWhatsAppMessage(app.fisioterapeuta.telefone, `❌ *Agendamento Cancelado* \n\nO atendimento de ${app.paciente.nome_completo} para o dia ${formattedDate} foi cancelado.`);
          }
          break;

        case 'refunded':
          if (app.paciente.telefone) {
            await sendWhatsAppMessage(app.paciente.telefone, `💰 *Reembolso Confirmado* \n\nOlá ${app.paciente.nome_completo}, o reembolso referente ao seu agendamento cancelado foi processado com sucesso.\n\nFisioCareHub 🏥`);
          }
          break;

        case 'reminder_24h':
          if (app.paciente.telefone) {
            await sendWhatsAppMessage(app.paciente.telefone, `⏰ *Lembrete de Consulta* \n\nOlá ${app.paciente.nome_completo}, passando para lembrar da sua consulta amanhã (${formattedDate}) às ${formattedTime}.\n\nAté logo! 🏥`);
          }
          if (app.fisioterapeuta.telefone) {
            await sendWhatsAppMessage(app.fisioterapeuta.telefone, `⏰ *Agenda de Amanhã*\n\nResumo para amanhã:\n\n👤 *Paciente:* ${app.paciente.nome_completo}\n⏰ *Hora:* ${formattedTime}\n📍 *Local:* ${app.endereco}`);
          }
          break;

        default:
          return res.status(400).json({ error: "Evento inválido." });
      }

      res.json({ success: true, event });
    } catch (err: any) {
      console.error("[Twilio Event] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Test WhatsApp Route
  app.post("/api/notifications/test-whatsapp", async (req, res) => {
    try {
      console.log("[Twilio Test] Received request body:", req.body);
      
      // Return the specific success message requested for general connectivity tests
      return res.status(200).json({ 
        success: true, 
        message: "API WhatsApp funcionando" 
      });
    } catch (err: any) {
      console.error("[Twilio Test] Error:", err);
      res.status(500).json({ 
        success: false,
        error: err.message || "Erro interno ao processar envio."
      });
    }
  });

  app.post("/api/admin/test-template-email", async (req, res) => {
    console.log("[Admin API] Received test email request");
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        console.warn("[Admin API] Unauthorized - No auth header");
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const token = authHeader.split(' ')[1];
      if (!token) {
        console.warn("[Admin API] Malformed token");
        return res.status(401).json({ error: "Invalid token format" });
      }

      let adminClient;
      try {
        adminClient = getSupabaseAdmin();
      } catch (adminErr: any) {
        console.error("[Admin API] Failed to get Supabase Admin client:", adminErr.message);
        return res.status(500).json({ error: "Server configuration error (Supabase Admin)" });
      }

      console.log("[Admin API] Fetching user for token...");
      const { data: userData, error: authError } = await adminClient.auth.getUser(token);
      const user = userData?.user;
      
      if (authError || !user) {
        console.error("[Admin API] Invalid session or user fetch error:", authError);
        return res.status(401).json({ error: "Invalid session" });
      }

      // Check if user is admin
      console.log(`[Admin API] Validating role for user: ${user.email}`);
      const { data: profile, error: profileError } = await adminClient
        .from('perfis')
        .select('tipo_usuario, email, nome_completo')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        console.error("[Admin API] Profile error:", profileError);
        return res.status(404).json({ error: "Profile not found" });
      }

      if (profile.tipo_usuario !== 'admin') {
        console.warn(`[Admin API] Access denied for user ${user.id} (${profile.tipo_usuario})`);
        return res.status(403).json({ error: "Access denied. Admins only." });
      }

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.error("[Admin API] RESEND_API_KEY missing");
        return res.status(500).json({ error: "Resend API Key not configured" });
      }

      console.log("[Admin API] Initializing Resend...");
      const resend = new Resend(resendApiKey);

      console.log("[Admin API] Generating template...");
      // We use a simplified version of the production template for the test
      const testHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="font-family: sans-serif; background-color: #f8fafc; padding: 40px;">
  <div style="background-color: #ffffff; max-width: 600px; margin: 0 auto; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <div style="padding: 40px; text-align: center; background: linear-gradient(135deg, #EFF6FF, #EEF2FF);">
      <h1 style="margin: 0; font-size: 32px; font-weight: 800; color: #2563EB;">FisioCareHub</h1>
      <p style="margin-top: 10px; color: #374151; font-size: 14px;">Plataforma de Gestão em Fisioterapia</p>
    </div>
    <div style="padding: 40px;">
      <p style="font-size: 18px; color: #111827; margin-top: 0;">Olá, <strong>${profile.nome_completo || "Usuário Teste"}</strong></p>
      <div style="color: #4b5563; line-height: 1.6; margin-bottom: 30px;">
        Este é um teste do template real de e-mails do FisioCareHub. Verifique layout, espaçamento e compatibilidade com Gmail/Outlook.
      </div>
      <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; font-size: 14px; color: #64748b;">
        <p style="margin: 5px 0;"><strong>FisioCareHub</strong> – Plataforma de Gestão em Fisioterapia</p>
        <p style="margin: 5px 0;">Suporte: <a href="mailto:suporte@fisiocarehub.company" style="color: #2563eb; text-decoration: none;">suporte@fisiocarehub.company</a></p>
        <p style="margin: 5px 0;">Website: <a href="https://fisiocarehub.company" style="color: #2563eb; text-decoration: none;">fisiocarehub.company</a></p>
        <p style="margin: 15px 0 0 0; font-size: 12px; color: #94a3b8; font-style: italic;">
          Gerado em: ${new Date().toLocaleString('pt-BR')}
        </p>
      </div>
      <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #64748b; background-color: #f9fafb; padding: 20px; border-radius: 0 0 16px 16px;">
        <p>FisioCareHub &copy; ${new Date().getFullYear()} – Todos os direitos reservados</p>
        <p>Mensagem automática, não responder</p>
      </div>
    </div>
  </div>
</body>
</html>`;

      console.log(`[Admin API] Sending test email to ${profile.email}`);
      
      const primaryFrom = process.env.RESEND_FROM || 'FisioCareHub <no-reply@fisiocarehub.company>';
      const fallbackFrom = 'FisioCareHub <onboarding@resend.dev>';

      let sendResult;
      try {
        console.log(`[Admin API] Resend Attempt 1 with: ${primaryFrom}`);
        sendResult = await resend.emails.send({
          from: primaryFrom,
          to: [profile.email],
          subject: 'Teste de Template - FisioCareHub',
          html: testHtml,
        });

        if (sendResult.error) {
          const errMsg = sendResult.error.message.toLowerCase();
          const isDomainError = errMsg.includes('domain') || errMsg.includes('verified') || errMsg.includes('from') || errMsg.includes('identity');
          
          if (isDomainError) {
            console.warn(`[Admin API] Resend Fallback to onboarding@resend.dev due to: ${sendResult.error.message}`);
            sendResult = await resend.emails.send({
              from: fallbackFrom,
              to: [profile.email],
              subject: 'Teste de Template - FisioCareHub (Fallback)',
              html: testHtml,
            });
          }
        }
      } catch (err) {
        console.error("[Admin API] Resend call failed:", err);
        throw err;
      }

      const { data, error: sendError } = sendResult;

      if (sendError) {
        console.error("[Resend] Error sending test email after all attempts:", sendError);
        return res.status(500).json({ 
          error: sendError.message,
          details: sendError
        });
      }

      console.log(`[Resend Test] Email sent successfully. Message ID: ${data?.id}`);
      res.json({ success: true, messageId: data?.id, message: "E-mail de teste enviado com sucesso!" });
    } catch (err: any) {
      console.error("[Resend Test] Uncaught error:", err);
      res.status(500).json({ error: err.message || "Erro interno desconhecido" });
    }
  });

  // Edge Function get-config simulation
  app.get("/api/get-config", (req, res) => {
    res.json({
      supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
      firebaseApiKey: process.env.FIREBASE_API_KEY || "",
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID || "",
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
      firebaseAppId: process.env.FIREBASE_APP_ID || "",
      firebaseMeasurementId: process.env.FIREBASE_MEASUREMENT_ID || ""
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("[Server] Backend logic migrated to Supabase Edge Functions.");
    
    if (!process.env.ASAAS_API_KEY) {
      console.warn("[Warning] ASAAS_API_KEY is not defined in environment variables.");
    }
  });
}

startServer();
