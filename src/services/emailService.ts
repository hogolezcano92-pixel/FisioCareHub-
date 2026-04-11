import { invokeFunction } from '../lib/supabase';

export type EmailEvent = 'signup' | 'appointment';

interface EmailPayload {
  to: string;
  subject: string;
  body?: string;
  html?: string;
  event: EmailEvent;
  data?: any;
}

export const sendEmail = async (payload: EmailPayload): Promise<boolean> => {
  try {
    const finalPayload = {
      to: payload.to,
      subject: payload.subject,
      html: payload.html ?? payload.body ?? ''
    };

    console.log('Enviando e-mail:', finalPayload);

    await invokeFunction('Send-email', finalPayload);

    return true;
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    return false;
  }
};

export const sendWelcomeEmail = async (email: string, name: string) => {
  return sendEmail({
    to: email,
    event: 'signup',
    subject: 'Bem-vindo ao FisioCareHub!',
    body: `Olá ${name}, seja bem-vindo à nossa plataforma de fisioterapia domiciliar.`,
    data: { name }
  });
};

export const sendAppointmentConfirmation = async (
  patientEmail: string,
  physioEmail: string,
  details: {
    patientName: string;
    physioName: string;
    date: string;
    time: string;
    service: string;
  }
) => {
  // paciente
  await sendEmail({
    to: patientEmail,
    event: 'appointment',
    subject: 'Confirmação de Agendamento - FisioCareHub',
    body: `Olá ${details.patientName}, sua consulta de ${details.service} com ${details.physioName} está agendada para ${details.date} às ${details.time}.`,
    data: { ...details, role: 'patient' }
  });

  // fisioterapeuta
  if (physioEmail) {
    await sendEmail({
      to: physioEmail,
      event: 'appointment',
      subject: 'Novo Agendamento Recebido - FisioCareHub',
      body: `Olá ${details.physioName}, você tem um novo agendamento de ${details.service} com ${details.patientName} para ${details.date} às ${details.time}.`,
      data: { ...details, role: 'physio' }
    });
  }
};
