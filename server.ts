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

    res.json({ received: true });
  });

  app.use(express.json());

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
