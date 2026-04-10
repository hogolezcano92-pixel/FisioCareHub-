import { invokeFunction } from '../lib/supabase';

export type EmailEvent = 'signup' | 'appointment';

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  event: EmailEvent;
  data?: any;
}

export const sendEmail = async (payload: EmailPayload) => {
  try {
    console.log(`Disparando e-mail para ${payload.to} (Evento: ${payload.event})`);
    
    // Não bloqueia o fluxo principal
    invokeFunction('send-email', payload)
      .then(result => console.log('E-mail enviado com sucesso:', result))
      .catch(err => console.error('Falha silenciosa ao enviar e-mail:', err));
      
    return true;
  } catch (error) {
    console.error('Erro ao preparar envio de e-mail:', error);
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
  // Envia para o paciente
  sendEmail({
    to: patientEmail,
    event: 'appointment',
    subject: 'Confirmação de Agendamento - FisioCareHub',
    body: `Olá ${details.patientName}, sua consulta de ${details.service} com ${details.physioName} está agendada para ${details.date} às ${details.time}.`,
    data: { ...details, role: 'patient' }
  });

  // Envia para o fisioterapeuta
  if (physioEmail) {
    sendEmail({
      to: physioEmail,
      event: 'appointment',
      subject: 'Novo Agendamento Recebido - FisioCareHub',
      body: `Olá ${details.physioName}, você tem um novo agendamento de ${details.service} com ${details.patientName} para ${details.date} às ${details.time}.`,
      data: { ...details, role: 'physio' }
    });
  }
};
