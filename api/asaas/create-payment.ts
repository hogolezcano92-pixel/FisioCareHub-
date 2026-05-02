import type { VercelRequest, VercelResponse } from '@vercel/node';

const ASAAS_API_KEY = process.env.ASAAS_API_KEY || "";
const ASAAS_BASE_URL = "https://www.asaas.com/api/v3";

const headers = {
  'Content-Type': 'application/json',
  'access_token': ASAAS_API_KEY
};

/**
 * Busca um cliente pelo e-mail ou cria um novo se não existir.
 */
async function getOrCreateCustomer(nome: string, email: string, cpf: string) {
  console.log(`[Asaas] Buscando cliente por e-mail: ${email}`);
  
  // 1. Buscar cliente existente
  const searchUrl = `${ASAAS_BASE_URL}/customers?email=${encodeURIComponent(email)}`;
  const searchRes = await fetch(searchUrl, { headers });
  const searchData = await searchRes.json();

  if (searchData.data && searchData.data.length > 0) {
    const existingId = searchData.data[0].id;
    console.log(`[Asaas] Cliente encontrado: ${existingId}`);
    return existingId;
  }

  // 2. Criar novo cliente se não encontrado
  console.log(`[Asaas] Cliente não encontrado. Criando novo para: ${email}`);
  const createRes = await fetch(`${ASAAS_BASE_URL}/customers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: nome,
      email: email,
      cpfCnpj: cpf?.replace(/\D/g, '') // Garantir que apenas números sejam enviados
    })
  });

  const createData = await createRes.json();
  if (createData.id) {
    console.log(`[Asaas] Novo cliente criado: ${createData.id}`);
    return createData.id;
  }
  
  const errorMsg = createData.errors?.[0]?.description || "Erro ao criar cliente no Asaas";
  throw new Error(errorMsg);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuração básica de CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (!ASAAS_API_KEY) {
    console.error("[Asaas Error] ASAAS_API_KEY não configurada.");
    return res.status(500).json({ error: "Erro de configuração: Token do Asaas não encontrado." });
  }

  try {
    // Destructure new standardized names from req.body
    const { name, email, value, appointmentId, cpf, parcelas } = req.body;

    // Log the received payload for debugging as requested
    console.log("Dados recebidos no backend para Asaas:", { name, email, value, appointmentId });

    // Validação básica dos dados recebidos
    if (!name || !email || !value || !appointmentId) {
      return res.status(400).json({ 
        error: "Dados obrigatórios ausentes: nome, email, valor e id_agendamento são necessários." 
      });
    }

    // 1. Obter ou Criar o Cliente no Asaas
    const customerId = await getOrCreateCustomer(name, email, cpf);

    // 2. Preparar payload da cobrança
    const numParcelas = Number(parcelas) || 1;
    
    // Ensure value is a valid number, handling potential string with comma
    let totalValue = Number(value);
    if (typeof value === 'string') {
      totalValue = parseFloat(value.replace(',', '.'));
    }

    const now = new Date();
    const dueDate = now.toISOString().split('T')[0]; // Vencimento para hoje (Checkout)

    const paymentPayload: any = {
      customer: customerId,
      billingType: 'UNDEFINED', // Permite Cartão, PIX ou Boleto no checkout do Asaas
      value: Number(totalValue.toFixed(2)),
      dueDate,
      description: `FisioCareHub - Agendamento #${appointmentId}`,
      externalReference: String(appointmentId),
      postalService: false
    };

    // Configuração de parcelamento se aplicável
    if (numParcelas > 1) {
      paymentPayload.installmentCount = numParcelas;
      paymentPayload.installmentValue = (totalValue / numParcelas).toFixed(2);
    }

    console.log(`[Asaas] Criando cobrança para o Agendamento: ${appointmentId}`);

    // 3. Gerar a cobrança no Asaas
    const paymentRes = await fetch(`${ASAAS_BASE_URL}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(paymentPayload)
    });

    const paymentData = await paymentRes.json();

    if (paymentRes.ok) {
      console.log(`[Asaas Success] Cobrança gerada com sucesso: ${paymentData.id}`);
      return res.status(200).json({
        id: paymentData.id,
        invoiceUrl: paymentData.invoiceUrl,
        bankSlipUrl: paymentData.bankSlipUrl,
        url: paymentData.invoiceUrl || paymentData.bankSlipUrl
      });
    } else {
      console.error("[Asaas API Error]", JSON.stringify(paymentData));
      return res.status(paymentRes.status).json({
        error: "Erro na API do Asaas",
        details: paymentData.errors
      });
    }

  } catch (error: any) {
    console.error("[Asaas Exception]", error);
    return res.status(500).json({ 
      error: "Ocorreu um erro interno ao processar o pagamento.",
      message: error.message 
    });
  }
}
