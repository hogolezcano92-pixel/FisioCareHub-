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

export const sendEmail = async (payload: EmailPayload) => {
  try {
    // A Edge Function exige exatamente os campos to, subject e html no body JSON.
    const finalPayload = {
      to: payload.to,
      subject: payload.subject,
      html: payload.html ?? payload.body ?? ''
    };

    console.log(`Disparando e-mail para ${finalPayload.to} (Evento: ${payload.event})`);
    
    // O nome da função no Supabase é 'Send-email' (case sensitive)
    await invokeFunction('Send-email', finalPayload)
      (result => {
        console.log('Resposta da Function Send-email:', result);
      })
      .catch(err => {
        console.error('Erro ao chamar Function Send-email:', err);
      });
      
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
