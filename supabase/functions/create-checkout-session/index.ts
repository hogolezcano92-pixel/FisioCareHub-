import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe?target=deno"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")
const APP_URL = Deno.env.get("APP_URL") || "http://localhost:3000"
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { user_id, email, product_id, type } = await req.json()
    const userId = user_id
    const userEmail = email

    // Optional: Verify user with Supabase Auth if token is present
    const authHeader = req.headers.get('Authorization')
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader || "" } },
    })

    if (authHeader) {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user || user.id !== userId) {
        throw new Error("Unauthorized: Invalid user session")
      }
    }

    if (!STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set")
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2022-11-15",
      httpClient: Stripe.createFetchHttpClient(),
    })

    let line_items = []
    let mode: "subscription" | "payment" = "subscription"
    let metadata: any = { user_id: userId }

    if (type === 'material' && product_id) {
      // Fetch material details
      const { data: material, error: matError } = await supabase
        .from('materiais')
        .select('*')
        .eq('id', product_id)
        .single()
      
      if (matError || !material) {
        throw new Error("Material não encontrado")
      }

      line_items = [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: material.titulo,
              description: material.descricao,
              images: material.imagem_url ? [material.imagem_url] : [],
            },
            unit_amount: Math.round(material.preco * 100),
          },
          quantity: 1,
        },
      ]
      mode = "payment"
      metadata.type = 'material'
      metadata.product_id = product_id
    } else {
      // Default to PRO subscription
      line_items = [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: "Assinatura PRO Fisioterapeuta",
              description: "Acesso total aos recursos avançados do FisioCareHub",
            },
            unit_amount: 4999, // R$ 49,99
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ]
      mode = "subscription"
      metadata.plan = "pro_fisioterapeuta"
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode,
      success_url: `${APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}&type=${type || 'subscription'}`,
      cancel_url: `${APP_URL}/subscription`,
      customer_email: userEmail,
      client_reference_id: userId,
      subscription_data: mode === "subscription" ? {
        metadata: {
          user_id: userId,
        },
      } : undefined,
      metadata,
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error: any) {
    console.error("Error creating checkout session:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
