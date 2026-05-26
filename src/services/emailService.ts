/**
 * FisioCareHub - Transactional Email Service
 * Todos os e-mails usam o template premium oficial do FisioCareHub.
 */

import { invokeFunction } from '../lib/supabase.ts';
import { escapeHtml, generateEmailHTML } from './emailTemplate.ts';
export { generateEmailHTML };

/**
 * Sends a welcome email to a new user
 */
export const sendWelcomeEmail = async (email: string, name: string, role: 'paciente' | 'fisioterapeuta') => {
  console.log(`[EmailService] [FLOW-AUDIT] Preparing welcome email for ${name} (${email}) as ${role}`);

  if (!email) {
    console.warn(`[EmailService] [FLOW-AUDIT] ABORTED: No email provided for ${name}`);
    return { success: false, error: 'Email não fornecido' };
  }

  const safeName = escapeHtml(name);

  const welcomeMessage = role === 'fisioterapeuta'
    ? `
      <h2 style="font-family:Arial, Helvetica, sans-serif; color:#2563eb; margin:0 0 18px 0; font-size:24px; line-height:31px; font-weight:800;">Cadastro profissional recebido!</h2>
      <p style="margin:0 0 16px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#475569;">Olá, <strong>${safeName}</strong>. Seja bem-vindo à rede de profissionais do <strong>FisioCareHub</strong>.</p>
      <p style="margin:0 0 16px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#475569;">Seu cadastro profissional foi recebido com sucesso e agora está em análise pela nossa equipe.</p>
      <p style="margin:0 0 16px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#475569;">Seus documentos e informações serão revisados para garantir mais segurança aos pacientes e à plataforma.</p>
      <p style="margin:0 0 16px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#475569;">Assim que seu perfil for aprovado, você receberá uma confirmação por e-mail e poderá acessar os recursos profissionais do FisioCareHub, incluindo sua área de atendimentos, pacientes e ferramentas inteligentes.</p>
      <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#475569;">Obrigado por escolher fazer parte do <strong>FisioCareHub</strong>.</p>
    `
    : `
      <h2 style="font-family:Arial, Helvetica, sans-serif; color:#2563eb; margin:0 0 18px 0; font-size:24px; line-height:31px; font-weight:800;">Sua jornada de recuperação começa aqui!</h2>
      <p style="margin:0 0 16px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#475569;">Estamos felizes em acompanhar você no seu processo de reabilitação através do <strong>FisioCareHub</strong>.</p>
      <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#475569;">Acesse o app para visualizar seus exercícios e acompanhar sua evolução.</p>
    `;

  const html = generateEmailHTML({
    nome_do_usuario: name,
    mensagem_principal_da_notificacao: welcomeMessage
  });

  try {
    console.log(`[EmailService] [FLOW-AUDIT] Invoking Edge Function 'Send-email' for ${email}`);
    const result = await invokeFunction('Send-email', {
      to: email,
      subject: role === 'fisioterapeuta'
        ? `Cadastro profissional recebido - FisioCareHub`
        : `Bem-vindo ao FisioCareHub - ${name}`,
      html
    });

    console.log(`[EmailService] [FLOW-AUDIT] SUCCESS: Welcome email sent for ${email}`, result);
    return { success: true };
  } catch (error: any) {
    console.error(`[EmailService] [FLOW-AUDIT] FAILED to send welcome email to ${email}:`, error);
    return { success: false, error };
  }
};

/**
 * Sends an professional approval/rejection email
 */
export const sendProfessionalApprovalEmail = async (email: string, name: string, approved: boolean) => {
  console.log(`[EmailService] [FLOW-AUDIT] Preparing professional ${approved ? 'approval' : 'rejection'} email for ${email}`);

  if (!email) {
    console.warn(`[EmailService] [FLOW-AUDIT] ABORTED: No email for professional status update`);
    return { success: false, error: 'Email não fornecido' };
  }

  const message = approved
    ? `
      <h2 style="font-family:Arial, Helvetica, sans-serif; color:#10b981; margin:0 0 18px 0; font-size:24px; line-height:31px; font-weight:800;">Perfil Aprovado!</h2>
      <p style="margin:0 0 16px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#475569;">Parabéns, <strong>${escapeHtml(name)}</strong>! Seu perfil de fisioterapeuta foi revisado e aprovado com sucesso.</p>
      <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#475569;">Agora você já pode aceitar solicitações de pacientes e gerenciar seus atendimentos.</p>
    `
    : `
      <h2 style="font-family:Arial, Helvetica, sans-serif; color:#ef4444; margin:0 0 18px 0; font-size:24px; line-height:31px; font-weight:800;">Perfil não aprovado</h2>
      <p style="margin:0 0 16px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#475569;">Olá, <strong>${escapeHtml(name)}</strong>. Infelizmente seu perfil não pôde ser aprovado no momento.</p>
      <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#475569;">Por favor, entre em contato com nosso suporte para mais detalhes.</p>
    `;

  const html = generateEmailHTML({
    nome_do_usuario: name,
    mensagem_principal_da_notificacao: message
  });

  try {
    console.log(`[EmailService] [FLOW-AUDIT] Invoking Edge Function 'Send-email' for professional ${approved ? 'approval' : 'rejection'}`);
    await invokeFunction('Send-email', {
      to: email,
      subject: approved ? 'Perfil Aprovado - FisioCareHub' : 'Atualização de Cadastro - FisioCareHub',
      html
    });
    console.log(`[EmailService] [FLOW-AUDIT] SUCCESS: Professional email sent to ${email}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[EmailService] [FLOW-AUDIT] FAILED to send professional status email:`, error);
    return { success: false, error };
  }
};

