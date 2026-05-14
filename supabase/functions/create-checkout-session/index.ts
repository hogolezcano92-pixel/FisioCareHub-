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
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// NÃO ALTERAR: este Price ID é usado somente para assinatura Pro.
const FIXED_SUBSCRIPTION_PRICE_ID = "price_1TKGuwPm0ENTPw0-SA8SPjo9l"

const normalizeBrazilianAmount = (rawValue: unknown): number => {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return NaN
  }

  if (typeof rawValue === "number") {
    return rawValue
  }

  let cleaned = String(rawValue)
    .replace("R$", "")
    .replace(/\s/g, "")
    .trim()

  const hasComma = cleaned.includes(",")
  const hasDot = cleaned.includes(".")

  // Ex.: 1.250,00 -> 1250.00
  if (hasComma && hasDot) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".")
  } else if (hasComma) {
    // Ex.: 25,99 -> 25.99
    cleaned = cleaned.replace(",", ".")
  }
  // Ex.: 25.99 permanece 25.99
  // Ex.: 2500 permanece 2500

  return Number(cleaned)
}

const getMaterialAmountCents = (item: any): number => {
  const rawValue =
    item.amount_cents ??
    item.price_cents ??
    item.valor_centavos ??
    item.valor_cents ??
    item.amount ??
    item.valor ??
    item.total ??
    item.preco ??
    item.price

  const normalizedValue = normalizeBrazilianAmount(rawValue)

  if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
    throw new Error(`Valor (amount) inválido para o material: ${item.title || item.id}`)
  }

  // Campos com estes nomes já devem estar em centavos.
  // Ex.: price_cents = 2599 significa R$ 25,99.
  const centsFields = [
    item.amount_cents,
    item.price_cents,
    item.valor_centavos,
    item.valor_cents,
  ]

  const isAlreadyInCents = centsFields.some(value => value === rawValue)

  const amountCents = isAlreadyInCents
    ? Math.round(normalizedValue)
    : Math.round(normalizedValue * 100)

  if (!Number.isInteger(amountCents) || amountCents < 50) {
    throw new Error(`Valor (amount) inválido para o material: ${item.title || item.id}`)
  }

  return amountCents
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { appointment_id, amount, product_id, material_ids, type, user_id, email, plan, service_name } = body

    const finalType = type || (
      plan === "pro"
        ? "subscription"
        : appointment_id
          ? "appointment"
          : material_ids
            ? "material"
            : plan || "subscription"
    )

    const finalEmail = email || ""
    const finalUserId = user_id || ""

    const authHeader = req.headers.get("Authorization")

    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader || "" } },
    })

    if (!STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set")
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2022-11-15",
      httpClient: Stripe.createFetchHttpClient(),
    })

    let line_items = []
    let mode: "subscription" | "payment" = "payment"
    let metadata: any = { user_id: finalUserId }

    if (finalType === "subscription" || plan === "pro") {
      line_items = [
        {
          price: FIXED_SUBSCRIPTION_PRICE_ID,
          quantity: 1,
        },
      ]

      mode = "subscription"
      metadata.plan = plan || "pro_fisioterapeuta"
    } else if (appointment_id) {
      const safeAmount = Number(amount)

      if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
        throw new Error("Valor inválido para o agendamento")
      }

      const unitAmount = Math.round(safeAmount * 100)

      if (!Number.isInteger(unitAmount) || unitAmount < 50) {
        throw new Error("Valor inválido para o agendamento")
      }

      line_items = [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: service_name || "Consulta / Atendimento",
              description: "Pagamento de serviço de fisioterapia",
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ]

      mode = "payment"
      metadata.type = "appointment"
      metadata.appointmentId = appointment_id
    } else if (
      (["material", "library"].includes(finalType) || ["material", "library"].includes(type)) &&
      (product_id || material_ids)
    ) {
      const ids = material_ids || [product_id]

      const { data: materials, error: matError } = await supabase
        .from("library_materials")
        .select("*")
        .in("id", ids)

      if (matError || !materials || materials.length === 0) {
        throw new Error("Materiais não encontrados")
      }

      line_items = materials.map((item) => {
        const materialTitle = item.title || "Material de Saúde"
        const unitAmount = getMaterialAmountCents(item)

        console.info("[Stripe Library Checkout]", {
          materialId: item.id,
          materialTitle,
          unitAmount,
          rawValues: {
            amount_cents: item.amount_cents,
            price_cents: item.price_cents,
            valor_centavos: item.valor_centavos,
            valor_cents: item.valor_cents,
            amount: item.amount,
            valor: item.valor,
            total: item.total,
            preco: item.preco,
            price: item.price,
          },
        })

        return {
          price_data: {
            currency: "brl",
            product_data: {
              name: materialTitle,
              description: item.description || "Material de Saúde",
              images: item.cover_image ? [item.cover_image] : [],
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        }
      })

      mode = "payment"
      metadata.type = material_ids ? "library_purchase_bulk" : "library_purchase"
      metadata.material_ids = ids.join(",")

      if (!material_ids) {
        metadata.material_id = product_id
      }
    } else {
      line_items = [
        {
          price: FIXED_SUBSCRIPTION_PRICE_ID,
          quantity: 1,
        },
      ]

      mode = "subscription"
      metadata.plan = plan || "pro_fisioterapeuta"
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode,
      success_url: `${APP_URL}/dashboard?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/subscription`,
      customer_email: finalEmail,
      client_reference_id: finalUserId,
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
