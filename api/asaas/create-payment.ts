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

const normalizeBrazilianAmount = (rawValue: unknown): number => {
  if (rawValue === null || rawValue === undefined || rawValue === '') return NaN;

  if (typeof rawValue === 'number') return rawValue;

  let cleaned = String(rawValue)
    .replace('R$', '')
    .replace(/\s/g, '')
    .trim();

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    cleaned = cleaned.replace(',', '.');
  }

  return Number(cleaned);
};

const getMaterialAmountReais = (item: any): number => {
  const centsCandidates = [
    item.amount_cents,
    item.price_cents,
    item.valor_centavos,
    item.valor_cents,
  ];

  for (const value of centsCandidates) {
    const normalizedValue = normalizeBrazilianAmount(value);

    if (Number.isFinite(normalizedValue) && normalizedValue > 0) {
      const amountReais = Number((normalizedValue / 100).toFixed(2));
      if (amountReais > 0) return amountReais;
    }
  }

  const reaisCandidates = [
    item.amount,
    item.valor,
    item.total,
    item.preco,
    item.price,
  ];

  for (const value of reaisCandidates) {
    const normalizedValue = normalizeBrazilianAmount(value);

    if (Number.isFinite(normalizedValue) && normalizedValue > 0) {
      const amountReais = Number(normalizedValue.toFixed(2));
      if (amountReais > 0) return amountReais;
    }
  }

  throw new Error(`Valor inválido para o material: ${item.title || item.id}`);
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
      material_ids,
      product_id,
    } = req.body || {};

    const validTypes = ['PIX', 'BOLETO', 'CREDIT_CARD'];
    if (!validTypes.includes(billingType)) {
      return res.status(400).json({ error: 'Forma de pagamento Asaas inválida.' });
    }

    const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
    const ASAAS_BASE_URL = (process.env.ASAAS_BASE_URL || 'https://api.asaas.com/v3').replace(/\/$/, '');

    if (!ASAAS_API_KEY) return res.status(500).json({ error: 'ASAAS_API_KEY não configurada.' });

    const asaasHeaders = {
      access_token: ASAAS_API_KEY,
      'Content-Type': 'application/json',
    };

    const supabase = createSupabaseAdmin();

    const requestedMaterialIds = Array.isArray(material_ids)
      ? material_ids.filter(Boolean)
      : product_id
        ? [product_id]
        : [];

    const isLibraryPayment = requestedMaterialIds.length > 0;

    if (isLibraryPayment) {
      if (!supabase) {
        return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' });
      }

      if (!user_id) {
        return res.status(400).json({ error: 'user_id é obrigatório para compra de materiais.' });
      }

      const { data: profile } = await supabase
        .from('perfis')
        .select('id, nome_completo, email, telefone')
        .eq('id', user_id)
        .maybeSingle();

      const cleanCpf = onlyDigits(cpf);
      const finalName = name || profile?.nome_completo || email?.split('@')?.[0] || 'Paciente FisioCareHub';
      const finalEmail = email || profile?.email || '';
      const finalPhone = phone || profile?.telefone || '';

      if (!customerId && (!finalName || !cleanCpf || cleanCpf.length < 11)) {
        return res.status(400).json({ error: 'Informe nome e CPF/CNPJ válido para gerar cobrança no Asaas.' });
      }

      const { data: materials, error: materialsError } = await supabase
        .from('library_materials')
        .select('*')
        .in('id', requestedMaterialIds);

      if (materialsError || !materials || materials.length === 0) {
        return res.status(404).json({ error: 'Materiais não encontrados.' });
      }

      const totalValue = Number(
        materials
          .reduce((sum: number, item: any) => sum + getMaterialAmountReais(item), 0)
          .toFixed(2)
      );

      if (!Number.isFinite(totalValue) || totalValue <= 0) {
        return res.status(400).json({ error: 'Valor total dos materiais inválido.' });
      }

      let finalCustomerId = customerId;

      if (!finalCustomerId) {
        try {
          const customerResponse = await axios.post(
            `${ASAAS_BASE_URL}/customers`,
            {
              name: finalName,
              email: finalEmail,
              cpfCnpj: cleanCpf,
              phone: onlyDigits(finalPhone),
            },
            { headers: asaasHeaders }
          );

          finalCustomerId = customerResponse.data?.id;
        } catch (customerError: any) {
          console.error('[Asaas Biblioteca] Erro ao criar cliente:', customerError.response?.data || customerError.message);
          return res.status(customerError.response?.status || 500).json({
            error: getAsaasErrorMessage(customerError),
            details: customerError.response?.data,
          });
        }
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1);

      const materialTitles = materials
        .map((item: any) => item.title || item.titulo || item.name || item.nome || 'Material')
        .join(', ')
        .slice(0, 180);

      const externalReference = `library:${user_id}:${requestedMaterialIds.join(',')}`;

      const paymentData: any = {
        customer: finalCustomerId,
        billingType,
        value: totalValue,
        dueDate: dueDate.toISOString().split('T')[0],
        description: `Biblioteca de Saúde FisioCareHub - ${materialTitles}`,
        externalReference,
      };

      if (billingType === 'CREDIT_CARD' && Number(installments) > 1) {
        const installmentCount = Number(installments);
        paymentData.installmentCount = installmentCount;
        paymentData.installmentValue = Number((totalValue / installmentCount).toFixed(2));
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
          console.warn('[Asaas Biblioteca] Pagamento criado, mas QR Code PIX não foi retornado:', pixError.response?.data || pixError.message);
        }
      }

      const { error: paymentUpsertError } = await supabase
        .from('pagamentos')
        .upsert({
          external_id: payment.id,
          user_id: user_id || null,
          external_reference: externalReference,
          amount: totalValue,
          status: 'pending',
          gateway: 'asaas',
          method: billingType,
        }, { onConflict: 'external_id' });

      if (paymentUpsertError) {
        console.warn('[Asaas Biblioteca] Cobrança criada, mas não foi possível registrar pagamento pendente:', paymentUpsertError);
      }

      return res.status(200).json({
        id: payment.id,
        customerId: finalCustomerId,
        status: payment.status,
        billingType: payment.billingType,
        value: totalValue,
        invoiceUrl: payment.invoiceUrl || payment.bankSlipUrl || null,
        bankSlipUrl: payment.bankSlipUrl || null,
        paymentUrl: payment.invoiceUrl || payment.bankSlipUrl || null,
        pixEncodedImage: pixQrCode?.encodedImage || null,
        pixCopyPaste: pixQrCode?.payload || null,
        pixExpirationDate: pixQrCode?.expirationDate || null,
      });
    }

    if (!appointmentId) return res.status(400).json({ error: 'appointmentId é necessário.' });
    if (!value || Number(value) <= 0) return res.status(400).json({ error: 'Valor inválido.' });

    const cleanCpf = onlyDigits(cpf);
    if (!customerId && (!name || !cleanCpf || cleanCpf.length < 11)) {
      return res.status(400).json({ error: 'Informe nome e CPF/CNPJ válido para gerar cobrança no Asaas.' });
    }

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
