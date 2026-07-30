import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@11.2.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
const APP_URL = (Deno.env.get("APP_URL") || Deno.env.get("NEXT_PUBLIC_APP_URL") || Deno.env.get("VITE_APP_URL") || "https://www.fisiocarehub.company").replace(/\/$/, "")
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || ""
const RESEND_FROM = Deno.env.get("RESEND_FROM") || "FisioCareHub <suporte@fisiocarehub.company>"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")

const formatMoneyBR = (value: unknown) => {
  const amount = Number(value || 0)
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

/**
 * Evita o bug de fuso horário: se vier "2026-05-20 00:00:00+00",
 * exibimos 20/05/2026 usando a parte YYYY-MM-DD, sem converter para horário local.
 */
const formatDateBR = (value: unknown) => {
  if (!value) return "Data não informada"

  const text = String(value)
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    const [, year, month, day] = match
    return `${day}/${month}/${year}`
  }

  const date = new Date(text)
  if (!Number.isNaN(date.getTime())) return date.toLocaleDateString("pt-BR")
  return text
}

const formatTimeBR = (appointment: any) => {
  if (appointment?.hora) return String(appointment.hora).slice(0, 5)

  const source = appointment?.data_servico || appointment?.data
  if (!source) return "Horário não informado"

  const date = new Date(source)
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  }

  return "Horário não informado"
}

const getAppointmentDate = (appointment: any) =>
  appointment?.data_servico || appointment?.data || appointment?.criado_em || appointment?.created_at

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
    console.warn("[new-stripe-webhook] E-mail não enviado: destinatário vazio.")
    return { ok: false, reason: "missing_to" }
  }

  if (!RESEND_API_KEY) {
    console.warn("[new-stripe-webhook] RESEND_API_KEY ausente. Notificação interna foi criada, mas e-mail real não foi enviado.")
    return { ok: false, reason: "missing_resend_key" }
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error("[new-stripe-webhook] Erro Resend:", text)
      return { ok: false, reason: text }
    }

    return { ok: true }
  } catch (error) {
    console.error("[new-stripe-webhook] Falha ao enviar e-mail:", error)
    return { ok: false, reason: String(error) }
  }
}

const getTableColumns = async (supabase: any, tableName: string) => {
  const { data, error } = await supabase
    .from("information_schema.columns")
    .select("column_name")
    .eq("table_schema", "public")
    .eq("table_name", tableName)

  if (error || !Array.isArray(data)) {
    console.warn(`[new-stripe-webhook] Não foi possível ler colunas de ${tableName}:`, error?.message)
    return new Set<string>()
  }

  return new Set(data.map((row: any) => String(row.column_name)))
}

const pickExistingColumns = (payload: Record<string, unknown>, columns: Set<string>) => {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (columns.has(key)) result[key] = value
  }
  return result
}

const getProfilesForAppointment = async (supabase: any, appointment: any) => {
  const patientId = appointment?.paciente_id
  const physioId = appointment?.fisio_id || appointment?.fisioterapeuta_id
  const ids = [patientId, physioId].filter(Boolean).map(String)

  if (ids.length === 0) return { patient: null, physio: null }

  const { data, error } = await supabase
    .from("perfis")
    .select("id, nome_completo, email, telefone")
    .in("id", ids)

  if (error) console.error("[new-stripe-webhook] Erro ao buscar perfis:", error)

  const profiles = Array.isArray(data) ? data : []
  const findProfile = (id: any) => profiles.find((p: any) => String(p.id) === String(id)) || null

  return {
    patient: findProfile(patientId),
    physio: findProfile(physioId),
  }
}

const createInternalNotifications = async (supabase: any, appointment: any) => {
  const rows = [
    {
      user_id: appointment.paciente_id,
      titulo: "Pagamento recebido",
      mensagem: "Recebemos seu pagamento. O agendamento agora aguarda confirmação do fisioterapeuta.",
      tipo: "payment",
      lida: false,
      link: "/appointments",
    },
    {
      user_id: appointment.fisio_id || appointment.fisioterapeuta_id,
      titulo: "Nova consulta paga",
      mensagem: "Um paciente pagou o serviço e aguarda sua confirmação de atendimento.",
      tipo: "appointment",
      lida: false,
      link: `/agendamento/confirmar?id=${encodeURIComponent(String(appointment.id))}`,
    },
  ].filter((row) => row.user_id)

  if (rows.length === 0) return

  const { error } = await supabase.from("notificacoes").insert(rows)
  if (error) console.error("[new-stripe-webhook] Erro ao criar notificações:", error)
}

