import type { VercelRequest, VercelResponse } from '@vercel/node';

const ASAAS_API_KEY = process.env.ASAAS_API_KEY || "";
const ASAAS_BASE_URL = "https://www.asaas.com/api/v3";

const headers = {
  'Content-Type': 'application/json',
  'access_token': ASAAS_API_KEY
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  if (!ASAAS_API_KEY) {
    return res.status(500).json({ error: "ASAAS_API_KEY não configurada." });
  }

  try {
    const { customerId, value, dueDate, agendamentoId } = req.body;

    if (!customerId || !value || !dueDate || !agendamentoId) {
      return res.status(400).json({ error: "Dados obrigatórios ausentes: customerId, value, dueDate, agendamentoId" });
    }

    const payload = {
      customer: customerId,
      billingType: 'UNDEFINED',
      value: Number(value),
      dueDate: dueDate,
      description: `Consulta FisioCareHub Agendamento #${agendamentoId}`,
      externalReference: String(agendamentoId),
      postalService: false
    };

    console.log(`[Asaas] Criando cobrança específica para agendamento ${agendamentoId}`);

    const response = await fetch(`${ASAAS_BASE_URL}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      // Retornar a mesma estrutura esperada (invoiceUrl é data.invoiceUrl)
      return res.status(200).json({
        ...data,
        invoiceUrl: data.invoiceUrl || data.bankSlipUrl // fallback minimal
      });
    } else {
      console.error("[Asaas Error]", data);
      return res.status(response.status).json({ error: "Erro Asaas", details: data });
    }

  } catch (error: any) {
    console.error("[API Exception]", error);
    return res.status(500).json({ error: error.message });
  }
}
