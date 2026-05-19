import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe?target=deno"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const getAppointmentIdFromSession = (session: any) => {
  const metadata = session?.metadata || {}
  return metadata.appointment_id || metadata.appointmentId || metadata.agendamento_id || metadata.agendamentoId || null
}

const ensureClinicalPatientForAppointment = async (supabase: any, appointment: any) => {
  const patientProfileId = appointment.paciente_id
  const physioId = appointment.fisio_id || appointment.fisioterapeuta_id

  if (!patientProfileId || !physioId) {
    console.warn('[Stripe Webhook] Sem paciente_id ou fisio_id no agendamento:', appointment?.id)
    return null
  }

  const { data: existingPatient, error: existingError } = await supabase
    .from('pacientes')
    .select('id')
    .eq('perfil_id', patientProfileId)
    .eq('fisioterapeuta_id', physioId)
    .maybeSingle()

  if (existingError) {
    console.error('[Stripe Webhook] Erro ao buscar paciente clínico vinculado:', existingError)
  }

  if (existingPatient?.id) {
    return existingPatient.id
  }

  const { data: profile } = await supabase
    .from('perfis')
    .select('id, nome_completo, email, telefone, data_nascimento, avatar_url, foto_url')
    .eq('id', patientProfileId)
    .maybeSingle()

  const payload = {
    perfil_id: patientProfileId,
    fisioterapeuta_id: physioId,
    nome_completo: profile?.nome_completo || appointment.nome_paciente || 'Paciente',
    email: profile?.email || appointment.email_paciente || null,
    telefone: profile?.telefone || appointment.telefone_paciente || null,
    data_nascimento: profile?.data_nascimento || null,
    foto_url: profile?.foto_url || profile?.avatar_url || null,
    avatar_url: profile?.avatar_url || profile?.foto_url || null,
    tipo_paciente: 'externo',
    origem: 'agendamento',
    status: 'ativo',
    updated_at: new Date().toISOString(),
  }

  const { data: createdPatient, error: createError } = await supabase
    .from('pacientes')
    .insert(payload)
    .select('id')
    .single()

  if (createError) {
    console.error('[Stripe Webhook] Erro ao criar paciente clínico vinculado:', createError)
    return null
  }

  return createdPatient?.id || null
}


const upsertAppointmentPayment = async (supabase: any, session: any) => {
  const appointmentId = getAppointmentIdFromSession(session)
  if (!appointmentId) return false

  const { data: appointment, error: appError } = await supabase
    .from('agendamentos')
    .select('*')
    .eq('id', appointmentId)
    .maybeSingle()

  if (appError || !appointment) {
    console.error('[Stripe Webhook] Agendamento não encontrado:', appointmentId, appError)
    return false
  }

  const amountPaid = typeof session.amount_total === 'number'
    ? session.amount_total / 100
    : Number(appointment.valor || 0)

  const clinicalPatientId = await ensureClinicalPatientForAppointment(supabase, appointment)

  await supabase
    .from('agendamentos')
    .update({
      status: 'pendente',
      status_pagamento: 'pago',
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointmentId)

  const externalId = String(session.payment_intent || session.id)

  await supabase
    .from('pagamentos')
    .upsert({
      external_id: externalId,
      user_id: appointment.paciente_id,
      external_reference: String(appointmentId),
      amount: amountPaid,
      status: 'paid',
      gateway: 'stripe',
      method: 'credit_card',
      confirmed_at: new Date().toISOString(),
    }, { onConflict: 'external_id' })

  const { data: existingSessions } = await supabase
    .from('sessoes')
    .select('id')
    .eq('agendamento_id', appointmentId)
    .limit(1)

  const sessionPayload = {
    paciente_id: appointment.paciente_id,
    fisioterapeuta_id: appointment.fisio_id,
    agendamento_id: Number(appointmentId),
    data: appointment.data,
    hora: appointment.hora,
    valor_sessao: amountPaid || Number(appointment.valor || 0),
    status_pagamento: 'pago_app',
    stripe_payment_intent: String(session.payment_intent || session.id),
    status_repasse: 'pendente',
  }

  if (existingSessions && existingSessions.length > 0) {
    await supabase.from('sessoes').update(sessionPayload).eq('id', existingSessions[0].id)
  } else {
    await supabase.from('sessoes').insert(sessionPayload)
  }

  await supabase.from('notificacoes').insert([
    {
      user_id: appointment.paciente_id,
      titulo: 'Pagamento confirmado',
      mensagem: 'Recebemos seu pagamento. O agendamento agora aguarda confirmação do fisioterapeuta.',
      tipo: 'payment',
      lida: false,
      link: '/appointments',
    },
    {
      user_id: appointment.fisio_id,
      titulo: 'Nova consulta paga',
      mensagem: 'Um paciente pagou o serviço e aguarda sua confirmação de atendimento.',
      tipo: 'appointment',
      lida: false,
      link: '/agenda',
    },
  ])

  console.log('[Stripe Webhook] Pagamento de agendamento confirmado; aguardando confirmação do fisio:', appointmentId, clinicalPatientId)
  return true
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const sig = req.headers.get("stripe-signature")

  if (!sig || !STRIPE_WEBHOOK_SECRET || !STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response("Webhook Error: Missing signature, secret or Supabase config", { status: 400 })
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2022-11-15",
    httpClient: Stripe.createFetchHttpClient(),
  })

  let event: any

  try {
    const body = await req.text()
    event = await stripe.webhooks.constructEventAsync(body, sig, STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    console.error(`[Stripe Webhook] Error: ${err.message}`)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  console.log(`[Stripe Webhook] Event received: ${event.type}`)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any

      // Agendamentos precisam ser processados antes de assinatura.
      // Caso contrário, o pagamento de consulta vira PRO por engano.
      if (getAppointmentIdFromSession(session)) {
        await upsertAppointmentPayment(supabase, session)
        return new Response(JSON.stringify({ received: true, type: 'appointment' }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        })
      }

      const user_id = session.metadata?.user_id || session.client_reference_id

      if (session.metadata?.type === 'material' || session.metadata?.type === 'library_purchase' || session.metadata?.type === 'library_purchase_bulk') {
        const materialIdsString = session.metadata.material_ids || session.metadata.product_id
        if (!user_id || !materialIdsString) {
          return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200 })
        }

        const materialIds = materialIdsString.split(',').filter(Boolean)
        const purchaseRecords = materialIds.map((id: string) => ({
          patient_id: user_id,
          material_id: id,
          purchased_at: new Date().toISOString()
        }))

        await supabase.from('material_purchases').insert(purchaseRecords)
        return new Response(JSON.stringify({ received: true, type: 'material' }), { status: 200 })
      }

      const isSubscription = session.mode === 'subscription' || session.metadata?.plan === 'pro' || session.metadata?.type === 'subscription'
      if (isSubscription && user_id) {
        const { error: profileError } = await supabase
          .from('perfis')
          .update({
            is_pro: true,
            plano: 'pro'
          })
          .eq('id', user_id)

        if (profileError) throw profileError

        const { error: subError } = await supabase
          .from('assinaturas')
          .upsert({
            user_id: user_id,
            plano: 'pro',
            status: 'ativo',
            valor: 49.99,
            data_inicio: new Date().toISOString(),
            data_expiracao: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString()
          }, { onConflict: 'user_id' })

        if (subError) console.error(`[Stripe Webhook] Erro ao atualizar assinaturas:`, subError)
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
