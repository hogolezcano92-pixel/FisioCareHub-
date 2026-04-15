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
    const result = await invokeFunction('Send-email', finalPayload);
    console.log('Resposta da Function Send-email:', result);
    return true;
  } catch (error) {
    console.error('Erro ao preparar ou enviar e-mail:', error);
    return false;
  }
};

export const sendWelcomeEmail = async (email: string, name: string, role: 'paciente' | 'fisioterapeuta' = 'paciente') => {
  const isPhysio = role === 'fisioterapeuta';
  
  const welcomeHtml = isPhysio ? `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #0ea5e9; padding: 40px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">FisioCareHub</h1>
        <p style="color: #e0f2fe; margin: 10px 0 0 0; font-size: 16px;">Cadastro de Profissional</p>
      </div>
      <div style="padding: 40px 30px;">
        <p style="font-size: 18px; color: #1e293b; margin-bottom: 24px;">Olá <strong>${name}</strong>,</p>
        <p style="font-size: 16px; color: #475569; line-height: 1.6; margin-bottom: 32px;">
          Seu cadastro como <strong>Fisioterapeuta</strong> no FisioCareHub foi recebido com sucesso! 
        </p>
        
        <div style="background-color: #f0f9ff; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #e0f2fe;">
          <p style="margin: 0; color: #0369a1; font-size: 15px; font-weight: 600;">Próximos passos:</p>
          <ul style="margin: 16px 0 0 0; padding-left: 20px; color: #0c4a6e; font-size: 14px; line-height: 1.8;">
            <li>Nossa equipe analisará seus documentos e informações</li>
            <li>Você receberá uma notificação assim que seu perfil for aprovado</li>
            <li>Após a aprovação, você poderá configurar sua agenda e começar a atender</li>
          </ul>
        </div>

        <p style="font-size: 14px; color: #64748b; margin-bottom: 32px;">
          Enquanto isso, você já pode acessar seu painel para completar as informações do seu perfil.
        </p>

        <div style="text-align: center;">
          <a href="${typeof window !== 'undefined' ? window.location.origin : 'https://fisiocarehub.company'}/dashboard" style="display: inline-block; background-color: #0ea5e9; color: #ffffff; font-weight: 700; font-size: 16px; padding: 16px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 10px 15px -3px rgba(14, 165, 233, 0.3);">
            Acessar Meu Painel
          </a>
        </div>
      </div>
      <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; ${new Date().getFullYear()} FisioCareHub. Todos os direitos reservados.</p>
      </div>
    </div>
  ` : `
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
          <a href="${typeof window !== 'undefined' ? window.location.origin : 'https://fisiocarehub.company'}/dashboard" style="display: inline-block; background-color: #0ea5e9; color: #ffffff; font-weight: 700; font-size: 16px; padding: 16px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 10px 15px -3px rgba(14, 165, 233, 0.3);">
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
    subject: isPhysio ? 'Bem-vindo ao FisioCareHub - Cadastro de Profissional' : 'Bem-vindo ao FisioCareHub!',
    html: welcomeHtml,
    data: { name, role }
  });
};

export const sendAppointmentConfirmation = async (
  patientEmail: string, 
  physioEmail: string, 
  details: { 
    appointmentId: string;
    patientName: string; 
    patientEmail?: string;
    patientPhone?: string;
    patientAddress?: string;
    patientCity?: string;
    patientState?: string;
    patientZip?: string;
    patientDOB?: string;
    patientAvatar?: string;
    physioName: string; 
    physioPhone?: string;
    physioAddress?: string;
    physioEmail?: string;
    date: string; 
    time: string;
    service: string;
    notes?: string;
  }
) => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://fisiocarehub.company';
  const confirmationUrl = `${baseUrl}/agendamento/confirmar?id=${details.appointmentId}`;

  const professionalHtml = (role: 'patient' | 'physio') => `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; background-color: #ffffff; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);">
      <div style="background-color: #0ea5e9; padding: 48px 24px; text-align: center; background-image: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.05em; text-transform: uppercase;">FisioCareHub</h1>
        <p style="color: #e0f2fe; margin: 12px 0 0 0; font-size: 16px; font-weight: 500; opacity: 0.9;">${role === 'patient' ? 'Confirmação de Agendamento' : 'Novo Agendamento Recebido'}</p>
      </div>
      
      <div style="padding: 40px 32px;">
        <p style="font-size: 18px; color: #1e293b; margin-bottom: 24px;">Olá <strong>${role === 'patient' ? details.patientName : details.physioName}</strong>,</p>
        <p style="font-size: 16px; color: #475569; line-height: 1.6; margin-bottom: 32px;">
          ${role === 'patient' 
            ? `Sua consulta de <strong>${details.service}</strong> com <strong>${details.physioName}</strong> foi registrada com sucesso.`
            : `Você tem uma nova solicitação de <strong>${details.service}</strong> com o paciente <strong>${details.patientName}</strong>.`
          }
        </p>
        
        <div style="background-color: #f8fafc; border-radius: 20px; padding: 32px; margin-bottom: 32px; border: 1px solid #f1f5f9;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0;">
            <div>
              <span style="color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 6px;">Data</span>
              <span style="color: #1e293b; font-size: 18px; font-weight: 700;">${details.date}</span>
            </div>
            <div>
              <span style="color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 6px;">Horário</span>
              <span style="color: #1e293b; font-size: 18px; font-weight: 700;">${details.time}</span>
            </div>
          </div>

          <div style="margin-bottom: 24px;">
            <span style="color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 6px;">Serviço Solicitado</span>
            <span style="color: #1e293b; font-size: 18px; font-weight: 700;">${details.service}</span>
          </div>

          ${role === 'physio' ? `
            <div style="margin-top: 24px; padding-top: 24px; border-top: 2px dashed #e2e8f0;">
              <p style="color: #0ea5e9; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 20px;">Ficha do Paciente</p>
              
              <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
                ${details.patientAvatar ? `
                  <img src="${details.patientAvatar}" style="width: 64px; height: 64px; border-radius: 16px; object-cover: cover; border: 2px solid #e2e8f0;" />
                ` : ''}
                <div>
                  <span style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; display: block;">Nome Completo</span>
                  <span style="color: #1e293b; font-size: 16px; font-weight: 700;">${details.patientName}</span>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                ${details.patientPhone ? `
                  <div>
                    <span style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; display: block;">Telefone</span>
                    <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${details.patientPhone}</span>
                  </div>
                ` : ''}
                ${details.patientDOB ? `
                  <div>
                    <span style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; display: block;">Nascimento</span>
                    <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${details.patientDOB}</span>
                  </div>
                ` : ''}
              </div>

              ${details.patientEmail ? `
                <div style="margin-bottom: 16px;">
                  <span style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; display: block;">E-mail</span>
                  <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${details.patientEmail}</span>
                </div>
              ` : ''}

              ${details.patientAddress ? `
                <div style="margin-bottom: 16px;">
                  <span style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; display: block;">Endereço Completo</span>
                  <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${details.patientAddress}</span>
                  <span style="color: #475569; font-size: 13px; display: block; margin-top: 2px;">
                    ${details.patientCity || ''} ${details.patientState ? `- ${details.patientState}` : ''} ${details.patientZip ? `| CEP: ${details.patientZip}` : ''}
                  </span>
                </div>
              ` : ''}
            </div>
          ` : `
            <div style="margin-top: 24px; padding-top: 24px; border-top: 2px dashed #e2e8f0;">
              <p style="color: #0ea5e9; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 20px;">Dados do Profissional</p>
              <div style="margin-bottom: 12px;">
                <span style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; display: block;">Fisioterapeuta</span>
                <span style="color: #1e293b; font-size: 16px; font-weight: 700;">${details.physioName}</span>
              </div>
              ${details.physioPhone ? `
                <div style="margin-bottom: 12px;">
                  <span style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; display: block;">Telefone de Contato</span>
                  <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${details.physioPhone}</span>
                </div>
              ` : ''}
              ${details.physioAddress ? `
                <div style="margin-bottom: 12px;">
                  <span style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; display: block;">Local de Atendimento</span>
                  <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${details.physioAddress}</span>
                </div>
              ` : ''}
            </div>
          `}

          ${details.notes ? `
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <span style="color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 8px;">Observações do Paciente</span>
              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 8px;">
                <p style="color: #92400e; font-size: 14px; line-height: 1.5; margin: 0; font-style: italic;">"${details.notes}"</p>
              </div>
            </div>
          ` : ''}
        </div>

        ${role === 'physio' ? `
          <div style="text-align: center;">
            <a href="${confirmationUrl}" style="display: inline-block; background-color: #0ea5e9; color: #ffffff; font-weight: 800; font-size: 16px; padding: 20px 40px; border-radius: 16px; text-decoration: none; box-shadow: 0 10px 15px -3px rgba(14, 165, 233, 0.4); text-transform: uppercase; letter-spacing: 0.05em;">
              Confirmar Agendamento
            </a>
            <p style="margin-top: 20px; font-size: 12px; color: #94a3b8; font-weight: 500;">Ao clicar, o paciente receberá uma confirmação automática.</p>
          </div>
        ` : `
          <div style="text-align: center;">
            <p style="font-size: 15px; color: #64748b; line-height: 1.6;">Aguarde a confirmação do profissional. Você receberá uma notificação assim que o horário for validado.</p>
          </div>
        `}
      </div>
      
      <div style="background-color: #f8fafc; padding: 32px; text-align: center; border-top: 1px solid #f1f5f9;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: 600;">&copy; ${new Date().getFullYear()} FisioCareHub. Todos os direitos reservados.</p>
        <p style="margin: 8px 0 0 0; font-size: 11px; color: #cbd5e1;">Este é um e-mail automático, por favor não responda.</p>
      </div>
    </div>
  `;

  // Envia para o paciente
  sendEmail({
    to: patientEmail,
    event: 'appointment',
    subject: 'Solicitação de Agendamento - FisioCareHub',
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

export const sendAppointmentStatusEmail = async (
  toEmail: string,
  userName: string,
  physioName: string,
  status: 'confirmado' | 'cancelado',
  details: {
    date: string;
    time: string;
    service: string;
  }
) => {
  const isConfirmed = status === 'confirmado';
  
  const statusHtml = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; background-color: #ffffff; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);">
      <div style="background-color: ${isConfirmed ? '#10b981' : '#ef4444'}; padding: 48px 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.05em; text-transform: uppercase;">FisioCareHub</h1>
        <p style="color: #ffffff; margin: 12px 0 0 0; font-size: 16px; font-weight: 500; opacity: 0.9;">Agendamento ${isConfirmed ? 'Confirmado' : 'Cancelado'}</p>
      </div>
      
      <div style="padding: 40px 32px;">
        <p style="font-size: 18px; color: #1e293b; margin-bottom: 24px;">Olá <strong>${userName}</strong>,</p>
        <p style="font-size: 16px; color: #475569; line-height: 1.6; margin-bottom: 32px;">
          Seu agendamento de <strong>${details.service}</strong> com <strong>${physioName}</strong> foi <strong>${isConfirmed ? 'confirmado' : 'cancelado'}</strong> pelo profissional.
        </p>
        
        <div style="background-color: #f8fafc; border-radius: 20px; padding: 32px; margin-bottom: 32px; border: 1px solid #f1f5f9;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
            <div>
              <span style="color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 6px;">Data</span>
              <span style="color: #1e293b; font-size: 18px; font-weight: 700;">${details.date}</span>
            </div>
            <div>
              <span style="color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 6px;">Horário</span>
              <span style="color: #1e293b; font-size: 18px; font-weight: 700;">${details.time}</span>
            </div>
          </div>
        </div>

        <div style="text-align: center;">
          <a href="${typeof window !== 'undefined' ? window.location.origin : 'https://fisiocarehub.company'}/dashboard" style="display: inline-block; background-color: #0ea5e9; color: #ffffff; font-weight: 800; font-size: 16px; padding: 18px 36px; border-radius: 16px; text-decoration: none; box-shadow: 0 10px 15px -3px rgba(14, 165, 233, 0.4); text-transform: uppercase; letter-spacing: 0.05em;">
            Acessar Meu Painel
          </a>
        </div>
      </div>
      
      <div style="background-color: #f8fafc; padding: 32px; text-align: center; border-top: 1px solid #f1f5f9;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: 600;">&copy; ${new Date().getFullYear()} FisioCareHub. Todos os direitos reservados.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    event: 'appointment',
    subject: `Agendamento ${isConfirmed ? 'Confirmado' : 'Cancelado'} - FisioCareHub`,
    html: statusHtml,
    data: { status, physioName, ...details }
  });
};
