import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // importante ser SERVICE ROLE
);

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const payment = req.body;

    console.log("🔥 ASAAS WEBHOOK RECEBIDO:", JSON.stringify(payment, null, 2));

    // 1. salvar pagamento
    const { data: pagamento, error: pagamentoError } = await supabase
      .from("pagamentos")
      .insert({
        external_id: payment.id,
        external_reference: payment.externalReference || null,
        amount: payment.value,
        status: payment.status,
        gateway: "asaas",
        method: payment.billingType,
        confirmed_at: payment.confirmedDate || null,
      })
      .select()
      .single();

    if (pagamentoError) {
      console.error("Erro ao salvar pagamento:", pagamentoError);
    }

    // 2. se tiver referência, atualiza agendamento
    if (payment.externalReference) {
      const { error: agendamentoError } = await supabase
        .from("agendamentos")
        .update({
          status: payment.status === "RECEIVED" || payment.status === "CONFIRMED"
            ? "pago"
            : "pendente",
        })
        .eq("id", payment.externalReference);

      if (agendamentoError) {
        console.error("Erro ao atualizar agendamento:", agendamentoError);
      }
    }

    // 3. sempre responde OK pro Asaas
    return res.status(200).send("OK");

  } catch (error) {
    console.error("Webhook error:", error);

    // IMPORTANTÍSSIMO: nunca quebrar o Asaas
    return res.status(200).send("OK");
  }
}
