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

    // Fallback logic for types/plans
    const finalType = type || (plan === 'pro' ? 'subscription' : (appointment_id ? 'appointment' : (material_ids ? 'material' : (plan || 'subscription'))))
    const finalEmail = email || ""
    const finalUserId = user_id || ""

    // Setup Supabase client
    const authHeader = req.headers.get('Authorization')
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader || "" } },
    })

    // Validate Stripe Key
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

    // Logic for different payment types
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
      // Dynamic appointment payment
      const safeAmount = Number(amount)
      if (isNaN(safeAmount) || safeAmount <= 0) {
        throw new Error("Valor inválido para o agendamento")
      }

      // Convert to cents and ensure it's an integer
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
    } else if ((['material', 'library'].includes(finalType) || ['material', 'library'].includes(type)) && (product_id || material_ids)) {
      // Material logic
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
        console.info(`[Stripe Debug] Processing materialId: ${materialId}`);
        
        // 3. Validação e Busca do Valor
        let priceFromDb = item.price;
        console.info(`[Stripe Debug] Price from DB: ${priceFromDb}`);

        // Corrigir automaticamente casos como "49,90" -> 49.90
        let normalizedPrice = 0;
        if (typeof priceFromDb === 'string') {
          normalizedPrice = parseFloat(priceFromDb.replace(',', '.'));
        } else {
          normalizedPrice = Number(priceFromDb);
        }

        // 4. Conversão obrigatória para centavos
        const amount = Math.round(normalizedPrice * 100);
        console.info(`[Stripe Debug] Final amount (cents) for ${materialTitle}: ${amount}`);

        // Validar que amount é inteiro e > 0
        if (!Number.isInteger(amount) || amount < 1) {
          throw new Error(`Preço inválido para o material: ${materialTitle} (${amount})`);
        }

        // Stripe minimum check (usually 50 cents for BRL)
        const finalAmount = Math.max(amount, 50);

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
      // Default to PRO subscription or fallback
      line_items = [
        {
          price: FIXED_SUBSCRIPTION_PRICE_ID,
          quantity: 1,
        },
      ]
      mode = "subscription"
      metadata.plan = plan || "pro_fisioterapeuta"
    }

    // Create Stripe Checkout Session
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
