import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string, fallback = ''): string => {
  const value = process.env[key];
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return fallback;
  return trimmed;
};

const getSupabaseAdmin = (): any => {
  const supabaseUrl = getEnv('SUPABASE_URL', getEnv('VITE_SUPABASE_URL', 'https://exciqetztunqgxbwwodo.supabase.co'));
  const supabaseServiceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

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

const getAppointmentIdFromSession = (session: Stripe.Checkout.Session) => {
  const metadata = session.metadata || {};
  return metadata.appointment_id || metadata.appointmentId || metadata.agendamento_id || metadata.agendamentoId || null;
};

const ensureClinicalPatientForAppointment = async (supabase: any, appointment: any) => {
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

  if (existingError) {
    console.error('[Stripe Webhook] Erro ao buscar paciente clínico vinculado:', existingError);
  }

  if (existingPatient?.id) {
    return existingPatient.id;
  }

  const { data: profile } = await supabase
    .from('perfis')
    .select('id, nome_completo, email, telefone, data_nascimento, avatar_url, foto_url')
    .eq('id', patientProfileId)
    .maybeSingle();

  const payload: Record<string, any> = {
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
  };

  const { data: createdPatient, error: createError } = await supabase
    .from('pacientes')
    .insert(payload)
    .select('id')
    .single();

  if (createError) {
    console.error('[Stripe Webhook] Erro ao criar paciente clínico vinculado:', createError);
    return null;
  }

  return createdPatient?.id || null;
};


const upsertAppointmentPayment = async (supabase: any, session: Stripe.Checkout.Session) => {
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

  const clinicalPatientId = await ensureClinicalPatientForAppointment(supabase, appointment);

  await supabase
    .from('agendamentos')
    .update({
      status: 'pendente',
      status_pagamento: 'pago',
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointmentId);

  const externalId = String(session.payment_intent || session.id);
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
    }, { onConflict: 'external_id' });

  const { data: existingSessions } = await supabase
    .from('sessoes')
    .select('id')
    .eq('agendamento_id', appointmentId)
    .limit(1);

  const sessionPayload: Record<string, any> = {
    paciente_id: appointment.paciente_id,
    fisioterapeuta_id: appointment.fisio_id,
    agendamento_id: appointmentId,
    data: appointment.data,
    hora: appointment.hora,
    valor_sessao: amountPaid || Number(appointment.valor || 0),
    status_pagamento: 'pago_app',
    stripe_payment_intent: String(session.payment_intent || session.id),
    status_repasse: 'pendente',
  };

  if (existingSessions && existingSessions.length > 0) {
    await supabase.from('sessoes').update(sessionPayload).eq('id', existingSessions[0].id);
  } else {
    await supabase.from('sessoes').insert(sessionPayload);
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
  ]);

  console.log('[Stripe Webhook] Pagamento de agendamento confirmado; aguardando confirmação do fisio:', appointmentId, clinicalPatientId);
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

  const supabase: any = getSupabaseAdmin();

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      if (getAppointmentIdFromSession(session)) {
        await upsertAppointmentPayment(supabase, session);
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
    return res.status(200).json({ received: true, error: err.message || 'Internal error' });
  }

  return res.status(200).json({ received: true });
}
