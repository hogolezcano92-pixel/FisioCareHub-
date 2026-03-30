import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe?target=deno"

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")
const FIREBASE_PROJECT_ID = Deno.env.get("VITE_FIREBASE_PROJECT_ID")
const FIREBASE_SERVICE_ACCOUNT = Deno.env.get("FIREBASE_SERVICE_ACCOUNT") // JSON string

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Function to update Firestore via REST API
async function updateFirestore(userId: string, data: any) {
  if (!FIREBASE_PROJECT_ID) throw new Error("FIREBASE_PROJECT_ID missing")
  
  // This is a simplified version. In a real app, you'd need an access token from the service account.
  // For now, we'll assume the user has configured the project correctly.
  // If we can't get an access token easily, we'll log the update for now.
  console.log(`[Firestore Update] User: ${userId}, Data:`, data)
  
  // Real implementation would use Google Auth to get a token and then call:
  // PATCH https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/users/{user_id}?updateMask.fieldPaths=subscription.status&...
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const sig = req.headers.get("stripe-signature")

  if (!sig || !STRIPE_WEBHOOK_SECRET || !STRIPE_SECRET_KEY) {
    return new Response("Webhook Error: Missing signature or secret", { status: 400 })
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2022-11-15",
    httpClient: Stripe.createFetchHttpClient(),
  })

  let event

  try {
    const body = await req.text()
    event = await stripe.webhooks.constructEventAsync(body, sig, STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    console.error(`[Stripe Webhook] Error: ${err.message}`)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  console.log(`[Stripe Webhook] Event received: ${event.type}`)

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId
      if (userId) {
        await updateFirestore(userId, {
          'subscription.stripeCustomerId': session.customer,
          'subscription.status': 'active',
          'subscription.plan': session.metadata?.planId || 'pro'
        })
      }
      break
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice
      // Handle payment success email via another Edge Function or internal call
      break
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice
      // Handle payment failure email
      break
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription
      // Handle cancellation
      break
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  })
})
