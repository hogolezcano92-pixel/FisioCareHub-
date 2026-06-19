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

  let cleaned = String(rawValue).replace('R$', '').replace(/\s/g, '').trim();
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  else if (hasComma) cleaned = cleaned.replace(',', '.');

  return Number(cleaned);
};

const getMaterialAmountReais = (item: any): number => {
  const centsCandidates = [item.amount_cents, item.price_cents, item.valor_centavos, item.valor_cents];

  for (const value of centsCandidates) {
    const normalized = normalizeBrazilianAmount(value);
    if (Number.isFinite(normalized) && normalized > 0) {
      const cents = Math.round(normalized);
      if (cents >= 50) return Number((cents / 100).toFixed(2));
    }
  }

  const reaisCandidates = [item.amount, item.valor, item.total, item.preco, item.price];

  for (const value of reaisCandidates) {
    const normalized = normalizeBrazilianAmount(value);
    if (Number.isFinite(normalized) && normalized > 0) {
      return Number(normalized.toFixed(2));
    }
  }

  throw new Error(`Valor inválido para o material: ${item.title || item.id}`);
};

const getMaterialTitle = (item: any) => item.title || item.titulo || item.name || item.nome || 'Material de Saúde';

const getAppUrl = (req: VercelRequest) => {
  const envUrl = process.env.APP_URL || process.env.VITE_APP_URL || '';
  if (envUrl) return envUrl.replace(/\/$/, '');

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'https';

  return host ? `${protocol}://${host}`.replace(/\/$/, '') : 'https://www.fisiocarehub.company';
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
      type,
    } = req.body || {};

    const normalizedMaterialIds = Array.isArray(material_ids)
      ? material_ids.filter(Boolean).map(String)
      : product_id
        ? [String(product_id)]
        : [];

    const isLibraryPayment = normalizedMaterialIds.length > 0 || type === 'library' || type === 'material';

    const validTypes = ['PIX', 'BOLETO', 'CREDIT_CARD'];
    if (!validTypes.includes(billingType)) {
      return res.status(400).json({ error: 'Forma de pagamento Asaas inválida.' });
    }

    if (!isLibraryPayment && !appointmentId) {
      return res.status(400).json({ error: 'appointmentId é necessário.' });
    }

    const supabase = createSupabaseAdmin();

    let finalValue = Number(value || 0);
    let finalDescription = `Consulta FisioCareHub - Agendamento ${appointmentId}`;
    let finalExternalReference = String(appointmentId || '');
    let materialTitles: string[] = [];

    if (isLibraryPayment) {
      if (!user_id) return res.status(400).json({ error: 'user_id é obrigatório para compra de material.' });
      if (normalizedMaterialIds.length === 0) return res.status(400).json({ error: 'Nenhum material informado.' });
      if (!supabase) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' });

      const { data: materials, error: materialsError } = await supabase
        .from('library_materials')
        .select('*')
        .in('id', normalizedMaterialIds);

      if (materialsError || !materials || materials.length === 0) {
        return res.status(404).json({ error: 'Materiais da biblioteca não encontrados.' });
      }

      materialTitles = materials.map(getMaterialTitle);
      finalValue = Number(materials.reduce((sum: number, material: any) => sum + getMaterialAmountReais(material), 0).toFixed(2));
      finalDescription = `Biblioteca de Saúde - ${materialTitles.join(', ').slice(0, 180)}`;
      finalExternalReference = `library:${user_id}:${normalizedMaterialIds.join(',')}`;
    }

    if (!finalValue || Number(finalValue) <= 0) return res.status(400).json({ error: 'Valor inválido.' });

    const cleanCpf = onlyDigits(cpf);
    if (!customerId && (!cleanCpf || cleanCpf.length < 11)) {
      return res.status(400).json({ error: 'Informe um CPF/CNPJ válido para gerar cobrança no Asaas.' });
    }

    const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
    const ASAAS_BASE_URL = (process.env.ASAAS_BASE_URL || 'https://api.asaas.com/v3').replace(/\/$/, '');

    if (!ASAAS_API_KEY) return res.status(500).json({ error: 'ASAAS_API_KEY não configurada.' });

    const asaasHeaders = {
      access_token: ASAAS_API_KEY,
      'Content-Type': 'application/json',
    };

    let finalCustomerId = customerId;
    let customerName = name;
    let customerEmail = email;
    let customerPhone = phone;

    if (!finalCustomerId && supabase && user_id) {
      const { data: profile } = await supabase
        .from('perfis')
        .select('nome_completo, email, telefone')
        .eq('id', user_id)
        .maybeSingle();

      customerName = customerName || profile?.nome_completo || customerEmail || 'Paciente FisioCareHub';
      customerEmail = customerEmail || profile?.email || undefined;
      customerPhone = customerPhone || profile?.telefone || undefined;
    }

    if (!finalCustomerId) {
      try {
        const customerResponse = await axios.post(
          `${ASAAS_BASE_URL}/customers`,
          {
            name: customerName || customerEmail || 'Paciente FisioCareHub',
            email: customerEmail,
            cpfCnpj: cleanCpf,
            phone: onlyDigits(customerPhone),
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

    const appUrl = getAppUrl(req);

    const paymentData: any = {
      customer: finalCustomerId,
      billingType,
      value: finalValue,
      dueDate: dueDate.toISOString().split('T')[0],
      description: finalDescription,
      externalReference: finalExternalReference,
      callback: isLibraryPayment
        ? {
            successUrl: `${appUrl}/patient/library?checkout=success`,
            autoRedirect: true,
          }
        : undefined,
    };

    if (billingType === 'CREDIT_CARD' && Number(installments) > 1) {
      const installmentCount = Number(installments);
      paymentData.installmentCount = installmentCount;
      paymentData.installmentValue = Number((finalValue / installmentCount).toFixed(2));
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
          external_reference: finalExternalReference,
          amount: finalValue,
          status: 'pending',
          gateway: 'asaas',
          method: billingType,
          invoice_url: payment.invoiceUrl || payment.bankSlipUrl || null,
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
      externalReference: finalExternalReference,
      materialIds: isLibraryPayment ? normalizedMaterialIds : undefined,
    });
  } catch (err: any) {
    console.error('[Asaas] Erro geral:', err.response?.data || err.message);
    return res.status(err.response?.status || 500).json({
      error: getAsaasErrorMessage(err),
      details: err.response?.data,
    });
  }
}
