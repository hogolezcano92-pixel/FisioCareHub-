import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { email, nome, tipo, data, horario, fisioterapeuta } = req.body;

    let subject = "";
    let html = "";

    // Email de boas-vindas
    if (tipo === "boas_vindas") {
      subject = "Bem-vindo ao FisioCareHub";
      html = `
        <h2>Bem-vindo ao FisioCareHub</h2>
        <p>Olá ${nome}, sua conta foi criada com sucesso.</p>
        <p>Agora você já pode agendar consultas com fisioterapeutas.</p>
      `;
    }

    // Confirmação para paciente
    if (tipo === "agendamento_paciente") {
      subject = "Agendamento confirmado";
      html = `
        <h2>Seu agendamento foi confirmado</h2>
        <p>Fisioterapeuta: ${fisioterapeuta}</p>
        <p>Data: ${data}</p>
        <p>Horário: ${horario}</p>
      `;
    }

    // Aviso para fisioterapeuta
    if (tipo === "agendamento_fisio") {
      subject = "Novo agendamento recebido";
      html = `
        <h2>Novo agendamento</h2>
        <p>Paciente: ${nome}</p>
        <p>Data: ${data}</p>
        <p>Horário: ${horario}</p>
      `;
    }

    const response = await resend.emails.send({
      from: "FisioCareHub <noreply@fisiocarehub.company>",
      to: email,
      subject: subject,
      html: html
    });

    return res.status(200).json(response);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
