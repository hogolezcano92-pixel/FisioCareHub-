import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { 
    valor, 
    id_agendamento, 
    customer_id, 
    descricao,
    // Supporting existing frontend naming as fallback
    amount,
    appointment_id,
    description,
    user_id 
  } = req.body;

  const apiKey = process.env.ASAAS_API_KEY;
  
  if (!apiKey) {
    console.error("[Asaas Error] ASAAS_API_KEY variable not found in production environment.");
    return res.status(500).json({ 
      error: "Ocorreu um erro de configuração no servidor. A chave de API do Asaas não foi encontrada." 
    });
  }

  try {
    const ASAAS_PROD_URL = "https://www.asaas.com/api/v3/payments";
    
    // dueDate today (YYYY-MM-DD)
    const dueDate = new Date().toISOString().split('T')[0];

    // Priority to requested fields, fallback to existing ones
    const billingAmount = valor || amount;
    const refId = id_agendamento || appointment_id;
    const finalDesc = descricao || description || `Agendamento FisioCareHub - Ref: ${refId}`;

    if (!billingAmount || !refId) {
      return res.status(400).json({ error: "Dados insuficientes: valor e id_agendamento são obrigatórios." });
    }

    // Note: customer_id in the body is expected to be the Asaas Customer ID as per user specification.
    // If it's missing, we try to use the user_id if we were to resolve it, but for strictly following 
    // the requested "Production" behavior, we expect customer_id.
    let asaasCustomerId = customer_id;
    
    // If customer_id is missing but user_id is present, we might need a resolve step, 
    // but the user's prompt suggests they are passing the customer_id directly.
    if (!asaasCustomerId && !user_id) {
       return res.status(400).json({ error: "customer_id ou user_id é obrigatório." });
    }

    const payload = {
      customer: asaasCustomerId || user_id, // Fallback if they are using user_id as customer_id
      billingType: 'PIX',
      value: Number(billingAmount),
      dueDate: dueDate,
      description: finalDesc,
      externalReference: String(refId),
    };

    console.log(`[Asaas Production] Creating PIX payment for appointment: ${refId}`);

    const response = await fetch(ASAAS_PROD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`[Asaas Success] Payment created successfully: ${data.id}`);
      return res.status(200).json(data);
    } else {
      console.error("[Asaas API Error Response]", JSON.stringify(data));
      // Return the error JSON from Asaas with the same status code
      return res.status(response.status).json(data);
    }
  } catch (error: any) {
    console.error("[Asaas Internal Error]", error);
    return res.status(500).json({ 
      error: "Erro inesperado ao processar a cobrança no Asaas.",
      details: error.message 
    });
  }
}
