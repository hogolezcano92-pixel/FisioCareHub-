export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  console.log("Asaas webhook recebido:", req.body);

  return res.status(200).send("OK");
}
