import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from "axios";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 📌 1. Extração
    const { 
      name, 
      email, 
      value, 
      appointmentId, 
      user_id, 
      phone, 
      cpf, 
      installments,
      billingType = "PIX",
      customerId
    } = req.body;

    // 📌 2. Validações básicas
    const validTypes = ["PIX", "BOLETO", "CREDIT_CARD"];
    if (!validTypes.includes(billingType)) {
      return res.status(400).json({
        error: "billingType inválido"
      });
    }

    if (!appointmentId) {
      return res.status(400).json({ error: "appointmentId é necessário." });
    }

    if (!value || Number(value) <= 0) {
      return res.status(400).json({ error: "Valor inválido." });
    }

    const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
    const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";

    if (!ASAAS_API_KEY) {
      return res.status(500).json({ error: "ASAAS_API_KEY não configurada." });
    }

    // 📌 3. Garantir CUSTOMER válido
    let finalCustomerId = customerId;

    if (!finalCustomerId) {
      if (!name || !cpf) {
        return res.status(400).json({
          error: "Para criar cliente automaticamente, envie name e cpf"
        });
      }

      try {
        const customerResponse = await axios.post(
          `${ASAAS_BASE_URL}/customers`,
          {
            name,
            email,
            cpfCnpj: cpf,
            phone
          },
          {
            headers: {
              'access_token': ASAAS_API_KEY,
              'Content-Type': 'application/json'
            }
          }
        );

        finalCustomerId = customerResponse.data.id;

      } catch (customerError: any) {
        console.error("ERRO AO CRIAR CUSTOMER:", customerError.response?.data || customerError.message);

        return res.status(500).json({
          error: "Erro ao criar cliente no Asaas",
          details: customerError.response?.data
        });
      }
    }

    // 📌 4. Criar pagamento
    const paymentData: any = {
      customer: finalCustomerId,
      billingType,
      value: Number(value),
      dueDate: new Date().toISOString().split("T")[0],
      description: `Agendamento ${appointmentId}`,
      externalReference: String(appointmentId)
    };

    if (billingType === "CREDIT_CARD" && installments) {
      paymentData.installmentCount = Number(installments);
      paymentData.installmentValue = Number((value / installments).toFixed(2));
    }

    const response = await axios.post(
      `${ASAAS_BASE_URL}/payments`,
      paymentData,
      {
        headers: {
          'access_token': ASAAS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const payment = response.data;

    if (!payment || !payment.id) {
      throw new Error("Falha ao criar pagamento Asaas");
    }

    // 📌 5. Resposta final
    return res.status(200).json({
      id: payment.id,
      customerId: finalCustomerId, // 🔥 importante pra salvar no front ou banco depois
      invoiceUrl: payment.invoiceUrl,
      bankSlipUrl: payment.bankSlipUrl,
      pixQrCode: payment.pixQrCode,
      pixCopyPaste: payment.pixCopyPaste
    });

  } catch (err: any) {
    console.error("ASAAS ERROR:", err.response?.data || err.message);

    return res.status(500).json({
      error: err.message,
      details: err.response?.data
    });
  }
}
