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
    const { planId, userId, userEmail } = await req.json()

    if (!STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set")
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2022-11-15",
      httpClient: Stripe.createFetchHttpClient(),
    })

    const planDetails = {
      basic: { name: "Plano Basic", amount: 0 },
      pro: { name: "Plano Pro", amount: 3990 },
    }[planId as "basic" | "pro"]

    if (!planDetails) {
      throw new Error("Invalid plan")
    }

    const priceId = Deno.env.get("STRIPE_PRICE_ID")

    const session = await stripe.checkout.sessions.create({
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
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      success_url: `${APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}&plan_id=${planId}`,
      cancel_url: `${APP_URL}/dashboard/assinatura`,
      customer_email: userEmail,
      metadata: {
        userId,
        planId,
      },
    })

    return new Response(JSON.stringify({ url: session.url }), {
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
