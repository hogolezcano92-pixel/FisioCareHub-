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

  try {
    if (event.type === "checkout.session.completed" || event.type === "invoice.paid") {
      const session = event.data.object as any
      
      // No caso de invoice.paid, o user_id pode estar no metadata da invoice, 
      // no metadata da subscription ou no customer metadata
      let user_id = session.metadata?.user_id || session.client_reference_id
      
      // Se for invoice.paid e não temos user_id, tentamos buscar na subscription
      if (!user_id && session.subscription && event.type === "invoice.paid") {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        user_id = subscription.metadata?.user_id
      }

      // Se ainda não temos, tentamos buscar no customer do Stripe
      if (!user_id && session.customer) {
        const customer = await stripe.customers.retrieve(session.customer as string) as Stripe.Customer
        user_id = customer.metadata?.user_id
      }

      if (user_id) {
        console.log(`[Stripe Webhook] Verificando existência do usuário: ${user_id}`)
        
        // Verificar se o usuário existe
        const { data: existingUser, error: checkError } = await supabase
          .from('perfis')
          .select('id')
          .eq('id', user_id)
          .maybeSingle()

        if (checkError || !existingUser) {
          console.error(`[Stripe Webhook] Erro: Usuário ${user_id} não encontrado na tabela perfis.`)
          return new Response(JSON.stringify({ error: "User not found" }), { status: 404 })
        }

        console.log(`[Stripe Webhook] Processando pagamento para usuário: ${user_id}`)
        
        // Se for compra de material
        if (session.metadata?.type === 'material') {
          const { error: purchaseError } = await supabase
            .from('compras_materiais')
            .insert({
              user_id: user_id,
              material_id: session.metadata.product_id,
              valor: session.amount_total / 100,
              status: 'pago'
            })
          
          if (purchaseError) {
            console.error(`[Stripe Webhook] Erro ao registrar compra de material:`, purchaseError)
          } else {
            console.log(`[Stripe Webhook] Sucesso: Material ${session.metadata.product_id} comprado por ${user_id}`)
          }
          return new Response(JSON.stringify({ received: true }), { status: 200 })
        }

        // 1. Atualizar a tabela perfis
        const { error: profileError } = await supabase
          .from('perfis')
          .update({ 
            is_pro: true, 
            plano: 'pro' 
          })
          .eq('id', user_id)

        if (profileError) {
          console.error(`[Stripe Webhook] Erro ao atualizar perfil:`, profileError)
          throw profileError
        }

        // 2. Atualizar ou criar registro na tabela assinaturas
        const { error: subError } = await supabase
          .from('assinaturas')
          .upsert({
            user_id: user_id,
            plano: 'pro',
            status: 'ativo',
            valor: 49.99,
            data_inicio: new Date().toISOString(),
            data_expiracao: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString() // 32 dias para margem
          }, { onConflict: 'user_id' })

        if (subError) {
          console.error(`[Stripe Webhook] Erro ao atualizar assinaturas:`, subError)
          // Não lançamos erro aqui para não dar falha no Stripe se o perfil já foi atualizado
        }

        console.log(`[Stripe Webhook] Sucesso: Usuário ${user_id} agora é PRO.`)
      } else {
        console.warn(`[Stripe Webhook] Aviso: user_id não encontrado no evento ${event.type}`)
      }
    }
  } catch (err: any) {
    console.error(`[Stripe Webhook] Erro no processamento: ${err.message}`)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  })
})