/**
 * Sends an appointment status email
 */
export const sendAppointmentStatusEmail = async (
  email: string | undefined,
  name: string,
  physioName: string,
  status: 'aprovado' | 'confirmado' | 'cancelado' | 'reagendado',
  details: {
    date: string;
    time: string;
    reason?: string;
    service?: string;
    [key: string]: any;
  }
) => {
  if (!email) return { success: false, error: 'Email não fornecido' };

  console.log(`[EmailService] [FLOW-AUDIT] Sending status update (${status}) to ${name} (${email})`);

  const statusMap: Record<string, string> = {
    aprovado: 'Confirmado',
    confirmado: 'Confirmado',
    cancelado: 'Cancelado',
    reagendado: 'Reagendado'
  };

  const message = `
    <h2 style="font-family:Arial, Helvetica, sans-serif; color:#2563eb; margin:0 0 18px 0; font-size:24px; line-height:31px; font-weight:800;">Atualização de Agendamento</h2>
    <p style="margin:0 0 16px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#475569;">Olá, <strong>${escapeHtml(name)}</strong>, o status do seu agendamento foi atualizado.</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f1f5f9; border-collapse:collapse; margin:20px 0;">
      <tr><td style="padding:18px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; color:#334155;">
        <p style="margin:0 0 8px 0;"><strong>Novo Status:</strong> <span style="font-weight:bold;">${statusMap[status] || status}</span></p>
        <p style="margin:0 0 8px 0;"><strong>Profissional:</strong> ${escapeHtml(physioName)}</p>
        <p style="margin:0 0 8px 0;"><strong>Data:</strong> ${escapeHtml(details.date)}</p>
        <p style="margin:0 0 8px 0;"><strong>Horário:</strong> ${escapeHtml(details.time)}</p>
        ${details.service ? `<p style="margin:0 0 8px 0;"><strong>Tipo:</strong> ${escapeHtml(details.service)}</p>` : ''}
        ${details.reason ? `<p style="margin:0;"><strong>Motivo:</strong> ${escapeHtml(details.reason)}</p>` : ''}
      </td></tr>
    </table>
  `;

  const html = generateEmailHTML({
    nome_do_usuario: name,
    mensagem_principal_da_notificacao: message
  });

  try {
    await invokeFunction('Send-email', {
      to: email,
      subject: `Agendamento ${statusMap[status] || 'Atualizado'} - FisioCareHub`,
      html
    });
    console.log(`[EmailService] [FLOW-AUDIT] SUCCESS: Status email sent to ${email}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[EmailService] [FLOW-AUDIT] FAILED:`, error);
    return { success: false, error };
  }
};

/**
 * Sends an appointment confirmation email
 */
export const sendAppointmentConfirmation = async (
  patientEmail: string | undefined,
  physioEmail: string | undefined,
  details: {
    appointmentId: string;
    patientName: string;
    patientEmail: string;
    physioName: string;
    date: string;
    time: string;
    service: string;
    notes?: string;
    patientPhone?: string;
    [key: string]: any;
  }
) => {
  console.log(`[EmailService] [FLOW-AUDIT] Preparing appointment confirmation for ${details.patientName} (${patientEmail})`);

  if (!patientEmail) {
    console.warn(`[EmailService] [FLOW-AUDIT] ABORTED: Patient email missing`);
    return { success: false, error: 'Email do paciente não fornecido' };
  }

  const message = `
    <h2 style="font-family:Arial, Helvetica, sans-serif; color:#2563eb; margin:0 0 18px 0; font-size:24px; line-height:31px; font-weight:800;">Novo Agendamento Confirmado</h2>
    <p style="margin:0 0 16px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#475569;">Olá, <strong>${escapeHtml(details.patientName)}</strong>, sua sessão de fisioterapia foi agendada com sucesso.</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f1f5f9; border-collapse:collapse; margin:20px 0;">
      <tr><td style="padding:18px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; color:#334155;">
        <p style="margin:0 0 8px 0;"><strong>Profissional:</strong> ${escapeHtml(details.physioName)}</p>
        <p style="margin:0 0 8px 0;"><strong>Data:</strong> ${escapeHtml(details.date)}</p>
        <p style="margin:0 0 8px 0;"><strong>Horário:</strong> ${escapeHtml(details.time)}</p>
        <p style="margin:0;"><strong>Tipo:</strong> ${escapeHtml(details.service)}</p>
      </td></tr>
    </table>
  `;

  const html = generateEmailHTML({
    nome_do_usuario: details.patientName,
    mensagem_principal_da_notificacao: message
  });

  try {
    await invokeFunction('Send-email', {
      to: patientEmail,
      subject: 'Agendamento Confirmado - FisioCareHub',
      html
    });

    if (physioEmail) {
      await invokeFunction('Send-email', {
        to: physioEmail,
        subject: 'Novo Agendamento Recebido - FisioCareHub',
        html: generateEmailHTML({
          nome_do_usuario: details.physioName,
          mensagem_principal_da_notificacao: `<p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#475569;">Novo agendamento com ${escapeHtml(details.patientName)} em ${escapeHtml(details.date)} às ${escapeHtml(details.time)}.</p>`
        })
      });
    }

    console.log(`[EmailService] [FLOW-AUDIT] SUCCESS: Appointment emails sent.`);
    return { success: true };
  } catch (error: any) {
    console.error(`[EmailService] [FLOW-AUDIT] FAILED:`, error);
    return { success: false, error };
  }
};

