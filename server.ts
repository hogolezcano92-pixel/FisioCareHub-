import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import twilio from "twilio";

dotenv.config();

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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia" as any,
});

const ASAAS_API_KEY = process.env.ASAAS_API_KEY || "";
const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";

const getAsaasHeaders = () => ({
  'Content-Type': 'application/json',
  'access_token': getEnv("ASAAS_API_KEY", "")
});

async function getOrCreateAsaasCustomer(userId: string, email: string, name: string, phone?: string) {
  try {
    const headers = getAsaasHeaders();
    if (!headers.access_token) {
      throw new Error("ASAAS_API_KEY is not configured.");
    }

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
    const searchRes = await fetch(`${baseUrl}/customers?email=${encodeURIComponent(email)}`, { headers });
    const searchData = await searchRes.json();

    if (searchData.data && searchData.data.length > 0) {
      const customerId = searchData.data[0].id;
      console.log(`[Asaas] Found existing customer: ${customerId}`);
      // Update Supabase for next time
      await getSupabaseAdmin().from('perfis').update({ asaas_customer_id: customerId }).eq('id', userId);
      return customerId;
    }

    // 3. Create new customer in Asaas
    console.log(`[Asaas] Creating new customer for ${email}`);
    const createRes = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name,
        email,
        phone: phone || '',
        externalReference: userId
      })
    });

    const newData = await createRes.json();
    if (newData.id) {
      console.log(`[Asaas] Customer created: ${newData.id}`);
      await getSupabaseAdmin().from('perfis').update({ asaas_customer_id: newData.id }).eq('id', userId);
      return newData.id;
    }
    
    throw new Error(newData.errors?.[0]?.description || "Erro ao criar cliente no Asaas");
  } catch (err) {
    console.error("[Asaas] Error in getOrCreateAsaasCustomer:", err);
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
              fisioterapeuta:perfis!fisio_id (id, nome_completo, email)
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
          }
        } catch (err) {
          console.error("[Webhook] Crash during appointment update:", err);
        }
      }
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const sessionId = paymentIntent.metadata.sessionId;

      if (sessionId) {
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

  // Asaas Webhook (New Path)
  app.post("/api/webhooks/asaas", async (req, res) => {
    console.log("[Asaas Webhook Received - /api/webhooks/asaas]", JSON.stringify(req.body, null, 2));
    res.status(200).send("OK");
  });

  // Asaas Webhook (Legacy Path)
  app.post("/api/asaas/webhook", async (req, res) => {
    // Validate Asaas Token (Security Rule 8)
    const asaasToken = req.headers['asaas-access-token'];
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN || process.env.ASAAS_API_KEY; 
    
    if (expectedToken && asaasToken !== expectedToken) {
      console.warn("[Asaas Webhook] Invalid token received");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { event, payment } = req.body;
    console.log(`[Asaas Webhook] Event Received: ${event}`, payment.id);

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const externalReference = payment.externalReference; // This should be appointment_id
      
      if (externalReference) {
        try {
          console.log(`[Asaas Webhook] Payment confirmed for externalReference: ${externalReference}`);
          
          // Identify if it's an appointment (agendamento)
          const { data: appData } = await getSupabaseAdmin()
            .from('agendamentos')
            .select('*')
            .eq('id', externalReference)
            .single();

          if (appData) {
            // Update appointment status
            await getSupabaseAdmin()
              .from('agendamentos')
              .update({ status: 'confirmado' })
              .eq('id', externalReference);

            // Fetch full data for WhatsApp notification
            const { data: fullAppData } = await getSupabaseAdmin()
              .from('agendamentos')
              .select(`
                *,
                paciente:perfis!paciente_id (nome_completo, telefone),
                fisioterapeuta:perfis!fisio_id (nome_completo, telefone)
              `)
              .eq('id', externalReference)
              .single();

            if (fullAppData) {
              const formattedDate = new Date(fullAppData.data_servico).toLocaleDateString('pt-BR');
              const formattedTime = new Date(fullAppData.data_servico).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

              // WhatsApp Notifications - Asaas Payment Approved
              if (fullAppData.paciente.telefone) {
                await sendWhatsAppMessage(
                  fullAppData.paciente.telefone,
                  `✅ *Pagamento Confirmado (Asaas)!* \n\nOlá ${fullAppData.paciente.nome_completo}, seu pagamento foi recebido. Sua consulta está confirmada para ${formattedDate} às ${formattedTime}.\n\nFisioCareHub 🏥`
                );
              }

              if (fullAppData.fisioterapeuta.telefone) {
                await sendWhatsAppMessage(
                  fullAppData.fisioterapeuta.telefone,
                  `💰 *Pagamento Confirmado (Asaas)!* \n\nNovo atendimento para: ${fullAppData.paciente.nome_completo} em ${formattedDate} às ${formattedTime}.\n\nFisioCareHub 🏥`
                );
              }
            }

            // Record in sessoes (financeiro)
            const { error: sessaoError } = await getSupabaseAdmin()
              .from('sessoes')
              .insert({
                paciente_id: appData.paciente_id,
                fisioterapeuta_id: appData.fisio_id,
                agendamento_id: externalReference,
                data: appData.data,
                hora: appData.hora,
                valor_sessao: payment.value,
                status_pagamento: 'pago_app',
                external_id: payment.id,
                gateway: 'asaas'
              });
            
            if (sessaoError) console.error("[Asaas Webhook] Error inserting into sessoes:", sessaoError);
          }

          // Also record in a generic pagamentos table
          const { error: pgError } = await getSupabaseAdmin()
            .from('pagamentos')
            .upsert({
              external_id: payment.id,
              user_id: appData?.paciente_id || null, 
              external_reference: externalReference,
              amount: payment.value,
              status: 'paid',
              gateway: 'asaas',
              method: payment.billingType,
              confirmed_at: new Date().toISOString()
            });

          if (pgError) console.error("[Asaas Webhook] Error updating pagamentos:", pgError);

        } catch (err) {
          console.error("[Asaas Webhook] Error processing payment:", err);
        }
      }
    }

    res.status(200).json({ received: true });
  });

  // Create Asaas Payment
  app.post("/api/asaas/create-payment", async (req, res) => {
    try {
      const { user_id, email, name, phone, amount, description, installmentCount, appointment_id, billingType } = req.body;

      console.log(`[Asaas] Received request for amount: ${amount}, user: ${user_id}`);

      if (!user_id || !amount) {
        return res.status(400).json({ error: "Dados insuficientes para criar pagamento no Asaas." });
      }

      const numericAmount = Number(amount);
      const numericInstallments = Number(installmentCount) || 1;

      if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ error: "Valor de pagamento inválido." });
      }

      // 1. Get or Create Customer
      const customerId = await getOrCreateAsaasCustomer(user_id, email, name, phone);

      // 2. Create Payment
      const paymentPayload: any = {
        customer: customerId,
        billingType: billingType || 'UNDEFINED',
        value: numericAmount,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: description || 'Serviço Clínico - FisioCareHub',
        externalReference: appointment_id, // Mandatory vinculation with appointment
      };

      if (numericInstallments > 1) {
        paymentPayload.installmentCount = numericInstallments;
        paymentPayload.installmentValue = (numericAmount / numericInstallments).toFixed(2);
      }

      const baseUrl = getEnv("ASAAS_BASE_URL", "https://api.asaas.com/v3").trim().replace(/\/$/, "");
      console.log(`[Asaas] Sending payload to ${baseUrl}/payments with externalReference: ${appointment_id}`);

      const asaasRes = await fetch(`${baseUrl}/payments`, {
        method: 'POST',
        headers: getAsaasHeaders(),
        body: JSON.stringify(paymentPayload)
      });

      const data = await asaasRes.json();

      if (data.id) {
        console.log(`[Asaas] Payment created successfully: ${data.id}`);
        // Record pending payment in Supabase
        await getSupabaseAdmin().from('pagamentos').insert({
          external_id: data.id,
          user_id: user_id,
          external_reference: appointment_id,
          amount: numericAmount,
          status: 'pending',
          gateway: 'asaas',
          method: billingType || 'UNDEFINED',
          invoice_url: data.invoiceUrl
        });

        res.json({ 
          id: data.id,
          url: data.invoiceUrl || data.bankSlipUrl,
          pixCode: data.pixCode // Optional, for UI to show if needed
        });
      } else {
        console.error("[Asaas] API Error Response:", data);
        const errorMsg = data.errors?.[0]?.description || "Erro ao criar cobrança no Asaas";
        res.status(400).json({ error: errorMsg });
      }
    } catch (err: any) {
      console.error("[Asaas] Fatal error creating payment:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Create Checkout Session for Subscriptions
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { user_id, email, plan, type, service_name, amount } = req.body;

      if (!user_id || !plan || !amount) {
        return res.status(400).json({ error: "Dados insuficientes para criar checkout." });
      }

      // Force type subscription if missing to ensure separation
      const sessionType = type || 'subscription';

      console.log(`[Stripe] Creating checkout session for ${email} - Plan: ${plan}`);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card', 'pix'],
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: service_name || `Plano ${plan.toUpperCase()} - FisioCareHub`,
                description: `Assinatura mensal do plano ${plan}`,
              },
              unit_amount: Math.round(Number(amount) * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        customer_email: email,
        success_url: `${process.env.APP_URL || process.env.VITE_APP_URL || 'http://localhost:3000'}/subscription?success=true`,
        cancel_url: `${process.env.APP_URL || process.env.VITE_APP_URL || 'http://localhost:3000'}/subscription?canceled=true`,
        metadata: {
          user_id,
          plan,
          type: sessionType,
          appointment_id: req.body.appointment_id || ''
        },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("[Stripe] Error creating checkout session:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Create Payment Intent
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { sessionId, amount } = req.body;

      if (!sessionId || !amount) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "brl",
        metadata: {
          sessionId,
        },
      });

      // Update session with payment intent ID
      await getSupabaseAdmin()
        .from('sessoes')
        .update({ stripe_payment_intent: paymentIntent.id })
        .eq('id', sessionId);

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (err: any) {
      console.error("Error creating payment intent:", err);
      res.status(500).json({ error: err.message });
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
      const { to } = req.body;
      if (!to) {
        return res.status(400).json({ error: "O parâmetro 'to' é obrigatório." });
      }

      console.log(`[Twilio Test] Initiating test message to: ${to}`);
      const result = await sendWhatsAppMessage(to, "🧪 Teste: WhatsApp funcionando corretamente!");
      
      res.json({ 
        success: true, 
        message: "Mensagem de teste enviada!",
        sid: result.sid 
      });
    } catch (err: any) {
      console.error("[Twilio Test] Error:", err);
      res.status(500).json({ error: err.message });
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
