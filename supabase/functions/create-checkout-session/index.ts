import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")
const APP_URL = Deno.env.get("APP_URL") || "http://localhost:3000"
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")

const FIXED_SUBSCRIPTION_PRICE_ID = "price_1TKGuwPm0ENTPw0SA8SPjo9I"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    if (!STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY não configurada")
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Configuração do Supabase ausente")
    }

    const body = await req.json().catch(() => ({}))

    const {
      appointment_id,
      amount,
      product_id,
      type,
      user_id,
      email
    } = body

    console.log("Checkout request:", body)

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    })

    const authHeader = req.headers.get("Authorization")

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader || "",
        },
      },
    })

    let line_items: any[] = []
    let mode: "subscription" | "payment" = "payment"

    const metadata: any = {
      user_id: user_id || "",
    }

    // ----------------------
    // ASSINATURA PRO
    // ----------------------
    if (type === "subscription") {

      line_items = [
        {
          price: FIXED_SUBSCRIPTION_PRICE_ID,
          quantity: 1,
        },
      ]

      mode = "subscription"
      metadata.plan = "pro_fisioterapeuta"
    }

    // ----------------------
    // PAGAMENTO DE CONSULTA
    // ----------------------
    else if (appointment_id) {

      const safeAmount = Number(amount)

      if (isNaN(safeAmount) || safeAmount <= 0) {
        throw new Error("Valor inválido para o agendamento")
      }

      const unitAmount = Math.round(safeAmount * 100)

      line_items = [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: "Consulta / Atendimento",
              description: "Pagamento de serviço de fisioterapia",
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ]

      metadata.type = "appointment"
      metadata.appointment_id = appointment_id
    }

    // ----------------------
    // MATERIAL DIGITAL
    // ----------------------
    else if (type === "material" && product_id) {

      const { data: material, error } = await supabase
        .from("materiais")
        .select("*")
        .eq("id", product_id)
        .single()

      if (error || !material) {
        throw new Error("Material não encontrado")
      }

      const price = Number(material.preco)

      if (isNaN(price)) {
        throw new Error("Preço do material inválido")
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
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ]

      metadata.type = "material"
      metadata.product_id = product_id
    }

    // ----------------------
    // FALLBACK
    // ----------------------
    else {

      line_items = [
        {
          price: FIXED_SUBSCRIPTION_PRICE_ID,
          quantity: 1,
        },
      ]

      mode = "subscription"
      metadata.plan = "pro_fisioterapeuta"
    }

    const customerEmail = email || undefined

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode,
      success_url: `${APP_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/dashboard?cancel=true`,
      customer_email: customerEmail,
      client_reference_id: user_id || undefined,
      metadata,
    })

    console.log("Stripe session criada:", session.id)

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    })

  } catch (error: any) {

    console.error("Stripe checkout error:", error)

    return new Response(
      JSON.stringify({
        error: error.message || "Erro ao criar sessão de pagamento",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    )
  }
})
