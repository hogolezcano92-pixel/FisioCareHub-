import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@11.2.0?target=deno"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
const APP_URL = (Deno.env.get("APP_URL") || Deno.env.get("NEXT_PUBLIC_APP_URL") || Deno.env.get("VITE_APP_URL") || "https://fisiocarehub.company").replace(/\/$/, '')
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || ''
const RESEND_FROM = Deno.env.get("RESEND_FROM") || 'FisioCareHub <onboarding@resend.dev>'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const formatDateBR = (value: any) => {
  if (!value) return 'Data não informada'
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) return date.toLocaleDateString('pt-BR')
  return String(value)
}

const formatTimeBR = (appointment: any) => {
  if (appointment?.hora) return String(appointment.hora).slice(0, 5)
  const source = appointment?.data_servico || appointment?.data
  if (!source) return 'Horário não informado'
  const date = new Date(source)
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  return 'Horário não informado'
}

const formatMoneyBR = (value: any) => {
  const amount = Number(value || 0)
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const getAppointmentDate = (appointment: any) => appointment?.data_servico || appointment?.data || appointment?.created_at

const buildEmailLayout = (title: string, content: string) => `
  <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f8fafc;">
      <tr>
        <td align="center" style="padding:28px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border-collapse:collapse;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="background:#0f172a;padding:26px 24px;text-align:center;">
                <h1 style="margin:0;color:#38bdf8;font-size:28px;line-height:34px;font-weight:900;">FisioCareHub</h1>
                <p style="margin:8px 0 0;color:#cbd5e1;font-size:13px;letter-spacing:.08em;text-transform:uppercase;">Reabilitação & Performance</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px;">
                <h2 style="margin:0 0 18px;color:#0f172a;font-size:24px;line-height:30px;">${escapeHtml(title)}</h2>
                ${content}
              </td>
            </tr>
            <tr>
              <td style="background:#f1f5f9;padding:18px 24px;text-align:center;color:#64748b;font-size:12px;line-height:18px;">
                Documento automático gerado pelo FisioCareHub.<br/>
                Suporte: suporte@fisiocarehub.company
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
`

const sendEmail = async (to: string | null | undefined, subject: string, html: string) => {
  if (!to) {
    console.warn('[Stripe Edge Webhook] E-mail não enviado: destinatário vazio.')
    return { ok: false, reason: 'missing_to' }
  }

  if (!RESEND_API_KEY) {
    console.warn('[Stripe Edge Webhook] RESEND_API_KEY ausente. Notificação interna foi criada, mas e-mail real não foi enviado.')
    return { ok: false, reason: 'missing_resend_key' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('[Stripe Edge Webhook] Erro Resend:', text)
      return { ok: false, reason: text }
    }

    return { ok: true }
  } catch (error) {
    console.error('[Stripe Edge Webhook] Falha ao enviar e-mail:', error)
    return { ok: false, reason: error }
  }
}

const getProfilesForAppointment = async (supabase: any, appointment: any) => {
  const patientId = appointment?.paciente_id
  const physioId = appointment?.fisio_id || appointment?.fisioterapeuta_id
  const ids = [patientId, physioId].filter(Boolean).map(String)
  if (ids.length === 0) return { patient: null, physio: null }

  const { data, error } = await supabase
    .from('perfis')
    .select('id, nome_completo, email, telefone')
    .in('id', ids)

  if (error) console.error('[Stripe Edge Webhook] Erro ao buscar perfis:', error)
  const profiles = Array.isArray(data) ? data : []
  const findProfile = (id: any) => profiles.find((p: any) => String(p.id) === String(id)) || null
  return { patient: findProfile(patientId), physio: findProfile(physioId) }
}

const ensureClinicalPatientForAppointment = async (supabase: any, appointment: any) => {
  const patientProfileId = appointment.paciente_id
  const physioId = appointment.fisio_id || appointment.fisioterapeuta_id

  if (!patientProfileId || !physioId) {
    console.warn('[Stripe Edge Webhook] Sem paciente_id ou fisio_id no agendamento:', appointment?.id)
    return null
  }

  const { data: existingPatient, error: existingError } = await supabase
    .from('pacientes')
    .select('id')
    .eq('perfil_id', patientProfileId)
    .eq('fisioterapeuta_id', physioId)
    .maybeSingle()

  if (existingError) console.error('[Stripe Edge Webhook] Erro ao buscar paciente clínico vinculado:', existingError)
  if (existingPatient?.id) return existingPatient.id

  const { data: profile } = await supabase
    .from('perfis')
    .select('id, nome_completo, email, telefone, data_nascimento, avatar_url, foto_url')
    .eq('id', patientProfileId)
    .maybeSingle()

  const { data: createdPatient, error: createError } = await supabase
    .from('pacientes')
    .insert({
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
    })
    .select('id')
    .single()

  if (createError) {
    console.error('[Stripe Edge Webhook] Erro ao criar paciente clínico vinculado:', createError)
    return null
  }

  return createdPatient?.id || null
}

const notifyAfterPaidAppointment = async (supabase: any, appointment: any, paymentInfo: { id: string; value: number; method: string }) => {
  const { patient, physio } = await getProfilesForAppointment(supabase, appointment)

  const appointmentId = String(appointment.id)
  const confirmLink = `${APP_URL}/agendamento/confirmar?id=${encodeURIComponent(appointmentId)}`
  const patientName = patient?.nome_completo || appointment.nome_paciente || 'Paciente'
  const physioName = physio?.nome_completo || 'Fisioterapeuta'
  const serviceName = appointment.servico || appointment.tipo || 'Sessão de fisioterapia'
  const date = formatDateBR(getAppointmentDate(appointment))
  const time = formatTimeBR(appointment)
  const amount = formatMoneyBR(paymentInfo.value || appointment.valor)

  await supabase.from('notificacoes').insert([
    {
      user_id: appointment.paciente_id,
      titulo: 'Pagamento recebido',
      mensagem: 'Recebemos seu pagamento. O agendamento agora aguarda confirmação do fisioterapeuta.',
      tipo: 'payment',
      lida: false,
      link: '/appointments',
    },
    {
      user_id: appointment.fisio_id || appointment.fisioterapeuta_id,
      titulo: 'Nova consulta paga',
      mensagem: 'Um paciente pagou o serviço e aguarda sua confirmação de atendimento.',
      tipo: 'appointment',
      lida: false,
      link: `/agendamento/confirmar?id=${appointmentId}`,
    },
  ])

  const physioHtml = buildEmailLayout(
    'Novo agendamento pago aguardando confirmação',
    `
      <p style="margin:0 0 16px;color:#475569;font-size:16px;line-height:25px;">Olá, <strong>${escapeHtml(physioName)}</strong>.</p>
      <p style="margin:0 0 16px;color:#475569;font-size:16px;line-height:25px;">Um paciente realizou o pagamento por Stripe e aguarda sua confirmação.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:18px 0;">
        <tr><td style="padding:16px;color:#334155;font-size:15px;line-height:24px;">
          <p style="margin:0 0 8px;"><strong>Paciente:</strong> ${escapeHtml(patientName)}</p>
          <p style="margin:0 0 8px;"><strong>Serviço:</strong> ${escapeHtml(serviceName)}</p>
          <p style="margin:0 0 8px;"><strong>Data:</strong> ${escapeHtml(date)}</p>
          <p style="margin:0 0 8px;"><strong>Horário:</strong> ${escapeHtml(time)}</p>
          <p style="margin:0;"><strong>Valor pago:</strong> ${escapeHtml(amount)}</p>
        </td></tr>
      </table>
      <p style="margin:22px 0;text-align:center;">
        <a href="${confirmLink}" style="display:inline-block;background:#0284c7;color:#ffffff;text-decoration:none;font-weight:800;padding:14px 20px;border-radius:12px;">Confirmar atendimento</a>
      </p>
      <p style="margin:0;color:#64748b;font-size:13px;line-height:20px;">Caso o botão não funcione, acesse: ${escapeHtml(confirmLink)}</p>
    `
  )

  const patientHtml = buildEmailLayout(
    'Pagamento recebido',
    `
      <p style="margin:0 0 16px;color:#475569;font-size:16px;line-height:25px;">Olá, <strong>${escapeHtml(patientName)}</strong>.</p>
      <p style="margin:0 0 16px;color:#475569;font-size:16px;line-height:25px;">Recebemos seu pagamento pelo Stripe. Seu agendamento agora aguarda confirmação do fisioterapeuta.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:18px 0;">
        <tr><td style="padding:16px;color:#334155;font-size:15px;line-height:24px;">
          <p style="margin:0 0 8px;"><strong>Fisioterapeuta:</strong> ${escapeHtml(physioName)}</p>
          <p style="margin:0 0 8px;"><strong>Serviço:</strong> ${escapeHtml(serviceName)}</p>
          <p style="margin:0 0 8px;"><strong>Data:</strong> ${escapeHtml(date)}</p>
          <p style="margin:0 0 8px;"><strong>Horário:</strong> ${escapeHtml(time)}</p>
          <p style="margin:0;"><strong>Valor pago:</strong> ${escapeHtml(amount)}</p>
        </td></tr>
      </table>
      <p style="margin:0;color:#475569;font-size:16px;line-height:25px;">Você será notificado quando o fisioterapeuta confirmar o atendimento.</p>
    `
  )

  const physioEmailResult = await sendEmail(physio?.email, 'Novo agendamento pago aguardando confirmação - FisioCareHub', physioHtml)
  const patientEmailResult = await sendEmail(patient?.email, 'Pagamento recebido - FisioCareHub', patientHtml)

  console.log('[Stripe Edge Webhook] Resultado e-mails:', {
    physioEmail: physio?.email,
    physioEmailResult,
    patientEmail: patient?.email,
    patientEmailResult,
  })
}

const getAppointmentIdFromSession = (session: any) => {
  const metadata = session?.metadata || {}
  return metadata.appointment_id || metadata.appointmentId || metadata.agendamento_id || metadata.agendamentoId || null
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
    console.error('[Stripe Edge Webhook] Agendamento não encontrado:', appointmentId, appError)
    return false
  }

  const amountPaid = typeof session.amount_total === 'number'
    ? session.amount_total / 100
    : Number(appointment.valor || 0)

  const clinicalPatientId = await ensureClinicalPatientForAppointment(supabase, appointment)

  const { error: updateError } = await supabase
    .from('agendamentos')
    .update({
      status: 'pendente',
      status_pagamento: 'pago',
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointmentId)

  if (updateError) {
    console.error('[Stripe Edge Webhook] Erro ao atualizar pagamento do agendamento:', updateError)
    throw updateError
  }

  const externalId = String(session.payment_intent || session.id)

  const { error: paymentError } = await supabase
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

  if (paymentError) console.error('[Stripe Edge Webhook] Erro ao registrar pagamento:', paymentError)

  const { data: existingSessions } = await supabase
    .from('sessoes')
    .select('id')
    .eq('agendamento_id', appointmentId)
    .limit(1)

  const sessionPayload = {
    paciente_id: appointment.paciente_id,
    fisioterapeuta_id: appointment.fisio_id || appointment.fisioterapeuta_id,
    agendamento_id: appointmentId,
    data: appointment.data || appointment.data_servico || null,
    hora: appointment.hora || formatTimeBR(appointment),
    valor_sessao: amountPaid || Number(appointment.valor || 0),
    status_pagamento: 'pago_app',
}

  if (existingSessions && existingSessions.length > 0) {
    const { error: sessionUpdateError } = await supabase.from('sessoes').update(sessionPayload).eq('id', existingSessions[0].id)
    if (sessionUpdateError) console.error('[Stripe Edge Webhook] Erro ao atualizar sessão:', sessionUpdateError)
  } else {
    const { error: sessionInsertError } = await supabase.from('sessoes').insert(sessionPayload)
    if (sessionInsertError) console.error('[Stripe Edge Webhook] Erro ao criar sessão:', sessionInsertError)
  }

  console.log('[Stripe Edge Webhook] Paciente clínico vinculado:', clinicalPatientId)
  await notifyAfterPaidAppointment(supabase, appointment, { id: externalId, value: amountPaid, method: 'credit_card' })
  console.log('[Stripe Edge Webhook] Pagamento de agendamento confirmado, aguardando aceite do fisio:', appointmentId)
  return true
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

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
    console.error(`[Stripe Edge Webhook] Error: ${err.message}`)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  console.log(`[Stripe Edge Webhook] Event received: ${event.type}`)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any

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
          .update({ is_pro: true, plano: 'pro' })
          .eq('id', user_id)

        if (profileError) throw profileError

        const { error: subError } = await supabase
          .from('assinaturas')
          .upsert({
            user_id,
            plano: 'pro',
            status: 'ativo',
            valor: 49.99,
            data_inicio: new Date().toISOString(),
            data_expiracao: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString()
          }, { onConflict: 'user_id' })

        if (subError) console.error(`[Stripe Edge Webhook] Erro ao atualizar assinaturas:`, subError)
      }
    }
  } catch (err: any) {
    console.error(`[Stripe Edge Webhook] Erro no processamento: ${err.message}`)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  })
})
