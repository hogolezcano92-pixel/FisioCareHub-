import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin (or just use client if safety allows, but Admin is better for webhooks)
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // Use service role for webhooks
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { event, payment } = req.body;
  console.log(`[Asaas Webhook] Event: ${event}`, JSON.stringify(payment, null, 2));

  // Only handle confirmed payments
  if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
    const agendamentoId = payment.externalReference;

    if (!agendamentoId) {
      console.error('[Asaas Webhook] No externalReference found');
      return res.status(400).send('Missing externalReference');
    }

    try {
      // 1. Fetch Appointment 
      const { data: appointment, error: appError } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('id', agendamentoId)
        .single();

      if (appError || !appointment) {
        console.error('[Asaas Webhook] Appointment not found:', agendamentoId);
        return res.status(404).send('Appointment not found');
      }

      // 1a. Fetch Patient
      const { data: paciente } = await supabase
        .from('perfis')
        .select('nome_completo, telefone, endereco')
        .eq('id', appointment.paciente_id)
        .single();

      // 1b. Fetch Physio
      const { data: fisio } = await supabase
        .from('perfis')
        .select('nome_completo, email')
        .eq('id', appointment.fisio_id)
        .single();

      // 2. Update status to 'pago'
      await supabase
        .from('agendamentos')
        .update({ status: 'pago' })
        .eq('id', agendamentoId);

      // 3. Prepare Notification content
      const isHomeService = String(appointment.servico).toLowerCase().includes('domiciliar') || 
                          String(appointment.tipo).toLowerCase().includes('domiciliar');
      
      const pacName = paciente?.nome_completo || 'Paciente';
      const pacPhone = paciente?.telefone || 'Não informado';
      const pacAddress = paciente?.endereco || 'Não informado';
      const dateStr = appointment.data ? new Date(appointment.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A';
      const timeStr = appointment.hora ? appointment.hora.substring(0, 5) : 'N/A';

      let mensagem = `Novo agendamento pago!\n\nPaciente: ${pacName}\nTelefone: ${pacPhone}\nServiço: ${appointment.servico}\nData: ${dateStr} às ${timeStr}\nPagamento: Confirmado`;
      
      if (isHomeService) {
        mensagem += `\nEndereço: ${pacAddress}`;
      }

      // 4. Create Notification for Physio
      const { error: notifError } = await supabase
        .from('notificacoes')
        .insert({
          user_id: appointment.fisio_id,
          titulo: 'Novo Agendamento Confirmado',
          mensagem: mensagem,
          tipo: 'appointment_request',
          metadata: {
            agendamento_id: agendamentoId,
            actionable: true
          }
        });

      if (notifError) console.error('[Asaas Webhook] Error creating notification:', notifError);

      console.log(`[Asaas Webhook] Appointment ${agendamentoId} processed successfully.`);
    } catch (err) {
      console.error('[Asaas Webhook] Internal Error:', err);
      return res.status(500).send('Internal Server Error');
    }
  }

  return res.status(200).send('OK');
}
