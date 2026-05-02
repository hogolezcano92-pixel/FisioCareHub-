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
  console.log(`[Asaas Webhook] Event: ${event}`, payment?.id);

  // Ignore events that don't indicate success to avoid noise/500s
  if (event === 'PAYMENT_CREATED') {
    return res.status(200).json({ received: true, ignored: true });
  }

  // Handle confirmed payments
  if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED' || event === 'RECEIVED') {
    const agendamentoId = payment.externalReference;

    if (!agendamentoId) {
      console.warn('[Asaas Webhook] No externalReference found');
      return res.status(200).json({ received: true, error: 'Missing externalReference' });
    }

    try {
      // 1. Fetch Appointment 
      const { data: appointment, error: appError } = await supabase
        .from('agendamentos')
        .select('*, fisio:perfis!fisio_id(*), paciente:perfis!paciente_id(*)')
        .eq('id', agendamentoId)
        .single();

      if (appError || !appointment) {
        console.warn('[Asaas Webhook] Appointment not found:', agendamentoId);
        return res.status(200).json({ received: true, error: 'Appointment not found' });
      }

      // 2. Update status to 'pago'
      await supabase
        .from('agendamentos')
        .update({ status: 'pago' })
        .eq('id', agendamentoId);

      // Record payment
      await supabase
        .from('pagamentos')
        .upsert({
          external_id: payment.id,
          user_id: appointment.paciente_id,
          external_reference: agendamentoId,
          amount: payment.value,
          status: 'paid',
          gateway: 'asaas',
          method: payment.billingType,
          confirmed_at: new Date().toISOString()
        }, { onConflict: 'external_id' });

      console.log(`[Asaas Webhook] Appointment ${agendamentoId} processed successfully.`);
    } catch (err) {
      console.error('[Asaas Webhook] Internal Error:', err);
      // Still return 200 but we logged the error
      return res.status(200).json({ received: true, error: 'Internal Error' });
    }
  }

  return res.status(200).json({ received: true });
}
