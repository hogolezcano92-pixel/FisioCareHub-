import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia" as any,
});

const getEnv = (key: string, fallback: string): string => {
  const value = process.env[key];
  if (!value || value === "undefined" || value === "null" || value === "") return fallback;
  return value;
};

const supabaseUrl = getEnv("VITE_SUPABASE_URL", "https://exciqetztunqgxbwwodo.supabase.co");
const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY", "");

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey
);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Stripe Webhook (Must be before express.json())
  app.post("/api/webhook/stripe", express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const sessionId = paymentIntent.metadata.sessionId;

      if (sessionId) {
        console.log(`Pagamento aprovado para sessão: ${sessionId}`);
        const { error } = await supabaseAdmin
          .from('sessoes')
          .update({ status_pagamento: 'pago_app' })
          .eq('id', sessionId);
        
        if (error) console.error("Erro ao atualizar status da sessão:", error);
      }
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const sessionId = session.metadata?.sessionId;

      if (sessionId) {
        console.log(`Pagamento aprovado via Checkout para sessão: ${sessionId}`);
        const { error } = await supabaseAdmin
          .from('sessoes')
          .update({ status_pagamento: 'pago_app' })
          .eq('id', sessionId);
        
        if (error) console.error("Erro ao atualizar status da sessão:", error);

        // Optionally update appointment status too if needed
        const appointmentId = session.metadata?.appointmentId;
        if (appointmentId) {
          // 1. Update appointment status
          await supabaseAdmin
            .from('agendamentos')
            .update({ status: 'confirmado' })
            .eq('id', appointmentId);

          // 2. Fetch appointment details to send notifications
          const { data: appData } = await supabaseAdmin
            .from('agendamentos')
            .select(`
              *,
              paciente:perfis!paciente_id (nome_completo, email, telefone),
              fisioterapeuta:perfis!fisio_id (id, nome_completo, email)
            `)
            .eq('id', appointmentId)
            .single();

          if (appData) {
            const formattedDate = new Date(appData.data_servico).toLocaleDateString('pt-BR');
            const formattedTime = new Date(appData.data_servico).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            // 3. Create notification for the Physiotherapist
            await supabaseAdmin.from('notificacoes').insert({
              user_id: appData.fisioterapeuta.id,
              titulo: 'Novo Agendamento Confirmado',
              mensagem: `${appData.paciente.nome_completo} realizou o pagamento e confirmou o agendamento para o dia ${formattedDate} às ${formattedTime}.`,
              tipo: 'appointment',
              lida: false,
              link: '/appointments'
            });

            // 4. Send confirmation emails via Edge Function
            // Note: We use the same payload expected by the 'Send-email' function
            const baseUrl = process.env.APP_URL || "https://fisiocarehub.company";
            const emailPayload = {
              to: appData.fisioterapeuta.email,
              subject: 'Novo Agendamento Recebido - FisioCareHub',
              appointmentId: appointmentId,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2>Novo Agendamento Confirmado!</h2>
                  <p>O paciente <strong>${appData.paciente.nome_completo}</strong> confirmou e pagou o agendamento.</p>
                  <p><strong>Data:</strong> ${formattedDate}</p>
                  <p><strong>Hora:</strong> ${formattedTime}</p>
                  <p><strong>Serviço:</strong> ${appData.servico || 'Consulta'}</p>
                  <a href="${baseUrl}/appointments" style="display: inline-block; padding: 12px 24px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 8px;">Ver na Agenda</a>
                </div>
              `
            };

            await supabaseAdmin.functions.invoke('Send-email', { body: emailPayload });
            
            // Also notify patient
            await supabaseAdmin.functions.invoke('Send-email', { 
              body: {
                to: appData.paciente.email,
                subject: 'Pagamento Confirmado - FisioCareHub',
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Pagamento Confirmado!</h2>
                    <p>Olá ${appData.paciente.nome_completo}, seu pagamento foi processado com sucesso.</p>
                    <p>Sua consulta com <strong>${appData.fisioterapeuta.nome_completo}</strong> está confirmada.</p>
                    <p><strong>Data:</strong> ${formattedDate}</p>
                    <p><strong>Hora:</strong> ${formattedTime}</p>
                  </div>
                `
              }
            });
          }
        }
      }
    }

    res.json({ received: true });
  });

  app.use(express.json());

  // Create Checkout Session
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { sessionId, appointmentId, amount, physioName, type, physioId } = req.body;

      if (!sessionId || !amount) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const appUrl = process.env.APP_URL || "http://localhost:3000";

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'brl',
            product_data: {
              name: `${type || 'Sessão'} - Dr(a). ${physioName || 'Fisioterapeuta'}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${appUrl}/appointments?status=success&session_id=${sessionId}`,
        cancel_url: `${appUrl}/physio/${physioId}?status=canceled`,
        metadata: {
          sessionId,
          appointmentId: appointmentId || "",
        },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Error creating checkout session:", err);
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
      await supabaseAdmin
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
  });
}

startServer();