/**
 * Sends an email to the physiotherapist when a patient submits an evaluation.
 */
export const sendEvaluationReceivedEmail = async (
  email: string | undefined,
  name: string,
  details: {
    patientName: string;
    ratingPhysio: number;
    ratingPlatform: number;
    comment?: string | null;
    appointmentDate?: string | null;
    appointmentTime?: string | null;
  }
) => {
  if (!email) return { success: false, error: 'Email do fisioterapeuta não fornecido' };

  const stars = '★'.repeat(Math.max(1, Math.min(5, Number(details.ratingPhysio || 0)))) +
    '☆'.repeat(Math.max(0, 5 - Math.max(1, Math.min(5, Number(details.ratingPhysio || 0)))));

  const appointmentInfo = details.appointmentDate || details.appointmentTime
    ? `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f1f5f9; border-collapse:collapse; margin:20px 0;">
        <tr><td style="padding:18px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; color:#334155;">
          ${details.appointmentDate ? `<p style="margin:0 0 8px 0;"><strong>Data:</strong> ${escapeHtml(details.appointmentDate)}</p>` : ''}
          ${details.appointmentTime ? `<p style="margin:0;"><strong>Horário:</strong> ${escapeHtml(details.appointmentTime)}</p>` : ''}
        </td></tr>
      </table>
    `
    : '';

  const commentBlock = details.comment
    ? `<div style="background-color:#eff6ff; border-left:4px solid #2563eb; padding:16px; margin:20px 0; font-family:Arial, Helvetica, sans-serif; color:#334155; font-size:15px; line-height:24px;">
        “${escapeHtml(details.comment)}”
      </div>`
    : `<p style="margin:16px 0; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; color:#64748b;">O paciente não deixou comentário adicional.</p>`;

  const message = `
    <h2 style="font-family:Arial, Helvetica, sans-serif; color:#2563eb; margin:0 0 18px 0; font-size:24px; line-height:31px; font-weight:800;">Nova avaliação recebida</h2>
    <p style="margin:0 0 16px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#475569;">Olá, <strong>${escapeHtml(name)}</strong>. Você recebeu uma nova avaliação no <strong>FisioCareHub</strong>.</p>
    <p style="margin:0 0 12px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#475569;"><strong>Paciente:</strong> ${escapeHtml(details.patientName || 'Paciente')}</p>
    <p style="margin:0 0 12px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#475569;"><strong>Nota do profissional:</strong> <span style="color:#f59e0b; font-size:20px; letter-spacing:2px;">${stars}</span> (${Number(details.ratingPhysio || 0)}/5)</p>
    <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#475569;"><strong>Nota da plataforma:</strong> ${Number(details.ratingPlatform || 0)}/5</p>
    ${appointmentInfo}
    ${commentBlock}
    <p style="margin:20px 0 0 0; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; color:#475569;">Acesse o FisioCareHub para acompanhar sua reputação e seus atendimentos.</p>
  `;

  const html = generateEmailHTML({
    nome_do_usuario: name,
    mensagem_principal_da_notificacao: message
  });

  try {
    await invokeFunction('Send-email', {
      to: email,
      subject: `Nova avaliação recebida - FisioCareHub`,
      html
    });

    console.log(`[EmailService] [FLOW-AUDIT] SUCCESS: Evaluation email sent to ${email}`);
    return { success: true };
  } catch (error: any) {
    console.error('[EmailService] [FLOW-AUDIT] FAILED to send evaluation email:', error);
    return { success: false, error };
  }
};

