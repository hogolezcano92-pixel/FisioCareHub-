import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { generateFisioCareHubEmailHTML } from '../_shared/fisioEmailTemplate.js';

const getEnv = (key: string, fallback = ''): string => {
  const value = process.env[key];
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return fallback;
  return trimmed;
};

const supabaseUrl = getEnv('SUPABASE_URL', getEnv('VITE_SUPABASE_URL', 'https://exciqetztunqgxbwwodo.supabase.co'));
const supabaseServiceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
const supabase: any = createClient<any>(supabaseUrl, supabaseServiceRoleKey);

const APP_URL = (getEnv('APP_URL', getEnv('NEXT_PUBLIC_APP_URL', getEnv('VITE_APP_URL', 'https://fisiocarehub.company')))).replace(/\/$/, '');
const RESEND_API_KEY = getEnv('RESEND_API_KEY');
const RESEND_FROM = getEnv('RESEND_FROM', 'FisioCareHub <onboarding@resend.dev>');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia' as any,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

const buffer = (req: any) => new Promise<Buffer>((resolve, reject) => {
  const chunks: any[] = [];
  req.on('data', (chunk: any) => chunks.push(chunk));
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatDateBR = (value: any) => {
  if (!value) return 'Data não informada';
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toLocaleDateString('pt-BR');
  return String(value);
};

const formatTimeBR = (appointment: any) => {
  if (appointment?.hora) return String(appointment.hora).slice(0, 5);
  const source = appointment?.data_servico || appointment?.data;
  if (!source) return 'Horário não informado';
  const date = new Date(source);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return 'Horário não informado';
};

const formatMoneyBR = (value: any) => {
  const amount = Number(value || 0);
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const getAppointmentDate = (appointment: any) => appointment?.data_servico || appointment?.data || appointment?.created_at;

const buildEmailLayout = (title: string, content: string) => generateFisioCareHubEmailHTML({
  title,
  subtitle: 'Você recebeu uma atualização importante no FisioCareHub.',
  contentHtml: content,
  variant: title.toLowerCase().includes('pagamento') ? 'payment'
    : title.toLowerCase().includes('documento') ? 'document'
    : title.toLowerCase().includes('agendamento') || title.toLowerCase().includes('consulta') ? 'appointment'
    : 'default',
});

const sendEmail = async (to: string | null | undefined, subject: string, html: string) => {
  if (!to) {
    console.warn('[Stripe Webhook] E-mail não enviado: destinatário vazio.');
    return { ok: false, reason: 'missing_to' };
  }

  if (!RESEND_API_KEY) {
    console.warn('[Stripe Webhook] RESEND_API_KEY ausente na Vercel. Notificação interna foi criada, mas e-mail real não foi enviado.');
    return { ok: false, reason: 'missing_resend_key' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[Stripe Webhook] Erro Resend:', text);
      return { ok: false, reason: text };
    }

    return { ok: true };
  } catch (error) {
    console.error('[Stripe Webhook] Falha ao enviar e-mail:', error);
    return { ok: false, reason: error };
  }
};

const getProfilesForAppointment = async (appointment: any) => {
  const patientId = appointment?.paciente_id;
  const physioId = appointment?.fisio_id || appointment?.fisioterapeuta_id;
  const ids = [patientId, physioId].filter(Boolean).map(String);

  if (ids.length === 0) return { patient: null, physio: null };

  const { data, error } = await supabase
    .from('perfis')
    .select('id, nome_completo, email, telefone')
    .in('id', ids);

  if (error) console.error('[Stripe Webhook] Erro ao buscar perfis:', error);

  const profiles = Array.isArray(data) ? data : [];
  const findProfile = (id: any) => profiles.find((p: any) => String(p.id) === String(id)) || null;

  return {
    patient: findProfile(patientId),
    physio: findProfile(physioId),
  };
};

const ensureClinicalPatientForAppointment = async (appointment: any) => {
  const patientProfileId = appointment.paciente_id;
  const physioId = appointment.fisio_id || appointment.fisioterapeuta_id;

  if (!patientProfileId || !physioId) {
    console.warn('[Stripe Webhook] Sem paciente_id ou fisio_id no agendamento:', appointment?.id);
    return null;
  }

  const { data: existingPatient, error: existingError } = await supabase
    .from('pacientes')
    .select('id')
    .eq('perfil_id', patientProfileId)
    .eq('fisioterapeuta_id', physioId)
    .maybeSingle();

  if (existingError) console.error('[Stripe Webhook] Erro ao buscar paciente clínico vinculado:', existingError);
  if (existingPatient?.id) return existingPatient.id;

  const { data: profile } = await supabase
    .from('perfis')
    .select('id, nome_completo, email, telefone, data_nascimento, avatar_url, foto_url')
    .eq('id', patientProfileId)
    .maybeSingle();

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
    .single();

  if (createError) {
    console.error('[Stripe Webhook] Erro ao criar paciente clínico vinculado:', createError);
    return null;
  }

  return createdPatient?.id || null;
};

const notifyAfterPaidAppointment = async (appointment: any, paymentInfo: { id: string; value: number; method: string }) => {
  const { patient, physio } = await getProfilesForAppointment(appointment);

  const appointmentId = String(appointment.id);
  const confirmLink = `${APP_URL}/agendamento/confirmar?id=${encodeURIComponent(appointmentId)}`;
  const patientName = patient?.nome_completo || appointment.nome_paciente || 'Paciente';
  const physioName = physio?.nome_completo || 'Fisioterapeuta';
  const serviceName = appointment.servico || appointment.tipo || 'Sessão de fisioterapia';
  const date = formatDateBR(getAppointmentDate(appointment));
  const time = formatTimeBR(appointment);
  const amount = formatMoneyBR(paymentInfo.value || appointment.valor);

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
  ]);

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
  );

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
  );

  const physioEmailResult = await sendEmail(
    physio?.email,
    'Novo agendamento pago aguardando confirmação - FisioCareHub',
    physioHtml
  );

  const patientEmailResult = await sendEmail(
    patient?.email,
    'Pagamento recebido - FisioCareHub',
    patientHtml
  );

  console.log('[Stripe Webhook] Resultado e-mails:', {
    physioEmail: physio?.email,
    physioEmailResult,
    patientEmail: patient?.email,
    patientEmailResult,
  });
};

