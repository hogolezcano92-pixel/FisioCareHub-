/**
 * FisioCareHub - Serviço de E-mails Transacionais de Assinatura Premium
 * 
 * Regras:
 * 1. E-mail no início do trial de 60 dias (com informações completas, plano, datas, valor e periodicidade).
 * 2. E-mail na confirmação do pagamento após os 60 dias (somente quando invoice.paid > 0 for confirmado).
 * 3. Prevenção estrita de e-mails duplicados (deduplicação por subscription_id + eventType e invoice_id).
 * 4. Resiliência: falha no envio de e-mail NUNCA cancela nem bloqueia a assinatura ou o pagamento.
 * 5. Reutilização segura da infraestrutura Resend (nunca expor API Key no frontend).
 */

import { Resend } from 'resend';
import { escapeHtml, generateFisioCareHubEmailHTML, FisioEmailOptions } from './emailTemplate.js';

// Cache em memória para evitar race conditions em rajadas concorrentes de webhooks
const inMemorySentCache = new Set<string>();

export interface PlanMetadataInfo {
  name: string;
  amountFormatted: string;
  amountNumber: number;
  periodicity: string;
  interval: 'month' | 'year';
  intervalCount: number;
}

export const PLAN_CONFIGS: Record<string, PlanMetadataInfo> = {
  basic_monthly: {
    name: 'Basic Mensal',
    amountFormatted: 'R$ 19,99',
    amountNumber: 19.99,
    periodicity: 'Mensal (/mês)',
    interval: 'month',
    intervalCount: 1,
  },
  basic: {
    name: 'Basic Mensal',
    amountFormatted: 'R$ 19,99',
    amountNumber: 19.99,
    periodicity: 'Mensal (/mês)',
    interval: 'month',
    intervalCount: 1,
  },
  pro_monthly: {
    name: 'PRO Mensal',
    amountFormatted: 'R$ 49,99',
    amountNumber: 49.99,
    periodicity: 'Mensal (/mês)',
    interval: 'month',
    intervalCount: 1,
  },
  pro: {
    name: 'PRO Mensal',
    amountFormatted: 'R$ 49,99',
    amountNumber: 49.99,
    periodicity: 'Mensal (/mês)',
    interval: 'month',
    intervalCount: 1,
  },
  pro_semester: {
    name: 'PRO Semestral',
    amountFormatted: 'R$ 269,90',
    amountNumber: 269.90,
    periodicity: 'Semestral (/semestre)',
    interval: 'month',
    intervalCount: 6,
  },
  pro_yearly: {
    name: 'PRO Anual',
    amountFormatted: 'R$ 499,90',
    amountNumber: 499.90,
    periodicity: 'Anual (/ano)',
    interval: 'year',
    intervalCount: 1,
  },
};

export function resolvePlanMetadata(planKeyOrName?: string | null, customAmountCents?: number | null): PlanMetadataInfo {
  const normalizedKey = (planKeyOrName || '').toLowerCase().trim();
  
  if (PLAN_CONFIGS[normalizedKey]) {
    return PLAN_CONFIGS[normalizedKey];
  }

  if (normalizedKey.includes('basic')) {
    return PLAN_CONFIGS.basic_monthly;
  }
  if (normalizedKey.includes('semest')) {
    return PLAN_CONFIGS.pro_semester;
  }
  if (normalizedKey.includes('anual') || normalizedKey.includes('year')) {
    return PLAN_CONFIGS.pro_yearly;
  }
  if (normalizedKey.includes('pro')) {
    return PLAN_CONFIGS.pro_monthly;
  }

  // Fallback se vier valor numérico do Stripe
  if (customAmountCents && customAmountCents > 0) {
    const val = customAmountCents / 100;
    const formatted = val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return {
      name: planKeyOrName || 'Plano Premium',
      amountFormatted: formatted,
      amountNumber: val,
      periodicity: val > 200 ? (val > 400 ? 'Anual (/ano)' : 'Semestral (/semestre)') : 'Mensal (/mês)',
      interval: val > 400 ? 'year' : 'month',
      intervalCount: val > 200 && val <= 400 ? 6 : 1,
    };
  }

  return PLAN_CONFIGS.pro_monthly;
}

export function formatDateBrSafe(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '';
  try {
    const d = typeof dateInput === 'number' ? new Date(dateInput * 1000) : new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return String(dateInput);
  }
}

/**
 * Envia um e-mail transacional via Resend com fallback de remetente
 */
