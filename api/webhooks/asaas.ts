export default function handler(req, res) {
  try {
    console.log("🔥 ASAAS WEBHOOK");
    console.log("method:", req.method);
    console.log("body:", req.body);

    // NUNCA deixar quebrar resposta
    return res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook error:", error);

    // mesmo com erro, responde 200
    return res.status(200).send("OK");
  }
}
