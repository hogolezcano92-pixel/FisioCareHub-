import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import Stripe from "stripe";
import admin from "firebase-admin";

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    console.log("[Firebase Admin] Initialized with default credentials");
  } catch (err) {
    console.warn("[Firebase Admin] Failed to initialize with default credentials. Firestore updates from backend may fail.");
  }
}

const dbAdmin = admin.apps.length ? admin.firestore() : null;

const getStripeKey = () => (process.env.STRIPE_SECRET_KEY || "").trim();

let stripeInstance: Stripe | null = null;
const getStripe = () => {
  if (!stripeInstance) {
    stripeInstance = new Stripe(getStripeKey());
  }
  return stripeInstance;
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Stripe Webhook (Must be before express.json())
  app.post("/api/webhook/stripe", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      console.warn("[Stripe Webhook] Missing signature or secret");
      return res.status(400).send("Webhook Error: Missing signature or secret");
    }

    let event;

    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error(`[Stripe Webhook] Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`[Stripe Webhook] Event received: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;
        
        console.log(`[Stripe Webhook] Checkout session completed for user: ${userId}, Customer: ${customerId}`);
        
        // Update user in Firestore if admin is available
        if (dbAdmin && userId) {
          try {
            await dbAdmin.collection('users').doc(userId).update({
              'subscription.stripeCustomerId': customerId,
              'subscription.status': 'active',
              'subscription.plan': session.metadata?.planId || 'pro'
            });
            console.log(`[Stripe Webhook] Updated Firestore for user ${userId}`);
          } catch (dbErr) {
            console.error(`[Stripe Webhook] Error updating Firestore:`, dbErr);
          }
        }

        // Send a preliminary "Welcome" email if we have the email
        const email = session.customer_details?.email || session.customer_email;
        if (email) {
          try {
            await transporter.sendMail({
              from: `"FisioCareHub" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
              to: email,
              subject: "Bem-vindo ao FisioCareHub Pro!",
              html: `
                <div style="font-family: sans-serif; color: #334155; padding: 20px;">
                  <h2 style="color: #10b981;">Assinatura Iniciada!</h2>
                  <p>Olá! Sua assinatura do plano <strong>${session.metadata?.planId === 'pro' ? 'Pro' : 'Premium'}</strong> foi iniciada com sucesso.</p>
                  <p>Você tem 30 dias de teste gratuito. Após esse período, a cobrança será efetuada automaticamente.</p>
                  <p>Acesse seu painel para começar a usar todos os recursos:</p>
                  <a href="${process.env.APP_URL}/dashboard" style="display: inline-block; background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Ir para o Painel</a>
                </div>
              `,
            });
            console.log(`[Stripe Webhook] Welcome email sent to ${email}`);
          } catch (mailErr) {
            console.error("[Stripe Webhook] Error sending welcome email:", mailErr);
          }
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[Stripe Webhook] Invoice payment succeeded: ${invoice.id}`);
        
        const email = invoice.customer_email || invoice.customer_name;
        if (email) {
          try {
            await transporter.sendMail({
              from: `"FisioCareHub" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
              to: email,
              subject: "Confirmação de Pagamento - FisioCareHub",
              html: `
                <div style="font-family: sans-serif; color: #334155; padding: 20px;">
                  <h2 style="color: #10b981;">Pagamento Confirmado!</h2>
                  <p>Recebemos a confirmação do seu pagamento referente à sua assinatura.</p>
                  <p><strong>Valor:</strong> R$ ${(invoice.amount_paid / 100).toFixed(2)}</p>
                  <p><strong>Fatura:</strong> <a href="${invoice.hosted_invoice_url}">Ver Fatura Online</a></p>
                  <p>Obrigado por confiar no FisioCareHub!</p>
                </div>
              `,
            });
            console.log(`[Stripe Webhook] Payment confirmation email sent to ${email}`);
          } catch (mailErr) {
            console.error("[Stripe Webhook] Error sending payment email:", mailErr);
          }
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[Stripe Webhook] Invoice payment failed: ${invoice.id}`);
        
        const email = invoice.customer_email || invoice.customer_name;
        if (email) {
          try {
            await transporter.sendMail({
              from: `"FisioCareHub" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
              to: email,
              subject: "Falha no Pagamento - FisioCareHub",
              html: `
                <div style="font-family: sans-serif; color: #334155; padding: 20px;">
                  <h2 style="color: #ef4444;">Problema no Pagamento</h2>
                  <p>Olá. Houve um problema ao processar o pagamento da sua assinatura.</p>
                  <p>Por favor, verifique seus dados de pagamento no painel para evitar a interrupção do serviço.</p>
                  <a href="${process.env.APP_URL}/dashboard/assinatura" style="display: inline-block; background: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Atualizar Pagamento</a>
                </div>
              `,
            });
            console.log(`[Stripe Webhook] Payment failure email sent to ${email}`);
          } catch (mailErr) {
            console.error("[Stripe Webhook] Error sending failure email:", mailErr);
          }
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[Stripe Webhook] Subscription deleted: ${subscription.id}`);
        
        // Update Firestore to mark subscription as inactive
        if (dbAdmin) {
          try {
            const usersRef = dbAdmin.collection('users');
            const snapshot = await usersRef.where('subscription.stripeCustomerId', '==', subscription.customer).get();
            if (!snapshot.empty) {
              const userDoc = snapshot.docs[0];
              await userDoc.ref.update({
                'subscription.status': 'canceled',
                'subscription.plan': 'basic'
              });
              console.log(`[Stripe Webhook] Updated Firestore for canceled subscription: ${userDoc.id}`);
            }
          } catch (dbErr) {
            console.error(`[Stripe Webhook] Error updating Firestore for cancellation:`, dbErr);
          }
        }
        break;
      }
      default:
        console.log(`[Stripe Webhook] Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  });

  app.use(express.json());

  // Startup Config Check
  console.log("--- Verificação de Configuração ---");
  console.log(`SMTP_HOST: ${process.env.SMTP_HOST || "smtp.gmail.com (padrão)"}`);
  console.log(`SMTP_PORT: ${process.env.SMTP_PORT || "587 (padrão)"}`);
  console.log(`SMTP_USER: ${process.env.SMTP_USER ? "CONFIGURADO (OK)" : "NÃO ENCONTRADO (ERRO)"}`);
  console.log(`SMTP_PASS: ${process.env.SMTP_PASS ? "CONFIGURADO (OK)" : "NÃO ENCONTRADO (ERRO)"}`);
  console.log(`SMTP_FROM: ${process.env.SMTP_FROM ? "CONFIGURADO (OK)" : "NÃO CONFIGURADO (USANDO USER)"}`);
  console.log(`STRIPE_KEY: ${process.env.STRIPE_SECRET_KEY ? `DETECTADA (${process.env.STRIPE_SECRET_KEY.startsWith('sk_live') ? 'LIVE MODE' : 'TEST MODE'})` : "NÃO ENCONTRADA (ERRO)"}`);
  console.log(`STRIPE_PRICE_ID: ${process.env.STRIPE_PRICE_ID ? "CONFIGURADO (OK)" : "NÃO CONFIGURADO (USANDO DINÂMICO)"}`);
  console.log(`STRIPE_WEBHOOK_SECRET: ${process.env.STRIPE_WEBHOOK_SECRET ? "CONFIGURADO (OK)" : "NÃO CONFIGURADO (WEBHOOK FALHARÁ)"}`);
  console.log(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? "CONFIGURADO (OK)" : "NÃO CONFIGURADO (ERRO)"}`);
  console.log("-----------------------------------");

  // Email Transporter
  const getTransporter = () => {
    const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
    const port = parseInt((process.env.SMTP_PORT || "587").trim());
    const user = (process.env.SMTP_USER || "").trim();
    const pass = (process.env.SMTP_PASS || "").trim();

    const config: any = {
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    };

    // If using Gmail, use the built-in service config which is more reliable
    if (host.includes("gmail.com")) {
      config.service = "gmail";
    } else {
      config.host = host;
      config.port = port;
      config.secure = port === 465;
    }

    return nodemailer.createTransport(config);
  };

  const transporter = getTransporter();

  // API Routes
  app.post("/api/notify/appointment", async (req, res) => {
    const { to, subject, body } = req.body;
    console.log(`[Email] Request to send appointment notification to: ${to}`);
    
    const user = (process.env.SMTP_USER || "").trim();
    const pass = (process.env.SMTP_PASS || "").trim();
    const fromName = (process.env.SMTP_FROM || user).trim();

    if (!user || !pass) {
      console.warn("[Email] SMTP credentials missing in process.env");
      return res.status(200).json({ 
        status: "skipped", 
        message: "SMTP_USER or SMTP_PASS not found in environment variables." 
      });
    }

    try {
      await transporter.sendMail({
        from: `"FisioCareHub" <${fromName}>`,
        to,
        subject,
        html: body,
      });
      console.log(`[Email] Successfully sent to: ${to}`);
      res.json({ status: "ok" });
    } catch (error: any) {
      console.error("[Email] Error sending email:", error);
      res.status(500).json({ error: `Failed to send email: ${error.message}` });
    }
  });

  app.post("/api/notify/test", async (req, res) => {
    console.log("[Email] Test request received");
    const user = (process.env.SMTP_USER || "").trim();
    const pass = (process.env.SMTP_PASS || "").trim();
    const fromName = (process.env.SMTP_FROM || user).trim();

    if (!user || !pass) {
      console.warn("[Email] Test failed: SMTP credentials missing in process.env");
      return res.status(400).json({ 
        error: "Credenciais SMTP não encontradas no ambiente. Verifique se SMTP_USER e SMTP_PASS estão configurados corretamente no menu Settings do AI Studio." 
      });
    }

    try {
      console.log(`[Email] Attempting to send test email to: ${user}`);
      await transporter.sendMail({
        from: `"FisioCareHub Test" <${fromName}>`,
        to: user, // Send to self
        subject: "Teste de Configuração de E-mail - FisioCareHub",
        html: `
          <div style="font-family: sans-serif; color: #334155; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #10b981;">Sucesso!</h2>
            <p>Se você está recebendo este e-mail, sua configuração SMTP no <strong>FisioCareHub</strong> está funcionando corretamente.</p>
            <p><strong>Configurações utilizadas:</strong></p>
            <ul style="color: #64748b;">
              <li>Serviço: ${user.includes('gmail.com') ? 'Gmail (Otimizado)' : 'SMTP Customizado'}</li>
              <li>Usuário: ${user}</li>
              <li>Remetente: ${fromName}</li>
            </ul>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #94a3b8;">
              Este é um e-mail de teste automático.
            </p>
          </div>
        `,
      });
      console.log("[Email] Test email sent successfully");
      res.json({ status: "ok", message: "E-mail de teste enviado com sucesso!" });
    } catch (error: any) {
      console.error("[Email] Error sending test email:", error);
      let errorMsg = error.message || "Erro desconhecido";
      
      if (errorMsg.includes("EAUTH") || errorMsg.includes("Invalid login") || errorMsg.includes("535")) {
        errorMsg = "Erro de Autenticação (535): Usuário ou Senha incorretos. \n\nIMPORTANTE: Se usa Gmail, você DEVE usar uma 'Senha de App' de 16 dígitos, não sua senha normal. Verifique também se não há espaços extras no menu Settings.";
      } else if (errorMsg.includes("ECONNREFUSED")) {
        errorMsg = "Erro de Conexão: Não foi possível conectar ao servidor SMTP. Verifique o Host e a Porta.";
      }

      res.status(500).json({ error: `Erro ao enviar e-mail: ${errorMsg}` });
    }
  });

  // Stripe Checkout
  // Stripe Health Check
  app.get("/api/stripe-health", async (req, res) => {
    try {
      const stripe = getStripe();
      const account = await stripe.accounts.retrieve();
      res.json({ status: "ok", accountId: account.id });
    } catch (error: any) {
      console.error("[Stripe] Health check failed:", error);
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.post("/api/create-checkout-session", async (req, res) => {
    const { planId, userId, userEmail } = req.body;
    console.log(`[Stripe] Requesting checkout session for plan: ${planId}, user: ${userId}`);

    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn("[Stripe] STRIPE_SECRET_KEY missing in environment");
      return res.status(400).json({ error: "Stripe not configured" });
    }

    const planDetails = {
      basic: { name: "Plano Basic", amount: 0 },
      pro: { name: "Plano Pro", amount: 3990 },
    }[planId as keyof typeof planDetails];

    if (!planDetails) {
      console.warn(`[Stripe] Invalid plan requested: ${planId}`);
      return res.status(400).json({ error: "Invalid plan" });
    }

    try {
      // For basic plan, we don't need Stripe checkout
      if (planId === 'basic') {
        return res.status(400).json({ error: "Basic plan does not require checkout" });
      }

      const priceId = (process.env.STRIPE_PRICE_ID || "").trim();
      console.log(`[Stripe] Using Price ID: ${priceId || "Dynamic (price_data)"}`);

      // Determine the base URL for redirects, ensuring it has a protocol
      let baseUrl = (process.env.APP_URL || req.headers.origin || "http://localhost:3000").trim().replace(/\/$/, "");
      if (!baseUrl.startsWith('http')) {
        baseUrl = `https://${baseUrl}`;
      }
      console.log(`[Stripe] Base URL for redirects: ${baseUrl}`);

      const sessionOptions: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ["card"],
        line_items: [
          priceId 
            ? { price: priceId, quantity: 1 }
            : {
                price_data: {
                  currency: "brl",
                  product_data: {
                    name: planDetails.name,
                  },
                  unit_amount: planDetails.amount,
                  recurring: {
                    interval: "month",
                  },
                },
                quantity: 1,
              },
        ],
        mode: "subscription",
        subscription_data: {
          trial_period_days: 30,
        },
        success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}&plan_id=${planId}`,
        cancel_url: `${baseUrl}/dashboard/assinatura`,
        customer_email: userEmail,
        metadata: {
          userId,
          planId,
        },
      };

      console.log("[Stripe] Creating session with options:", JSON.stringify({
        ...sessionOptions,
        customer_email: userEmail ? "HIDDEN" : "MISSING"
      }, null, 2));

      const stripe = getStripe();
      const session = await stripe.checkout.sessions.create(sessionOptions);
      console.log(`[Stripe] Session created successfully: ${session.id}`);
      console.log(`[Stripe] Redirect URL: ${session.url}`);

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("[Stripe] Error creating session:", error);
      res.status(500).json({ 
        error: "Erro ao criar sessão de checkout", 
        details: error.message,
        code: error.code
      });
    }
  });

  // Stripe Customer Portal
  app.post("/api/create-portal-session", async (req, res) => {
    const { userId, userEmail } = req.body;
    console.log(`[Stripe] Requesting portal session for user: ${userId}`);

    try {
      const stripe = getStripe();
      
      // 1. Try to find the customer ID from Firestore
      let customerId: string | null = null;
      if (dbAdmin && userId) {
        const userDoc = await dbAdmin.collection('users').doc(userId).get();
        if (userDoc.exists) {
          customerId = userDoc.data()?.subscription?.stripeCustomerId;
        }
      }

      // 2. If not in Firestore, try to find by email in Stripe
      if (!customerId && userEmail) {
        const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        }
      }

      if (!customerId) {
        console.warn(`[Stripe] No customer found for user: ${userId}`);
        return res.status(404).json({ error: "Você ainda não possui uma assinatura ativa no Stripe." });
      }

      // Determine the base URL for redirects
      let baseUrl = (process.env.APP_URL || req.headers.origin || "http://localhost:3000").trim().replace(/\/$/, "");
      if (!baseUrl.startsWith('http')) {
        baseUrl = `https://${baseUrl}`;
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${baseUrl}/profile`,
      });

      res.json({ url: portalSession.url });
    } catch (error: any) {
      console.error("[Stripe] Error creating portal session:", error);
      res.status(500).json({ error: "Erro ao abrir portal de gerenciamento", details: error.message });
    }
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
  });
}

startServer();