export async function sendEmailViaResendSafely({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    console.warn('[SubscriptionEmail] RESEND_API_KEY não configurada. E-mail simulado com sucesso no log.');
    return { success: true, messageId: 'simulated_no_key' };
  }

  const primaryFrom = process.env.RESEND_FROM || 'FisioCareHub <no-reply@fisiocarehub.company>';
  const fallbackFrom = 'FisioCareHub <onboarding@resend.dev>';

  try {
    const resend = new Resend(apiKey);

    let sendResult = await resend.emails.send({
      from: primaryFrom,
      to: [to],
      subject,
      html,
    });

    if (sendResult.error) {
      const errMsg = (sendResult.error.message || '').toLowerCase();
      const isDomainError = errMsg.includes('domain') || errMsg.includes('verified') || errMsg.includes('from') || errMsg.includes('identity');
      
      if (isDomainError) {
        console.warn(`[SubscriptionEmail] Falha com remetente primário (${primaryFrom}). Tentando fallback (${fallbackFrom}). Motivo:`, sendResult.error.message);
        sendResult = await resend.emails.send({
          from: fallbackFrom,
          to: [to],
          subject,
          html,
        });
      }
    }

    if (sendResult.error) {
      console.error('[SubscriptionEmail] Resend retornou erro:', sendResult.error);
      return { success: false, error: sendResult.error.message };
    }

    console.log(`[SubscriptionEmail] E-mail enviado com sucesso para ${to}. ID:`, sendResult.data?.id);
    return { success: true, messageId: sendResult.data?.id };
  } catch (err: any) {
    console.error('[SubscriptionEmail] Exceção ao chamar Resend:', err);
    return { success: false, error: err.message || 'Erro inesperado no envio de e-mail' };
  }
}

/**
 * Verifica no Supabase e na memória se este e-mail já foi enviado para evitar duplicação.
 */
export async function isSubscriptionEmailAlreadySent(
  supabase: any,
  dedupKey: string,
  userId?: string
): Promise<boolean> {
  if (inMemorySentCache.has(dedupKey)) {
    console.info(`[SubscriptionEmail] E-mail duplicado bloqueado pelo cache em memória: ${dedupKey}`);
    return true;
  }

  if (!supabase) return false;

  try {
    const { data: existing } = await supabase
      .from('notificacoes')
      .select('id')
      .eq('referencia_id', dedupKey)
      .limit(1);

    if (existing && existing.length > 0) {
      inMemorySentCache.add(dedupKey);
      console.info(`[SubscriptionEmail] E-mail duplicado bloqueado pelo registro no banco: ${dedupKey}`);
      return true;
    }
  } catch (err: any) {
    console.warn('[SubscriptionEmail] Falha ao checar deduplicação em notificacoes (prosseguindo com segurança):', err.message);
  }

  return false;
}

/**
 * Registra no banco de dados que o e-mail foi enviado para auditoria e deduplicação.
 */
export async function recordSubscriptionEmailSent(
  supabase: any,
  {
    dedupKey,
    userId,
    eventType,
    email,
    planName,
    status = 'enviado',
  }: {
    dedupKey: string;
    userId?: string;
    eventType: string;
    email: string;
    planName: string;
    status?: string;
  }
) {
  inMemorySentCache.add(dedupKey);

  // Mantém o cache em memória com tamanho controlado
  if (inMemorySentCache.size > 2000) {
    const firstKey = inMemorySentCache.values().next().value;
    if (firstKey) inMemorySentCache.delete(firstKey);
  }

  if (!supabase) return;

  try {
    if (userId) {
      await supabase.from('notificacoes').insert({
        user_id: userId,
        tipo: `email_${eventType}`,
        titulo: eventType === 'trial_started' ? '🎉 Seu Premium está ativo!' : 'Pagamento da assinatura confirmado',
        mensagem: `E-mail de confirmação da assinatura (${planName}) enviado para ${email}`,
        referencia_id: dedupKey,
        lida: true,
      });
    }
  } catch (err: any) {
    console.warn('[SubscriptionEmail] Aviso: Não foi possível gravar log em notificacoes:', err.message);
  }
}

/**
 * Gera o template HTML profissional de início do Trial de 60 dias
 */
