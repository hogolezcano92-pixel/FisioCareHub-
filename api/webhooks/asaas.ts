import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 🔒 protege body quebrado
    const { event, payment } = req.body || {};

    if (!event || !payment) {
      console.error('[Asaas Webhook] Invalid payload');
      return res.status(400).send('Invalid payload');
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Asaas Webhook] Supabase env missing');
      return res.status(500).json({ error: 'Config error' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[Asaas Webhook] Event: ${event}`, JSON.stringify(payment, null, 2));

    if (event !== 'PAYMENT_RECEIVED' && event !== 'PAYMENT_CONFIRMED') {
      return res.status(200).send('Ignored event');
    }

    const agendamentoId = payment?.externalReference;

    if (!agendamentoId) {
      console.error('[Asaas Webhook] Missing externalReference');
      return res.status(400).send('Missing externalReference');
    }

    // 🔒 safe query (evita crash)
    const { data: appointment, error: appError } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('id', agendamentoId)
      .maybeSingle();

    if (appError || !appointment) {
      console.error('[Asaas Webhook] Appointment not found:', agendamentoId);
      return res.status(404).send('Appointment not found');
    }

    const { data: paciente } = await supabase
      .from('perfis')
      .select('nome_completo, telefone, endereco')
      .eq('id', appointment.paciente_id)
      .maybeSingle();

    const { data: fisio } = await supabase
      .from('perfis')
      .select('nome_completo, email')
      .eq('id', appointment.fisio_id)
      .maybeSingle();

    await supabase
      .from('agendamentos')
      .update({ status: 'pago' })
      .eq('id', agendamentoId);

    // 🔒 proteção contra null
    const servico = appointment.servico || '';
    const tipo = appointment.tipo || '';

    const isHomeService =
      servico.toLowerCase().includes('domiciliar') ||
      tipo.toLowerCase().includes('domiciliar');

    const pacName = paciente?.nome_completo || 'Paciente';
    const pacPhone = paciente?.telefone || 'Não informado';
    const pacAddress = paciente?.endereco || 'Não informado';

    const dateStr = appointment.data
      ? new Date(appointment.data + 'T00:00:00').toLocaleDateString('pt-BR')
      : 'N/A';

    const timeStr = appointment.hora ? appointment.hora.substring(0, 5) : 'N/A';

    let mensagem =
      `Novo agendamento pago!\n\n` +
      `Paciente: ${pacName}\n` +
      `Telefone: ${pacPhone}\n` +
      `Serviço: ${servico}\n` +
      `Data: ${dateStr} às ${timeStr}\n` +
      `Pagamento: Confirmado`;

    if (isHomeService) {
      mensagem += `\nEndereço: ${pacAddress}`;
    }

    const { error: notifError } = await supabase
      .from('notificacoes')
      .insert({
        user_id: appointment.fisio_id,
        titulo: 'Novo Agendamento Confirmado',
        mensagem,
        tipo: 'appointment_request',
        metadata: {
          agendamento_id: agendamentoId,
          actionable: true
        }
      });

    if (notifError) {
      console.error('[Asaas Webhook] Error creating notification:', notifError);
    }

    console.log(`[Asaas Webhook] Appointment ${agendamentoId} processed successfully.`);

    return res.status(200).send('OK');

  } catch (err) {
    console.error('[Asaas Webhook] Fatal error:', err);
    return res.status(500).send('Internal Server Error');
  }
}
