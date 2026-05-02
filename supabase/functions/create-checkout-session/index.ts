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

const FIXED_SUBSCRIPTION_PRICE_ID = "price_1TKGuwPm0ENTPw0-SA8SPjo9l"

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { appointment_id, amount, product_id, material_ids, type, user_id, email, plan, service_name } = body

    // ✅ CORREÇÃO: detectar material automaticamente
    const isMaterialPurchase = material_ids || product_id;

    const finalType = isMaterialPurchase
      ? "material"
      : (type || (plan === 'pro'
          ? 'subscription'
          : (appointment_id ? 'appointment' : 'subscription')))

    const finalEmail = email || ""
    const finalUserId = user_id || ""

    const authHeader = req.headers.get('Authorization')
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

    if (finalType === 'subscription' || plan === 'pro') {

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
      if (isNaN(safeAmount) || safeAmount <= 0) {
        throw new Error("Valor inválido para o agendamento")
      }

      const unitAmount = Math.round(safeAmount * 100)
      
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
      metadata.type = 'appointment'
      metadata.appointmentId = appointment_id

    // ✅ CORREÇÃO: fluxo de material garantido
    } else if (material_ids || product_id) {

      const ids = material_ids || [product_id]

      const { data: materials, error: matError } = await supabase
        .from('library_materials')
        .select('*')
        .in('id', ids)
      
      if (matError || !materials || materials.length === 0) {
        throw new Error("Materiais não encontrados")
      }

      line_items = materials.map(item => {
        const materialId = item.id;
        const materialTitle = item.title;

        console.info(`[Stripe Debug] Processing materialId: ${materialId}`)

        let priceFromDb = item.price

        console.info(`[Stripe Debug] Price from DB: ${priceFromDb}`)

        // ✅ NORMALIZAÇÃO SEGURA
        let normalizedPrice = 0

        if (typeof priceFromDb === "string") {
          normalizedPrice = Number(
            priceFromDb
              .replace(/[^\d,.-]/g, "")
              .replace(",", ".")
          )
        } else {
          normalizedPrice = Number(priceFromDb)
        }

        if (!normalizedPrice || isNaN(normalizedPrice) || normalizedPrice <= 0) {
          console.error("ERRO PREÇO:", {
            materialId,
            materialTitle,
            original: priceFromDb,
            normalizedPrice
          })
          throw new Error(`Preço inválido no banco para: ${materialTitle}`)
        }

        const amount = Math.round(normalizedPrice * 100)

        console.info(`[Stripe Debug] Final amount (cents) for ${materialTitle}: ${amount}`)

        if (!Number.isInteger(amount) || amount < 1) {
          console.error("ERRO AMOUNT:", {
            materialId,
            materialTitle,
            normalizedPrice,
            amount
          })
          throw new Error(`Amount inválido para: ${materialTitle}`)
        }

        const finalAmount = Math.max(amount, 50)

        return {
          price_data: {
            currency: "brl",
            product_data: {
              name: materialTitle,
              description: item.description || "Material de Saúde",
              images: item.cover_image ? [item.cover_image] : [],
            },
            unit_amount: finalAmount,
          },
          quantity: 1,
        }
      })
      
      mode = "payment"
      metadata.type = material_ids ? 'library_purchase_bulk' : 'library_purchase'
      metadata.material_ids = ids.join(',')
      if (!material_ids) metadata.material_id = product_id

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
