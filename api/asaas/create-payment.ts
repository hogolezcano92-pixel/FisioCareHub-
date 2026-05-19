import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const onlyDigits = (value?: string) => (value || '').replace(/\D/g, '');

const getAsaasErrorMessage = (err: any) => {
  const data = err?.response?.data;
  const firstError = Array.isArray(data?.errors) ? data.errors[0]?.description : undefined;
  return firstError || data?.message || data?.error || err?.message || 'Erro ao criar pagamento Asaas';
};

const createSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const {
      name,
      email,
      value,
      appointmentId,
      user_id,
      phone,
      cpf,
      installments,
      billingType = 'PIX',
      customerId,
    } = req.body || {};

    const validTypes = ['PIX', 'BOLETO', 'CREDIT_CARD'];
    if (!validTypes.includes(billingType)) {
      return res.status(400).json({ error: 'Forma de pagamento Asaas inválida.' });
    }

    if (!appointmentId) return res.status(400).json({ error: 'appointmentId é necessário.' });
    if (!value || Number(value) <= 0) return res.status(400).json({ error: 'Valor inválido.' });

    const cleanCpf = onlyDigits(cpf);
    if (!customerId && (!name || !cleanCpf || cleanCpf.length < 11)) {
      return res.status(400).json({ error: 'Informe nome e CPF/CNPJ válido para gerar cobrança no Asaas.' });
    }

    const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
    const ASAAS_BASE_URL = (process.env.ASAAS_BASE_URL || 'https://api.asaas.com/v3').replace(/\/$/, '');

    if (!ASAAS_API_KEY) return res.status(500).json({ error: 'ASAAS_API_KEY não configurada.' });

    const asaasHeaders = {
      access_token: ASAAS_API_KEY,
      'Content-Type': 'application/json',
    };

    let finalCustomerId = customerId;

    if (!finalCustomerId) {
      try {
        const customerResponse = await axios.post(
          `${ASAAS_BASE_URL}/customers`,
          {
            name,
            email,
            cpfCnpj: cleanCpf,
            phone: onlyDigits(phone),
          },
          { headers: asaasHeaders }
        );

        finalCustomerId = customerResponse.data?.id;
      } catch (customerError: any) {
        console.error('[Asaas] Erro ao criar cliente:', customerError.response?.data || customerError.message);
        return res.status(customerError.response?.status || 500).json({
          error: getAsaasErrorMessage(customerError),
          details: customerError.response?.data,
        });
      }
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);

    const paymentData: any = {
      customer: finalCustomerId,
      billingType,
      value: Number(value),
      dueDate: dueDate.toISOString().split('T')[0],
      description: `Consulta FisioCareHub - Agendamento ${appointmentId}`,
      externalReference: String(appointmentId),
    };

    if (billingType === 'CREDIT_CARD' && Number(installments) > 1) {
      const installmentCount = Number(installments);
      paymentData.installmentCount = installmentCount;
      paymentData.installmentValue = Number((Number(value) / installmentCount).toFixed(2));
    }

    const paymentResponse = await axios.post(`${ASAAS_BASE_URL}/payments`, paymentData, { headers: asaasHeaders });
    const payment = paymentResponse.data;

    if (!payment?.id) throw new Error('Falha ao criar pagamento Asaas.');

    let pixQrCode: any = null;
    if (billingType === 'PIX') {
      try {
        const pixResponse = await axios.get(`${ASAAS_BASE_URL}/payments/${payment.id}/pixQrCode`, { headers: asaasHeaders });
        pixQrCode = pixResponse.data;
      } catch (pixError: any) {
        console.warn('[Asaas] Pagamento criado, mas QR Code PIX não foi retornado:', pixError.response?.data || pixError.message);
      }
    }

    const supabase = createSupabaseAdmin();
    if (supabase) {
      const { error: paymentUpsertError } = await supabase
        .from('pagamentos')
        .upsert({
          external_id: payment.id,
          user_id: user_id || null,
          external_reference: String(appointmentId),
          amount: Number(value),
          status: 'pending',
          gateway: 'asaas',
          method: billingType,
        }, { onConflict: 'external_id' });

      if (paymentUpsertError) {
        console.warn('[Asaas] Cobrança criada, mas não foi possível registrar pagamento pendente:', paymentUpsertError);
      }
    }

    return res.status(200).json({
      id: payment.id,
      customerId: finalCustomerId,
      status: payment.status,
      billingType: payment.billingType,
      invoiceUrl: payment.invoiceUrl || payment.bankSlipUrl || null,
      bankSlipUrl: payment.bankSlipUrl || null,
      paymentUrl: payment.invoiceUrl || payment.bankSlipUrl || null,
      pixEncodedImage: pixQrCode?.encodedImage || null,
      pixCopyPaste: pixQrCode?.payload || null,
      pixExpirationDate: pixQrCode?.expirationDate || null,
    });
  } catch (err: any) {
    console.error('[Asaas] Erro geral:', err.response?.data || err.message);
    return res.status(err.response?.status || 500).json({
      error: getAsaasErrorMessage(err),
      details: err.response?.data,
    });
  }
}