const notifyAfterPaidAppointment = async (
  supabase: any,
  appointment: any,
  paymentInfo: { id: string; value: number; method: string },
) => {
  const { patient, physio } = await getProfilesForAppointment(supabase, appointment)

  const appointmentId = String(appointment.id)
  const confirmLink = `${APP_URL}/agendamento/confirmar?id=${encodeURIComponent(appointmentId)}`
  const patientName = patient?.nome_completo || appointment.nome_paciente || "Paciente"
  const physioName = physio?.nome_completo || "Fisioterapeuta"
  const serviceName = appointment.servico || appointment.tipo || "Sessão de fisioterapia"
  const date = formatDateBR(getAppointmentDate(appointment))
  const time = formatTimeBR(appointment)
  const amount = formatMoneyBR(paymentInfo.value || appointment.valor || appointment.valor_cobrado)

  await createInternalNotifications(supabase, appointment)

  const physioHtml = buildEmailLayout(
    "Novo agendamento pago aguardando confirmação",
    `
      <p style="margin:0 0 16px;color:#475569;font-size:16px;line-height:25px;">Olá, <strong>${escapeHtml(physioName)}</strong>.</p>
      <p style="margin:0 0 16px;color:#475569;font-size:16px;line-height:25px;">Um paciente realizou o pagamento pelo Stripe e aguarda sua confirmação.</p>
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
    `,
  )

  const patientHtml = buildEmailLayout(
    "Pagamento recebido",
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
    `,
  )

  const physioEmailResult = await sendEmail(physio?.email, "Novo agendamento pago aguardando confirmação - FisioCareHub", physioHtml)
  const patientEmailResult = await sendEmail(patient?.email, "Pagamento recebido - FisioCareHub", patientHtml)

  console.log("[new-stripe-webhook] Resultado e-mails:", {
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

const registerPayment = async (
  supabase: any,
  session: any,
  appointment: any,
  amountPaid: number,
  externalId: string,
) => {
  const paymentColumns = await getTableColumns(supabase, "pagamentos")
  if (paymentColumns.size === 0) return

  const payload = pickExistingColumns(
    {
      external_id: externalId,
      user_id: appointment.paciente_id,
      external_reference: String(appointment.id),
      amount: amountPaid,
      status: "paid",
      gateway: "stripe",
      method: "credit_card",
      confirmed_at: new Date().toISOString(),
    },
    paymentColumns,
  )

  if (!payload.external_id) return

  const { error } = await supabase
    .from("pagamentos")
    .upsert(payload, { onConflict: "external_id" })

  if (error) console.error("[new-stripe-webhook] Erro ao registrar pagamento:", error)
}

const updateAppointmentAfterPayment = async (supabase: any, appointmentId: string) => {
  const appointmentColumns = await getTableColumns(supabase, "agendamentos")

  const payload = pickExistingColumns(
    {
      // No FisioCareHub atual, "pendente" representa pago/aguardando confirmação do fisioterapeuta.
      status: "pendente",
      status_pagamento: "pago",
      payment_status: "paid",
      updated_at: new Date().toISOString(),
    },
    appointmentColumns,
  )

  if (Object.keys(payload).length === 0) {
    console.warn("[new-stripe-webhook] Nenhuma coluna válida para atualizar em agendamentos.")
    return
  }

  const { error } = await supabase
    .from("agendamentos")
    .update(payload)
    .eq("id", appointmentId)

  if (error) {
    console.error("[new-stripe-webhook] Erro ao atualizar agendamento:", error)
    throw error
  }
}

const upsertAppointmentPayment = async (supabase: any, session: any) => {
  const appointmentId = getAppointmentIdFromSession(session)
  if (!appointmentId) return false

  const amountPaid = typeof session.amount_total === "number"
    ? session.amount_total / 100
    : null

  const externalId = String(session.payment_intent || session.id)
  const userId = session.metadata?.user_id || session.client_reference_id || null
  const customerEmail = session.customer_details?.email || session.customer_email || null

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "confirmar_pagamento_agendamento_stripe",
    {
      p_agendamento_id: String(appointmentId),
      p_stripe_session_id: String(session.id),
      p_stripe_payment_intent: session.payment_intent ? String(session.payment_intent) : null,
      p_valor: amountPaid,
      p_user_id: userId,
      p_customer_email: customerEmail,
    },
  )

  if (rpcError) {
    console.error("[new-stripe-webhook] Erro RPC confirmar_pagamento_agendamento_stripe:", rpcError)
    throw rpcError
  }

  const appointment = rpcResult?.appointment || rpcResult?.agendamento || rpcResult

  if (!appointment?.id) {
    console.error("[new-stripe-webhook] RPC não retornou o agendamento atualizado:", rpcResult)
    throw new Error("RPC não retornou o agendamento atualizado")
  }

  await notifyAfterPaidAppointment(supabase, appointment, {
    id: externalId,
    value: amountPaid ?? Number(appointment.valor || appointment.valor_cobrado || 0),
    method: "credit_card",
  })

  console.log("[new-stripe-webhook] Pagamento de agendamento confirmado via RPC, aguardando aceite do fisio:", appointmentId)
  return true
}

const getSubscriptionPlan = (session: any) => {
  const metadata = session?.metadata || {}

  const rawKey = String(
    metadata.plan_key ||
      metadata.planVariant ||
      metadata.plan_variant ||
      metadata.plan_id ||
      metadata.planId ||
      metadata.plan ||
      "pro_monthly",
  ).toLowerCase()

  const rawBillingCycle = String(metadata.billing_cycle || metadata.billingCycle || "").toLowerCase()

  const isBasic =
    rawKey === "basic" ||
    rawKey === "basic_monthly" ||
    metadata.plan === "basic"

  const isProYearly =
    rawKey === "pro_yearly" ||
    rawKey === "pro_annual" ||
    rawKey === "yearly" ||
    rawKey === "annual" ||
    rawBillingCycle === "yearly" ||
    rawBillingCycle === "annual"

  const isProSemester =
    rawKey === "pro_semester" ||
    rawKey === "pro_semestral" ||
    rawKey === "pro_semiannual" ||
    rawKey === "semester" ||
    rawKey === "semestral" ||
    rawKey === "semiannual" ||
    rawBillingCycle === "semester" ||
    rawBillingCycle === "semestral" ||
    rawBillingCycle === "semiannual"

  if (isBasic) {
    return {
      plan: "basic",
      variant: "basic_monthly",
      billingCycle: "monthly",
      value: 19.99,
      durationDays: 30,
    }
  }

  if (isProYearly) {
    return {
      plan: "pro",
      variant: "pro_yearly",
      billingCycle: "annual",
      value: 499.90,
      durationDays: 365,
    }
  }

  if (isProSemester) {
    return {
      plan: "pro",
      variant: "pro_semester",
      billingCycle: "semiannual",
      value: 269.90,
      durationDays: 180,
    }
  }

  return {
    plan: "pro",
    variant: "pro_monthly",
    billingCycle: "monthly",
    value: 49.99,
    durationDays: 30,
  }
}

const notifySubscriptionEvent = async (
  supabase: any,
  userId: string,
  eventKind: 'trial_started' | 'active_paid' | 'payment_failed' | 'canceled',
  planLabel: string,
  extraDetails?: { trialEnd?: string; amountStr?: string; nextBillingDateStr?: string }
) => {
  const { data: profile } = await supabase
    .from("perfis")
    .select("id, nome_completo, email")
    .eq("id", userId)
    .maybeSingle()

  const userName = profile?.nome_completo || "Profissional"

  let title = "Atualização da Assinatura"
  let message = `Sua assinatura do plano ${planLabel} foi atualizada.`
  let emailSubject = `Atualização da Assinatura - FisioCareHub`
  let emailContent = ``

  if (eventKind === 'trial_started') {
    title = "Teste gratuito de 60 dias ativado"
    message = `Seu teste gratuito de 60 dias do plano ${planLabel} foi ativado com sucesso! Curta acesso completo até ${formatDateBR(extraDetails?.trialEnd)}.`
    emailSubject = `Teste gratuito de 60 dias ativado - FisioCareHub`
    emailContent = `
      <p style="margin:0 0 16px;color:#475569;font-size:16px;line-height:25px;">Olá, <strong>${escapeHtml(userName)}</strong>.</p>
      <p style="margin:0 0 16px;color:#475569;font-size:16px;line-height:25px;">Seu <strong>teste gratuito de 60 dias</strong> no plano <strong>${escapeHtml(planLabel)}</strong> foi ativado com sucesso!</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:18px 0;">
        <tr><td style="padding:16px;color:#334155;font-size:15px;line-height:24px;">
          <p style="margin:0 0 8px;"><strong>Plano:</strong> ${escapeHtml(planLabel)}</p>
          <p style="margin:0 0 8px;"><strong>Status:</strong> Teste Gratuito (60 dias)</p>
          <p style="margin:0;"><strong>Término do Teste:</strong> ${escapeHtml(formatDateBR(extraDetails?.trialEnd))}</p>
        </td></tr>
      </table>
      <p style="margin:0;color:#475569;font-size:16px;line-height:25px;">Aproveite todos os recursos da plataforma durante este período. Nenhuma cobrança foi efetuada hoje.</p>
    `
  } else if (eventKind === 'active_paid') {
    title = "Assinatura paga ativada"
    message = `Sua assinatura do plano ${planLabel} está ativa e com pagamento confirmado.`
    emailSubject = `Assinatura paga ativada - FisioCareHub`
    emailContent = `
      <p style="margin:0 0 16px;color:#475569;font-size:16px;line-height:25px;">Olá, <strong>${escapeHtml(userName)}</strong>.</p>
      <p style="margin:0 0 16px;color:#475569;font-size:16px;line-height:25px;">Sua assinatura do plano <strong>${escapeHtml(planLabel)}</strong> foi confirmada e está 100% ativa no FisioCareHub.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:18px 0;">
        <tr><td style="padding:16px;color:#334155;font-size:15px;line-height:24px;">
          <p style="margin:0 0 8px;"><strong>Plano:</strong> ${escapeHtml(planLabel)}</p>
          ${extraDetails?.amountStr ? `<p style="margin:0 0 8px;"><strong>Valor Pago:</strong> ${escapeHtml(extraDetails.amountStr)}</p>` : ''}
          ${extraDetails?.nextBillingDateStr ? `<p style="margin:0;"><strong>Próxima Renovação:</strong> ${escapeHtml(extraDetails.nextBillingDateStr)}</p>` : ''}
        </td></tr>
      </table>
      <p style="margin:0;color:#475569;font-size:16px;line-height:25px;">Agradecemos por continuar com o FisioCareHub!</p>
    `
  } else if (eventKind === 'payment_failed') {
    title = "Falha no pagamento da assinatura"
    message = `Não conseguimos processar o pagamento da sua assinatura do plano ${planLabel}. Atualize seu cartão de crédito.`
    emailSubject = `Aviso: Falha na cobrança da assinatura - FisioCareHub`
    emailContent = `
      <p style="margin:0 0 16px;color:#475569;font-size:16px;line-height:25px;">Olá, <strong>${escapeHtml(userName)}</strong>.</p>
      <p style="margin:0 0 16px;color:#dc2626;font-size:16px;line-height:25px;">Houve uma falha na tentativa de cobrança do seu plano <strong>${escapeHtml(planLabel)}</strong>.</p>
      <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:24px;">Por favor, acesse as configurações de assinatura no FisioCareHub para atualizar seu método de pagamento e evitar interrupção no acesso.</p>
    `
  } else if (eventKind === 'canceled') {
    title = "Assinatura cancelada"
    message = `Sua assinatura do plano ${planLabel} foi cancelada.`
    emailSubject = `Assinatura cancelada - FisioCareHub`
    emailContent = `
      <p style="margin:0 0 16px;color:#475569;font-size:16px;line-height:25px;">Olá, <strong>${escapeHtml(userName)}</strong>.</p>
      <p style="margin:0 0 16px;color:#475569;font-size:16px;line-height:25px;">Sua assinatura do plano <strong>${escapeHtml(planLabel)}</strong> foi encerrada.</p>
    `
  }

  await supabase.from("notificacoes").insert({
    user_id: userId,
    titulo: title,
    mensagem: message,
    tipo: "subscription",
    lida: false,
    link: "/subscription",
  })

  if (emailContent && profile?.email) {
    const html = buildEmailLayout(title, emailContent)
    await sendEmail(profile.email, emailSubject, html)
  }
}

const handleSubscriptionCreatedOrUpdated = async (supabase: any, subscription: any) => {
  const customerId = subscription.customer as string
  const subscriptionId = subscription.id
  const userId = subscription.metadata?.user_id

  let targetUserId = userId
  if (!targetUserId) {
    const { data: prof } = await supabase.from("perfis").select("id").eq("stripe_customer_id", customerId).maybeSingle()
    targetUserId = prof?.id
  }

  if (!targetUserId) {
    console.warn("[new-stripe-webhook] Não foi possível vincular a assinatura ao usuário:", { customerId, subscriptionId })
    return
  }

  const isTrial = subscription.status === 'trialing'
  const statusText = isTrial ? 'trialing' : (subscription.status === 'active' ? 'ativo' : subscription.status)

  const trialStart = subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null
  const nextBillingDate = new Date(subscription.current_period_end * 1000).toISOString()

  const planKey = subscription.metadata?.plan_key || subscription.metadata?.plan_variant || 'pro_monthly'
  const planType = subscription.metadata?.plan || (planKey.startsWith('basic') ? 'basic' : 'pro')
  const planLabel = planType === 'basic' ? 'Basic' : 'PRO'

  await supabase.from("perfis").update({
    plan_type: planType,
    plano: planType,
    is_pro: planType === 'pro',
    subscription_status: statusText,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    trial_utilizado: true,
    trial_start: trialStart,
    trial_end: trialEnd,
    next_billing_date: nextBillingDate,
    last_stripe_sync: new Date().toISOString()
  }).eq("id", targetUserId)

  const assinaturaColumns = await getTableColumns(supabase, "assinaturas")
  const payload = pickExistingColumns(
    {
      user_id: targetUserId,
      plano: planType,
      plan_type: planType,
      plan_key: planKey,
      status: statusText,
      data_expiracao: nextBillingDate,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      trial_utilizado: true,
      trial_start: trialStart,
      trial_end: trialEnd,
      next_billing_date: nextBillingDate,
      last_stripe_sync: new Date().toISOString()
    },
    assinaturaColumns
  )

  await supabase.from("assinaturas").upsert(payload, { onConflict: "user_id" })

  if (isTrial) {
    await notifySubscriptionEvent(supabase, targetUserId, 'trial_started', planLabel, { trialEnd })
  } else if (subscription.status === 'active') {
    await notifySubscriptionEvent(supabase, targetUserId, 'active_paid', planLabel, { nextBillingDateStr: formatDateBR(nextBillingDate) })
  }

  console.log(`[new-stripe-webhook] Assinatura processada (${statusText}) para user ${targetUserId}`)
}

const handleSubscriptionDeleted = async (supabase: any, subscription: any) => {
  const customerId = subscription.customer as string
  const userId = subscription.metadata?.user_id

  let targetUserId = userId
  if (!targetUserId) {
    const { data: prof } = await supabase.from("perfis").select("id").eq("stripe_customer_id", customerId).maybeSingle()
    targetUserId = prof?.id
  }

  if (targetUserId) {
    await supabase.from("perfis").update({
      subscription_status: "cancelado",
      plan_type: "free",
      plano: "free",
      is_pro: false,
      last_stripe_sync: new Date().toISOString()
    }).eq("id", targetUserId)

    await supabase.from("assinaturas").update({
      status: "cancelado",
      last_stripe_sync: new Date().toISOString()
    }).eq("user_id", targetUserId)

    await notifySubscriptionEvent(supabase, targetUserId, 'canceled', 'FisioCareHub')
  }
}

const handleInvoicePaid = async (supabase: any, invoice: any) => {
  const customerId = invoice.customer as string
  const amountPaid = (invoice.amount_paid || 0) / 100

  const { data: profile } = await supabase.from("perfis").select("*").eq("stripe_customer_id", customerId).maybeSingle()

  if (profile) {
    const planLabel = profile.plan_type === 'basic' ? 'Basic' : 'PRO'
    const amountStr = formatMoneyBR(amountPaid)
    const nextBillingDateStr = formatDateBR(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())

    await supabase.from("perfis").update({
      subscription_status: "ativo",
      last_billing_date: new Date().toISOString(),
      last_stripe_sync: new Date().toISOString()
    }).eq("id", profile.id)

    await supabase.from("assinaturas").update({
      status: "ativo",
      valor: amountPaid,
      last_billing_date: new Date().toISOString(),
      last_stripe_sync: new Date().toISOString()
    }).eq("user_id", profile.id)

    if (amountPaid > 0) {
      await notifySubscriptionEvent(supabase, profile.id, 'active_paid', planLabel, { amountStr, nextBillingDateStr })
    }
  }
}

const handleInvoicePaymentFailed = async (supabase: any, invoice: any) => {
  const customerId = invoice.customer as string
  const { data: profile } = await supabase.from("perfis").select("*").eq("stripe_customer_id", customerId).maybeSingle()

  if (profile) {
    const planLabel = profile.plan_type === 'basic' ? 'Basic' : 'PRO'

    await supabase.from("perfis").update({
      subscription_status: "expirado",
      last_stripe_sync: new Date().toISOString()
    }).eq("id", profile.id)

    await supabase.from("assinaturas").update({
      status: "expirado",
      last_stripe_sync: new Date().toISOString()
    }).eq("user_id", profile.id)

    await notifySubscriptionEvent(supabase, profile.id, 'payment_failed', planLabel)
  }
}

const registerMaterialPurchase = async (supabase: any, session: any, userId: string) => {
  const materialIdsString = session.metadata?.material_ids || session.metadata?.product_id
  if (!userId || !materialIdsString) return false

  const materialIds = String(materialIdsString).split(",").filter(Boolean)
  if (materialIds.length === 0) return false

  const purchaseRecords = materialIds.map((id: string) => ({
    patient_id: userId,
    material_id: id,
    purchased_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from("material_purchases").insert(purchaseRecords)
  if (error) {
    console.error("[new-stripe-webhook] Erro ao registrar compra de material:", error)
    throw error
  }

  return true
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    })
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
    console.error(`[new-stripe-webhook] Erro de assinatura Stripe: ${err.message}`)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  console.log(`[new-stripe-webhook] Event received: ${event.type}`)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any
      const userId = session.metadata?.user_id || session.client_reference_id

      if (getAppointmentIdFromSession(session)) {
        await upsertAppointmentPayment(supabase, session)
        return new Response(JSON.stringify({ received: true, type: "appointment" }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        })
      }

      if (
        session.metadata?.type === "material" ||
        session.metadata?.type === "library_purchase" ||
        session.metadata?.type === "library_purchase_bulk"
      ) {
        if (!userId) {
          return new Response(JSON.stringify({ received: true, ignored: true, reason: "missing_user_id" }), { status: 200 })
        }

        await registerMaterialPurchase(supabase, session, userId)
        return new Response(JSON.stringify({ received: true, type: "material" }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        })
      }

      const isSubscription =
        session.mode === "subscription" ||
        session.metadata?.type === "subscription" ||
        session.metadata?.plan === "pro" ||
        session.metadata?.plan === "basic" ||
        session.metadata?.plan_key ||
        session.metadata?.plan_id ||
        session.metadata?.plan_variant

      if (isSubscription && userId) {
        if (session.customer || session.subscription) {
          await supabase.from("perfis").update({
            stripe_customer_id: session.customer || null,
            stripe_subscription_id: session.subscription || null,
            last_stripe_sync: new Date().toISOString()
          }).eq("id", userId)
        }
        return new Response(JSON.stringify({ received: true, type: "subscription_checkout_completed" }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        })
      }
    } else if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as any
      await handleSubscriptionCreatedOrUpdated(supabase, subscription)
      return new Response(JSON.stringify({ received: true, type: event.type }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    } else if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as any
      await handleSubscriptionDeleted(supabase, subscription)
      return new Response(JSON.stringify({ received: true, type: event.type }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    } else if (event.type === "invoice.paid") {
      const invoice = event.data.object as any
      await handleInvoicePaid(supabase, invoice)
      return new Response(JSON.stringify({ received: true, type: event.type }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    } else if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as any
      await handleInvoicePaymentFailed(supabase, invoice)
      return new Response(JSON.stringify({ received: true, type: event.type }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ received: true, ignored: true, type: event.type }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (err: any) {
    console.error(`[new-stripe-webhook] Erro no processamento: ${err.message}`)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})