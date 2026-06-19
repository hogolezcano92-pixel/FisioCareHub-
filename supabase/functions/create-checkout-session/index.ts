import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@11.2.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")
const APP_URL = Deno.env.get("APP_URL") || "http://localhost:3000"
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")

const STRIPE_PRICE_BASIC_MONTHLY = Deno.env.get("STRIPE_PRICE_BASIC_MONTHLY")
const STRIPE_PRICE_PRO_MONTHLY = Deno.env.get("STRIPE_PRICE_PRO_MONTHLY")
const STRIPE_PRICE_PRO_SEMESTER = Deno.env.get("STRIPE_PRICE_PRO_SEMESTER")
const STRIPE_PRICE_PRO_YEARLY = Deno.env.get("STRIPE_PRICE_PRO_YEARLY")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const PRICE_IDS = {
  basic_monthly: STRIPE_PRICE_BASIC_MONTHLY,
  pro_monthly: STRIPE_PRICE_PRO_MONTHLY,
  pro_semester: STRIPE_PRICE_PRO_SEMESTER,
  pro_yearly: STRIPE_PRICE_PRO_YEARLY,
} as const

type PlanKey = keyof typeof PRICE_IDS

const PLAN_ALIASES: Record<string, PlanKey> = {
  basic: "basic_monthly",
  basic_monthly: "basic_monthly",
  basic_mensal: "basic_monthly",

  pro: "pro_monthly",
  pro_monthly: "pro_monthly",
  pro_mensal: "pro_monthly",

  pro_semester: "pro_semester",
  pro_semesterly: "pro_semester",
  pro_semestral: "pro_semester",

  pro_yearly: "pro_yearly",
  pro_annual: "pro_yearly",
  pro_anual: "pro_yearly",
}

const getBillingCycleFromPlanKey = (planKey: PlanKey): "monthly" | "semester" | "yearly" => {
  if (planKey === "pro_semester") return "semester"
  if (planKey === "pro_yearly") return "yearly"
  return "monthly"
}

const getPlanNameFromPlanKey = (planKey: PlanKey): "basic" | "pro" => {
  return planKey === "basic_monthly" ? "basic" : "pro"
}

const resolveSubscriptionPlanKey = (rawPlan: unknown, rawBillingCycle?: unknown): PlanKey => {
  const plan = String(rawPlan || "").trim().toLowerCase()
  const billingCycle = String(rawBillingCycle || "").trim().toLowerCase()

  const directAlias = PLAN_ALIASES[plan]
  if (directAlias) return directAlias

  const combinedAlias = PLAN_ALIASES[`${plan}_${billingCycle}`]
  if (combinedAlias) return combinedAlias

  if (plan === "basic") return "basic_monthly"

  if (plan === "pro") {
    if (["semester", "semestral", "semestre", "semiannual", "semi_annual"].includes(billingCycle)) {
      return "pro_semester"
    }

    if (["yearly", "annual", "anual", "ano", "year"].includes(billingCycle)) {
      return "pro_yearly"
    }

    return "pro_monthly"
  }

  throw new Error("Plano de assinatura inválido")
}