export function buildTrialStartedEmailHTML({
  name,
  planName,
  trialStartDate,
  trialEndDate,
  planAmount,
  periodicity,
}: {
  name: string;
  planName: string;
  trialStartDate: string;
  trialEndDate: string;
  planAmount: string;
  periodicity: string;
}): string {
  const contentHtml = `
    <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:25px;">
      Sua assinatura do plano <strong>${escapeHtml(planName)}</strong> foi confirmada e seu acesso Premium já está ativo.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;margin:20px 0;">
      <tr>
        <td style="padding:18px 20px;">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#2563eb;margin-bottom:4px;">Seu período gratuito</div>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:26px;font-weight:900;color:#1e3a8a;">60 dias de Premium sem cobrança.</div>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#475569;margin-top:6px;">
            Durante esse período você terá acesso irrestrito a todos os recursos profissionais da plataforma para gerenciar atendimentos, prontuários, exercícios e captação de pacientes.
          </div>
        </td>
      </tr>
    </table>

    <p style="margin:20px 0 0;color:#475569;font-size:14px;line-height:22px;">
      Após o período gratuito, será realizada a cobrança de <strong>${escapeHtml(planAmount)} ${escapeHtml(periodicity)}</strong>, conforme o plano escolhido. Você pode gerenciar ou cancelar seu plano a qualquer momento nas configurações da sua conta antes do término do teste.
    </p>
  `;

  return generateFisioCareHubEmailHTML({
    title: '🎉 Seu Premium está ativo!',
    subtitle: 'Sua assinatura com 60 dias de teste gratuito foi confirmada com sucesso.',
    preheader: 'Seu período gratuito de 60 dias no FisioCareHub começou.',
    greetingName: name,
    variant: 'payment',
    contentHtml,
    details: [
      { label: 'Plano', value: planName },
      { label: 'Período de teste', value: '60 dias de acesso completo' },
      { label: 'Início do trial', value: trialStartDate },
      { label: 'Término do trial', value: trialEndDate },
      { label: 'Cobrança após o teste', value: `${planAmount} (${periodicity})`, helper: `Primeira cobrança prevista para ${trialEndDate}` },
    ],
    ctas: [
      { label: 'ACESSAR MEU FISIOCAREHUB', href: 'https://fisiocarehub.company/dashboard' },
    ],
  });
}

/**
 * Gera o template HTML profissional para confirmação de pagamento após o trial / faturas subsequentes
 */
export function buildSubscriptionPaidEmailHTML({
  name,
  planName,
  amountPaid,
  billingDate,
  periodicity,
  nextBillingDate,
}: {
  name: string;
  planName: string;
  amountPaid: string;
  billingDate: string;
  periodicity: string;
  nextBillingDate?: string;
}): string {
  const contentHtml = `
    <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:25px;">
      Confirmamos que o pagamento da sua assinatura do plano <strong>${escapeHtml(planName)}</strong> foi processado com sucesso. Seu acesso Premium continua ativo.
    </p>
    <p style="margin:0;color:#475569;font-size:14px;line-height:22px;">
      Agradecemos pela sua confiança. Todos os recursos profissionais seguem liberados para o seu dia a dia clínico.
    </p>
  `;

  const details = [
    { label: 'Plano contratado', value: planName },
    { label: 'Valor cobrado', value: amountPaid },
    { label: 'Data da cobrança', value: billingDate },
    { label: 'Periodicidade', value: periodicity },
  ];

  if (nextBillingDate) {
    details.push({ label: 'Próxima renovação', value: nextBillingDate });
  }

  return generateFisioCareHubEmailHTML({
    title: 'Pagamento da assinatura confirmado',
    subtitle: 'Sua assinatura Premium continua 100% ativa.',
    preheader: 'Confirmação de pagamento da sua assinatura FisioCareHub.',
    greetingName: name,
    variant: 'payment',
    contentHtml,
    details,
    ctas: [
      { label: 'ACESSAR MEU FISIOCAREHUB', href: 'https://fisiocarehub.company/dashboard' },
    ],
  });
}

/**
 * Processa o envio do E-mail de Início do Trial de 60 dias com proteção contra duplicação e tratamento total de erros.
 */
