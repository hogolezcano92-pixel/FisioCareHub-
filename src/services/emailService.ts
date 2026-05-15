/**
 * FisioCareHub - Transactional Email Service
 * Template compatível com Gmail, Outlook e clientes móveis.
 */

import { formatDateBR } from '../utils/date.ts';
import { invokeFunction } from '../lib/supabase.ts';

interface EmailParams {
  nome_do_usuario: string;
  mensagem_principal_da_notificacao: string;
  data_hora_formatada?: string;
}

const escapeHtml = (value: string) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export const generateEmailHTML = ({
  nome_do_usuario,
  mensagem_principal_da_notificacao,
  data_hora_formatada
}: EmailParams): string => {
  const ano = new Date().getFullYear();
  const dataExtenso = data_hora_formatada || formatDateBR(new Date());
  const safeName = escapeHtml(nome_do_usuario);

  return `
<!doctype html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Notificação FisioCareHub</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a, h1, h2 { font-family: Arial, sans-serif !important; }
    table { border-collapse: collapse !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0; padding:0; width:100% !important; min-width:100%; background-color:#f8fafc; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
  <center style="width:100%; background-color:#f8fafc;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%; margin:0; padding:0; background-color:#f8fafc; border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <!--[if mso]>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600"><tr><td>
          <![endif]-->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%; max-width:600px; background-color:#ffffff; border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; border:1px solid #e5e7eb;">
            <tr>
              <td align="center" style="padding:34px 22px 28px 22px; border-bottom:1px solid #f1f5f9; text-align:center;">
                <h1 style="margin:0; padding:0; font-family:Arial, Helvetica, sans-serif; font-size:30px; line-height:36px; font-weight:800; color:#2563eb; word-break:break-word;">FisioCareHub</h1>
                <p style="margin:10px 0 0 0; padding:0; font-family:Arial, Helvetica, sans-serif; color:#475569; font-size:14px; line-height:22px;">Plataforma de Gestão em Fisioterapia</p>
              </td>
            </tr>

            <tr>
              <td style="padding:34px 22px; font-family:Arial, Helvetica, sans-serif; color:#334155; font-size:16px; line-height:26px; word-break:break-word; overflow-wrap:break-word;">
                <p style="font-family:Arial, Helvetica, sans-serif; font-size:18px; line-height:26px; margin:0 0 22px 0; color:#1e293b;">Olá, <strong>${safeName}</strong></p>
                <div style="font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#475569; word-break:break-word; overflow-wrap:break-word;">
                  ${mensagem_principal_da_notificacao}
                </div>
              </td>
            </tr>

            <tr>
              <td style="background-color:#1e293b; padding:32px 22px; text-align:center; font-family:Arial, Helvetica, sans-serif;">
                <p style="margin:0 0 10px 0; font-family:Arial, Helvetica, sans-serif; font-weight:bold; color:#ffffff; font-size:14px; line-height:21px;">Informações de Contato</p>
                <p style="margin:5px 0; font-family:Arial, Helvetica, sans-serif; color:#cbd5e1; font-size:14px; line-height:21px;">Suporte: <a href="mailto:suporte@fisiocarehub.company" style="color:#ffffff; text-decoration:none; font-weight:bold; word-break:break-word;">suporte@fisiocarehub.company</a></p>
                <p style="margin:5px 0; font-family:Arial, Helvetica, sans-serif; color:#cbd5e1; font-size:14px; line-height:21px;">Website: <a href="https://fisiocarehub.company" style="color:#ffffff; text-decoration:none; font-weight:bold; word-break:break-word;">fisiocarehub.company</a></p>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; margin:20px 0;"><tr><td style="border-top:1px solid #334155; font-size:0; line-height:0;">&nbsp;</td></tr></table>
                <p style="margin:10px 0; font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:18px; color:#94a3b8;">FisioCareHub © ${ano} - Todos os direitos reservados</p>
                <p style="margin:15px 0 0 0; font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:17px; color:#94a3b8;">Gerado em: ${dataExtenso}</p>
              </td>
            </tr>
          </table>
          <!--[if mso]>
          </td></tr></table>
          <![endif]-->
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
  `;
};

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
