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
    // Agora também aceita appointmentId para rastreamento.
    const finalPayload = {
      to: payload.to,
      subject: payload.subject,
      html: payload.html || payload.body,
      appointmentId: payload.data?.appointmentId
    };

    console.log(`Disparando e-mail para ${finalPayload.to} (Evento: ${payload.event})`);
    
    // O nome da função no Supabase é 'Send-email' (case sensitive)
    invokeFunction('Send-email', finalPayload)
      .then(result => {
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
  const welcomeHtml = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #0ea5e9; padding: 40px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">FisioCareHub</h1>
        <p style="color: #e0f2fe; margin: 10px 0 0 0; font-size: 16px;">Bem-vindo à nossa comunidade!</p>
      </div>
      <div style="padding: 40px 30px;">
        <p style="font-size: 18px; color: #1e293b; margin-bottom: 24px;">Olá <strong>${name}</strong>,</p>
        <p style="font-size: 16px; color: #475569; line-height: 1.6; margin-bottom: 32px;">
          É um prazer ter você conosco no <strong>FisioCareHub</strong>. Nossa missão é conectar você aos melhores profissionais de fisioterapia para um atendimento humanizado e eficiente no conforto do seu lar.
        </p>
        
        <div style="background-color: #f0f9ff; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #e0f2fe;">
          <p style="margin: 0; color: #0369a1; font-size: 15px; font-weight: 600;">O que você pode fazer agora:</p>
          <ul style="margin: 16px 0 0 0; padding-left: 20px; color: #0c4a6e; font-size: 14px; line-height: 1.8;">
            <li>Explorar profissionais qualificados</li>
            <li>Agendar consultas em horários flexíveis</li>
            <li>Acompanhar seu histórico de tratamentos</li>
            <li>Acessar nossa biblioteca de saúde</li>
          </ul>
        </div>

        <div style="text-align: center;">
          <a href="https://fisiocarehub.company/dashboard" style="display: inline-block; background-color: #0ea5e9; color: #ffffff; font-weight: 700; font-size: 16px; padding: 16px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 10px 15px -3px rgba(14, 165, 233, 0.3);">
            Acessar Meu Painel
          </a>
        </div>
      </div>
      <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; ${new Date().getFullYear()} FisioCareHub. Todos os direitos reservados.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    event: 'signup',
    subject: 'Bem-vindo ao FisioCareHub!',
    html: welcomeHtml,
    data: { name }
  });
};

export const sendAppointmentConfirmation = async (
  patientEmail: string, 
  physioEmail: string, 
  details: { 
    appointmentId: string;
    patientName: string; 
    physioName: string; 
    date: string; 
    time: string;
    service: string;
  }
) => {
  const confirmationUrl = `https://fisiocarehub.company/agendamento/confirmar?id=${details.appointmentId}`;

  const professionalHtml = (role: 'patient' | 'physio') => `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #0ea5e9; padding: 40px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">FisioCareHub</h1>
        <p style="color: #e0f2fe; margin: 10px 0 0 0; font-size: 16px;">${role === 'patient' ? 'Confirmação de Agendamento' : 'Novo Agendamento Recebido'}</p>
      </div>
      <div style="padding: 40px 30px;">
        <p style="font-size: 18px; color: #1e293b; margin-bottom: 24px;">Olá <strong>${role === 'patient' ? details.patientName : details.physioName}</strong>,</p>
        <p style="font-size: 16px; color: #475569; line-height: 1.6; margin-bottom: 32px;">
          ${role === 'patient' 
            ? `Sua consulta de <strong>${details.service}</strong> com <strong>${details.physioName}</strong> foi registrada com sucesso.`
            : `Você tem uma nova solicitação de <strong>${details.service}</strong> com o paciente <strong>${details.patientName}</strong>.`
          }
        </p>
        
        <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #f1f5f9;">
          <div style="margin-bottom: 12px;">
            <span style="color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Data</span>
            <span style="color: #1e293b; font-size: 16px; font-weight: 600;">${details.date}</span>
          </div>
          <div style="margin-bottom: 12px;">
            <span style="color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Horário</span>
            <span style="color: #1e293b; font-size: 16px; font-weight: 600;">${details.time}</span>
          </div>
          <div>
            <span style="color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Serviço</span>
            <span style="color: #1e293b; font-size: 16px; font-weight: 600;">${details.service}</span>
          </div>
        </div>

        ${role === 'physio' ? `
          <div style="text-align: center;">
            <a href="${confirmationUrl}" style="display: inline-block; background-color: #0ea5e9; color: #ffffff; font-weight: 700; font-size: 16px; padding: 16px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 10px 15px -3px rgba(14, 165, 233, 0.3);">
              Confirmar Agendamento
            </a>
            <p style="margin-top: 16px; font-size: 12px; color: #94a3b8;">Ao clicar, o status da consulta será atualizado para confirmado.</p>
          </div>
        ` : `
          <div style="text-align: center;">
            <p style="font-size: 14px; color: #64748b;">Aguarde a confirmação do profissional. Você receberá uma notificação assim que for confirmado.</p>
          </div>
        `}
      </div>
      <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; ${new Date().getFullYear()} FisioCareHub. Todos os direitos reservados.</p>
      </div>
    </div>
  `;

  // Envia para o paciente
  sendEmail({
    to: patientEmail,
    event: 'appointment',
    subject: 'Confirmação de Agendamento - FisioCareHub',
    html: professionalHtml('patient'),
    data: { ...details, role: 'patient' }
  });

  // Envia para o fisioterapeuta
  if (physioEmail) {
    sendEmail({
      to: physioEmail,
      event: 'appointment',
      subject: 'Novo Agendamento Recebido - FisioCareHub',
      html: professionalHtml('physio'),
      data: { ...details, role: 'physio' }
    });
  }
};
