import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const ensureClinicalPatientForAppointment = async (appointment: any) => {
  const patientProfileId = appointment.paciente_id;
  const physioId = appointment.fisio_id || appointment.fisioterapeuta_id;

  if (!patientProfileId || !physioId) {
    console.warn('[Asaas Webhook] Sem paciente_id ou fisio_id no agendamento:', appointment?.id);
    return null;
  }

  const { data: existingPatient, error: existingError } = await supabase
    .from('pacientes')
    .select('id')
    .eq('perfil_id', patientProfileId)
    .eq('fisioterapeuta_id', physioId)
    .maybeSingle();

  if (existingError) {
    console.error('[Asaas Webhook] Erro ao buscar paciente clínico vinculado:', existingError);
  }

  if (existingPatient?.id) {
    return existingPatient.id;
  }

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
    console.error('[Asaas Webhook] Erro ao criar paciente clínico vinculado:', createError);
    return null;
  }

  return createdPatient?.id || null;
};


const upsertSessionForAppointment = async (appointment: any, payment: any) => {
  const agendamentoId = String(appointment.id);
  const amountPaid = Number(payment.value || appointment.valor || 0);

  const clinicalPatientId = await ensureClinicalPatientForAppointment(appointment);

  await supabase
    .from('agendamentos')
    .update({
      status: 'pendente',
      status_pagamento: 'pago',
      updated_at: new Date().toISOString(),
    })
    .eq('id', agendamentoId);

  await supabase
    .from('pagamentos')
    .upsert({
      external_id: payment.id,
      user_id: appointment.paciente_id,
      external_reference: agendamentoId,
      amount: amountPaid,
      status: 'paid',
      gateway: 'asaas',
      method: payment.billingType,
      confirmed_at: new Date().toISOString(),
    }, { onConflict: 'external_id' });

  const { data: existingSessions } = await supabase
    .from('sessoes')
    .select('id')
    .eq('agendamento_id', agendamentoId)
    .limit(1);

  const sessionPayload = {
    paciente_id: appointment.paciente_id,
    fisioterapeuta_id: appointment.fisio_id,
    agendamento_id: agendamentoId,
    data: appointment.data,
    hora: appointment.hora,
    valor_sessao: amountPaid,
    status_pagamento: 'pago_app',
    stripe_payment_intent: payment.id,
    status_repasse: 'pendente',
  };

  if (existingSessions && existingSessions.length > 0) {
    await supabase.from('sessoes').update(sessionPayload).eq('id', existingSessions[0].id);
  } else {
    await supabase.from('sessoes').insert(sessionPayload);
  }

  console.log('[Asaas Webhook] Paciente clínico vinculado:', clinicalPatientId);

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
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { event, payment } = req.body;
  console.log(`[Asaas Webhook] Event: ${event}`, payment?.id);

  if (event === 'PAYMENT_CREATED') {
    return res.status(200).json({ received: true, ignored: true });
  }

  if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED' || event === 'RECEIVED') {
    const agendamentoId = payment.externalReference;

    if (!agendamentoId) {
      console.warn('[Asaas Webhook] No externalReference found');
      return res.status(200).json({ received: true, error: 'Missing externalReference' });
    }

    try {
      const { data: appointment, error: appError } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('id', agendamentoId)
        .maybeSingle();

      if (appError || !appointment) {
        console.warn('[Asaas Webhook] Appointment not found:', agendamentoId, appError);
        return res.status(200).json({ received: true, error: 'Appointment not found' });
      }

      await upsertSessionForAppointment(appointment, payment);
      console.log(`[Asaas Webhook] Appointment ${agendamentoId} processed successfully.`);
    } catch (err) {
      console.error('[Asaas Webhook] Internal Error:', err);
      return res.status(200).json({ received: true, error: 'Internal Error' });
    }
  }

  return res.status(200).json({ received: true });
}
