import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const upsertSessionForAppointment = async (appointment: any, payment: any) => {
  const agendamentoId = String(appointment.id);
  const amountPaid = Number(payment.value || appointment.valor || 0);

  const { error: updateError } = await supabase
    .from('agendamentos')
    .update({
      status: 'pendente',
      status_pagamento: 'pago',
    })
    .eq('id', agendamentoId);

  if (updateError) {
    console.error('[Asaas Webhook] Erro ao atualizar pagamento do agendamento:', updateError);
    throw updateError;
  }

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

  await supabase.from('notificacoes').insert([
    {
      user_id: appointment.paciente_id,
      titulo: 'Pagamento confirmado',
      mensagem: 'Pagamento recebido. Seu agendamento agora aguarda confirmação do fisioterapeuta.',
      tipo: 'payment',
      lida: false,
      link: '/appointments',
    },
    {
      user_id: appointment.fisio_id,
      titulo: 'Nova consulta paga',
      mensagem: 'Um paciente pagou por um serviço e aguarda sua confirmação do atendimento.',
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
      console.log(`[Asaas Webhook] Pagamento do agendamento ${agendamentoId} processado; aguardando confirmação do fisioterapeuta.`);
    } catch (err) {
      console.error('[Asaas Webhook] Internal Error:', err);
      return res.status(200).json({ received: true, error: 'Internal Error' });
    }
  }

  return res.status(200).json({ received: true });
}
