import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe?target=deno"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      const user_id = session.metadata?.user_id
      
      if (user_id) {
        console.log(`[Stripe Webhook] Atualizando perfil para usuário: ${user_id}`)
        
        const { error } = await supabase
          .from('perfis')
          .update({ 
            is_pro: true, 
            plano: 'pro' 
          })
          .eq('id', user_id)

        if (error) {
          console.error(`[Stripe Webhook] Erro ao atualizar perfil:`, error)
          return new Response(JSON.stringify({ error: error.message }), { status: 500 })
        }

        // Também criar registro na tabela assinaturas
        await supabase
          .from('assinaturas')
          .upsert({
            user_id: user_id,
            plano: 'pro',
            status: 'ativo',
            valor: 49.99,
            data_inicio: new Date().toISOString(),
            data_expiracao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          })

        console.log(`[Stripe Webhook] Perfil atualizado com sucesso para: ${user_id}`)
      }
      break
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription
      // Opcional: buscar user_id via stripe customer id e desativar is_pro
      break
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  })
})