export async function sendTrialStartedConfirmationEmailSafe({
  supabase,
  userId,
  email,
  userName,
  planKey,
  stripeSubscriptionId,
  trialStart,
  trialEnd,
  nextBillingDate,
}: {
  supabase: any;
  userId?: string;
  email?: string | null;
  userName?: string | null;
  planKey?: string | null;
  stripeSubscriptionId?: string | null;
  trialStart?: string | number | Date | null;
  trialEnd?: string | number | Date | null;
  nextBillingDate?: string | number | Date | null;
}): Promise<{ success: boolean; skipped?: boolean; reason?: string; error?: string }> {
  try {
    const targetEmail = (email || '').trim();
    if (!targetEmail) {
      console.warn('[SubscriptionEmail] E-mail de trial não enviado: destinatário vazio.');
      return { success: false, error: 'Email não informado' };
    }

    const subId = stripeSubscriptionId || userId || targetEmail;
    const dedupKey = `trial_started_${subId}`;

    // Deduplicação: verifica se já foi enviado
    const alreadySent = await isSubscriptionEmailAlreadySent(supabase, dedupKey, userId);
    if (alreadySent) {
      return { success: true, skipped: true, reason: 'already_sent' };
    }

    const planMeta = resolvePlanMetadata(planKey);
    const startDateFormatted = formatDateBrSafe(trialStart || new Date());
    const endDateFormatted = formatDateBrSafe(trialEnd || (trialStart ? new Date(new Date(trialStart).getTime() + 60 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)));
    const recipientName = userName || 'Profissional';

    const html = buildTrialStartedEmailHTML({
      name: recipientName,
      planName: planMeta.name,
      trialStartDate: startDateFormatted,
      trialEndDate: endDateFormatted,
      planAmount: planMeta.amountFormatted,
      periodicity: planMeta.periodicity,
    });

    const subject = `🎉 Seu Premium está ativo! (60 Dias Grátis) - FisioCareHub`;

    const sendRes = await sendEmailViaResendSafely({
      to: targetEmail,
      subject,
      html,
    });

    if (sendRes.success) {
      await recordSubscriptionEmailSent(supabase, {
        dedupKey,
        userId,
        eventType: 'trial_started',
        email: targetEmail,
        planName: planMeta.name,
      });
      return { success: true };
    } else {
      console.error('[SubscriptionEmail] Falha ao enviar e-mail de trial via Resend:', sendRes.error);
      // Retorna sucesso para o fluxo principal não ser interrompido
      return { success: true, skipped: false, error: sendRes.error };
    }
  } catch (err: any) {
    console.error('[SubscriptionEmail] Erro não capturado ao preparar e-mail de trial:', err);
    // Nunca quebrar o fluxo chamador
    return { success: true, error: err.message };
  }
}

/**
 * Processa o envio do E-mail de Pagamento de Assinatura Confirmado com proteção contra duplicação.
 */
export async function sendSubscriptionPaidConfirmationEmailSafe({
  supabase,
  userId,
  email,
  userName,
  planKey,
  stripeSubscriptionId,
  invoiceId,
  amountPaidCents,
  billingDate,
  nextBillingDate,
}: {
  supabase: any;
  userId?: string;
  email?: string | null;
  userName?: string | null;
  planKey?: string | null;
  stripeSubscriptionId?: string | null;
  invoiceId?: string | null;
  amountPaidCents?: number | null;
  billingDate?: string | number | Date | null;
  nextBillingDate?: string | number | Date | null;
}): Promise<{ success: boolean; skipped?: boolean; reason?: string; error?: string }> {
  try {
    const targetEmail = (email || '').trim();
    if (!targetEmail) {
      console.warn('[SubscriptionEmail] E-mail de pagamento não enviado: destinatário vazio.');
      return { success: false, error: 'Email não informado' };
    }

    const invId = invoiceId || `${stripeSubscriptionId || userId}_${formatDateBrSafe(billingDate || new Date())}`;
    const dedupKey = `subscription_paid_${invId}`;

    // Deduplicação: verifica se já foi enviado para esta fatura/cobrança
    const alreadySent = await isSubscriptionEmailAlreadySent(supabase, dedupKey, userId);
    if (alreadySent) {
      return { success: true, skipped: true, reason: 'already_sent' };
    }

    const planMeta = resolvePlanMetadata(planKey, amountPaidCents);
    const amountPaidFormatted = amountPaidCents && amountPaidCents > 0
      ? (amountPaidCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : planMeta.amountFormatted;
    
    const billingDateFormatted = formatDateBrSafe(billingDate || new Date());
    const nextBillingFormatted = nextBillingDate ? formatDateBrSafe(nextBillingDate) : undefined;
    const recipientName = userName || 'Profissional';

    const html = buildSubscriptionPaidEmailHTML({
      name: recipientName,
      planName: planMeta.name,
      amountPaid: amountPaidFormatted,
      billingDate: billingDateFormatted,
      periodicity: planMeta.periodicity,
      nextBillingDate: nextBillingFormatted,
    });

    const subject = `Pagamento da assinatura confirmado - FisioCareHub`;

    const sendRes = await sendEmailViaResendSafely({
      to: targetEmail,
      subject,
      html,
    });

    if (sendRes.success) {
      await recordSubscriptionEmailSent(supabase, {
        dedupKey,
        userId,
        eventType: 'subscription_paid',
        email: targetEmail,
        planName: planMeta.name,
      });
      return { success: true };
    } else {
      console.error('[SubscriptionEmail] Falha ao enviar e-mail de pagamento via Resend:', sendRes.error);
      return { success: true, skipped: false, error: sendRes.error };
    }
  } catch (err: any) {
    console.error('[SubscriptionEmail] Erro não capturado ao preparar e-mail de pagamento:', err);
    return { success: true, error: err.message };
  }
}