const getSubscriptionPriceId = (planKey: PlanKey): string => {
  const priceId = PRICE_IDS[planKey]

  if (!priceId) {
    throw new Error(`Price ID não configurado no Supabase Secret para o plano: ${planKey}`)
  }

  if (!priceId.startsWith("price_")) {
    throw new Error(`Price ID inválido para o plano ${planKey}. O valor deve começar com price_`)
  }

  return priceId
}

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
  const centsCandidates = [
    item.amount_cents,
    item.price_cents,
    item.valor_centavos,
    item.valor_cents,
  ]

  for (const value of centsCandidates) {
    const normalizedValue = normalizeBrazilianAmount(value)

    if (Number.isFinite(normalizedValue) && normalizedValue > 0) {
      const amountCents = Math.round(normalizedValue)

      if (Number.isInteger(amountCents) && amountCents >= 50) {
        return amountCents
      }
    }
  }

  const reaisCandidates = [
    item.amount,
    item.valor,
    item.total,
    item.preco,
    item.price,
  ]

  for (const value of reaisCandidates) {
    const normalizedValue = normalizeBrazilianAmount(value)

    if (Number.isFinite(normalizedValue) && normalizedValue > 0) {
      const amountCents = Math.round(normalizedValue * 100)

      if (Number.isInteger(amountCents) && amountCents >= 50) {
        return amountCents
      }
    }
  }

  throw new Error(`Valor (amount) inválido para o material: ${item.title || item.id}`)
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const {
      appointment_id,
      amount,
      product_id,
      material_ids,
      type,
      user_id,
      email,
      plan,
      plan_key,
      billing_cycle,
      service_name,
    } = body

    const requestedType = String(type || "").trim().toLowerCase()
    const isMaterialRequest =
      ["material", "library"].includes(requestedType) || Boolean(material_ids || product_id)
    const isSubscriptionRequest =
      !isMaterialRequest && Boolean(plan || plan_key || billing_cycle)

    const finalType = requestedType || (
      appointment_id
        ? "appointment"
        : isMaterialRequest
          ? "material"
          : isSubscriptionRequest
            ? "subscription"
            : "subscription"
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

    let line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = []
    let mode: "subscription" | "payment" = "payment"
    let metadata: Record<string, string> = { user_id: String(finalUserId || "") }

    if (finalType === "subscription" && !isMaterialRequest) {
      const resolvedPlanKey = resolveSubscriptionPlanKey(plan_key || plan, billing_cycle)
      const resolvedPriceId = getSubscriptionPriceId(resolvedPlanKey)
      const resolvedPlan = getPlanNameFromPlanKey(resolvedPlanKey)
      const resolvedBillingCycle = getBillingCycleFromPlanKey(resolvedPlanKey)

      line_items = [
        {
          price: resolvedPriceId,
          quantity: 1,
        },
      ]

      mode = "subscription"
      metadata = {
        ...metadata,
        type: "subscription",
        payment_area: "subscription",
        plan: resolvedPlan,
        plan_key: resolvedPlanKey,
        billing_cycle: resolvedBillingCycle,
      }
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
      metadata = {
        ...metadata,
        type: "appointment",
        appointment_id: String(appointment_id),
        appointmentId: String(appointment_id),
        agendamento_id: String(appointment_id),
        agendamentoId: String(appointment_id),
      }
    } else if (
      isMaterialRequest &&
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
      metadata = {
        ...metadata,
        type: material_ids ? "library_purchase_bulk" : "library_purchase",
        material_ids: ids.join(","),
        payment_area: "health_library",
      }

      if (!material_ids) {
        metadata.material_id = String(product_id)
      }
    } else {
      const resolvedPlanKey = resolveSubscriptionPlanKey(plan_key || plan || "pro_monthly", billing_cycle)
      const resolvedPriceId = getSubscriptionPriceId(resolvedPlanKey)
      const resolvedPlan = getPlanNameFromPlanKey(resolvedPlanKey)
      const resolvedBillingCycle = getBillingCycleFromPlanKey(resolvedPlanKey)

      line_items = [
        {
          price: resolvedPriceId,
          quantity: 1,
        },
      ]

      mode = "subscription"
      metadata = {
        ...metadata,
        type: "subscription",
        payment_area: "subscription",
        plan: resolvedPlan,
        plan_key: resolvedPlanKey,
        billing_cycle: resolvedBillingCycle,
      }
    }

    const isLibraryCheckout =
      metadata.type === "library_purchase" || metadata.type === "library_purchase_bulk"

    const isSubscriptionCheckout = metadata.type === "subscription"

    const successPath = appointment_id
      ? `/appointments?status=success&payment=appointment&session_id={CHECKOUT_SESSION_ID}`
      : isLibraryCheckout
        ? `/patient/library?status=success&payment=library&session_id={CHECKOUT_SESSION_ID}`
        : `/dashboard?status=success&session_id={CHECKOUT_SESSION_ID}${isSubscriptionCheckout ? `&plan_id=${metadata.plan}&plan_key=${metadata.plan_key}` : ""}`

    const cancelPath = appointment_id
      ? `/pagamento/${appointment_id}?status=canceled`
      : isLibraryCheckout
        ? `/patient/library?status=canceled&payment=library`
        : `/subscription`

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items,
      mode,
      success_url: `${APP_URL}${successPath}`,
      cancel_url: `${APP_URL}${cancelPath}`,
      client_reference_id: finalUserId,
      metadata,
    }

    if (finalEmail) {
      sessionParams.customer_email = finalEmail
    }

    if (mode === "subscription") {
      sessionParams.subscription_data = {
        metadata,
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
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