const getAppointmentIdFromSession = (session: Stripe.Checkout.Session) => {
  const metadata = session.metadata || {};
  return metadata.appointment_id || metadata.appointmentId || metadata.agendamento_id || metadata.agendamentoId || null;
};

const upsertAppointmentPayment = async (session: Stripe.Checkout.Session) => {
  const appointmentId = getAppointmentIdFromSession(session);
  if (!appointmentId) return false;

  const { data: appointmentRaw, error: appError } = await supabase
    .from('agendamentos')
    .select('*')
    .eq('id', appointmentId)
    .maybeSingle();

  if (appError || !appointmentRaw) {
    console.error('[Stripe Webhook] Agendamento não encontrado:', appointmentId, appError);
    return false;
  }

  const appointment = appointmentRaw as any;

  const amountPaid = typeof session.amount_total === 'number'
    ? session.amount_total / 100
    : Number(appointment.valor || 0);

  const clinicalPatientId = await ensureClinicalPatientForAppointment(appointment);

  const paidAt = new Date().toISOString();

  // Atualização principal do agendamento.
  // O primeiro payload é o ideal. Os fallbacks evitam que o webhook pare caso
  // alguma coluna opcional ainda não exista em algum ambiente.
  const appointmentUpdateAttempts = [
    {
      status: 'pendente',
      status_pagamento: 'pago',
      updated_at: paidAt,
    },
    {
      status: 'pendente',
      status_pagamento: 'pago',
    },
    {
      status: 'pendente',
    },
  ];

  let updateError: any = null;

  for (const payload of appointmentUpdateAttempts) {
    const result = await supabase
      .from('agendamentos')
      .update(payload)
      .eq('id', appointmentId);

    updateError = result.error;

    if (!updateError) {
      updateError = null;
      break;
    }

    console.warn('[Stripe Webhook] Tentativa de atualizar agendamento falhou. Tentando fallback...', {
      appointmentId,
      payload,
      error: updateError,
    });
  }

  if (updateError) {
    console.error('[Stripe Webhook] Erro ao atualizar pagamento do agendamento:', updateError);
    throw updateError;
  }

  const externalId = String(session.payment_intent || session.id);
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
    }, { onConflict: 'external_id' });

  if (paymentError) console.error('[Stripe Webhook] Erro ao registrar pagamento:', paymentError);

  const { data: existingSessions } = await supabase
    .from('sessoes')
    .select('id')
    .eq('agendamento_id', appointmentId)
    .limit(1);

  const sessionPayload: Record<string, any> = {
    paciente_id: appointment.paciente_id,
    fisioterapeuta_id: appointment.fisio_id || appointment.fisioterapeuta_id,
    agendamento_id: appointmentId,
    data: appointment.data || appointment.data_servico || null,
    hora: appointment.hora || formatTimeBR(appointment),
    valor_sessao: amountPaid || Number(appointment.valor || 0),
    status_pagamento: 'pago_app',
    stripe_payment_intent: externalId,
    status_repasse: 'pendente',
  };

  if (existingSessions && existingSessions.length > 0) {
    const { error: sessionUpdateError } = await supabase.from('sessoes').update(sessionPayload).eq('id', existingSessions[0].id);
    if (sessionUpdateError) console.error('[Stripe Webhook] Erro ao atualizar sessão:', sessionUpdateError);
  } else {
    const { error: sessionInsertError } = await supabase.from('sessoes').insert(sessionPayload);
    if (sessionInsertError) console.error('[Stripe Webhook] Erro ao criar sessão:', sessionInsertError);
  }

  console.log('[Stripe Webhook] Paciente clínico vinculado:', clinicalPatientId);

  await notifyAfterPaidAppointment(appointment, {
    id: externalId,
    value: amountPaid,
    method: 'credit_card',
  });

  console.log('[Stripe Webhook] Pagamento de agendamento confirmado, aguardando aceite do fisio:', appointmentId);
  return true;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return res.status(400).send('Webhook Secret or Signature missing');
  }

  let event: Stripe.Event;

  try {
    const body = await buffer(req);
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      if (getAppointmentIdFromSession(session)) {
        await upsertAppointmentPayment(session);
        return res.status(200).json({ received: true, type: 'appointment' });
      }

      if (session.metadata?.type === 'library_purchase_bulk') {
        const userId = session.metadata.user_id;
        const materialIdsString = session.metadata.material_ids;

        if (userId && materialIdsString) {
          const materialIds = materialIdsString.split(',').filter(Boolean);
          const purchaseRecords = materialIds.map(id => ({
            patient_id: userId,
            material_id: id,
            purchased_at: new Date().toISOString(),
          }));

          await supabase.from('material_purchases').insert(purchaseRecords);
        }
      } else if (session.metadata?.type === 'library_purchase') {
        const userId = session.metadata.user_id;
        const materialId = session.metadata.material_id;
        if (userId && materialId) {
          await supabase.from('material_purchases').insert({
            patient_id: userId,
            material_id: materialId,
            purchased_at: new Date().toISOString(),
          });
        }
      }
    }
  } catch (err: any) {
    console.error('[Stripe Webhook] Internal Error:', err);
    // Retorna 500 para o Stripe tentar novamente quando o processamento interno falhar.
    // Isso evita pagamento aprovado sem atualizar agendamento/notificações.
    return res.status(500).json({ received: false, error: err.message || 'Internal error' });
  }

  return res.status(200).json({ received: true });
}
