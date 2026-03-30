import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe?target=deno"

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")
const APP_URL = Deno.env.get("APP_URL") || "http://localhost:3000"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { userId, userEmail, customerId } = await req.json()

    if (!STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set")
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2022-11-15",
      httpClient: Stripe.createFetchHttpClient(),
    })

    let finalCustomerId = customerId

    if (!finalCustomerId && userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 })
      if (customers.data.length > 0) {
        finalCustomerId = customers.data[0].id
      }
    }

    if (!finalCustomerId) {
      throw new Error("No customer found")
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: finalCustomerId,
      return_url: `${APP_URL}/profile`,
    })

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
