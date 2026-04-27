export default function handler(req, res) {
  try {
    console.log("🔥 ASAAS WEBHOOK RECEBIDO:");
    console.log("method:", req.method);
    console.log("body:", JSON.stringify(req.body));

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook error:", error);

    // IMPORTANTÍSSIMO: mesmo erro devolve 200
    return res.status(200).send("OK");
  }
}
