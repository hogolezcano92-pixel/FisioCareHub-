
/**
 * FisioCareHub - Transactional Email Service
 */

import { formatDateBR } from '../utils/date.ts';
import { invokeFunction } from '../lib/supabase.ts';

interface EmailParams {
  nome_do_usuario: string;
  mensagem_principal_da_notificacao: string;
  data_hora_formatada?: string;
}

export const generateEmailHTML = ({
  nome_do_usuario,
  mensagem_principal_da_notificacao,
  data_hora_formatada
}: EmailParams): string => {
  const ano = new Date().getFullYear();
  const dataExtenso = data_hora_formatada || formatDateBR(new Date());

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="pt-BR">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Notificação FisioCareHub</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #F8FAFC;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td align="center" style="padding: 40px 30px; border-bottom: 1px solid #F1F5F9;">
                            <h1 style="margin: 0; font-size: 32px; font-weight: 800; color: #2563EB;">FisioCareHub</h1>
                            <p style="margin: 10px 0 0 0; color: #475569; font-size: 14px;">Plataforma de Gestão em Fisioterapia</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 40px 30px; color: #334155; line-height: 1.6;">
                            <p style="font-size: 18px; margin: 0 0 24px 0; color: #1E293B;">Olá, <strong>${nome_do_usuario}</strong></p>
                            <div style="font-size: 16px; color: #475569;">
                                ${mensagem_principal_da_notificacao}
                            </div>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color: #1E293B; padding: 40px 30px; text-align: center;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="color: #CBD5E1; font-size: 14px; line-height: 1.5;">
                                        <p style="margin: 0 0 10px 0; font-weight: bold; color: #FFFFFF;">Informações de Contato</p>
                                        <p style="margin: 5px 0;">Suporte: <a href="mailto:suporte@fisiocarehub.company" style="color: #FFFFFF; text-decoration: none; font-weight: bold;">suporte@fisiocarehub.company</a></p>
                                        <p style="margin: 5px 0;">Website: <a href="https://fisiocarehub.company" style="color: #FFFFFF; text-decoration: none; font-weight: bold;">fisiocarehub.company</a></p>
                                        <div style="margin: 20px 0; border-top: 1px solid #334155;"></div>
                                        <p style="margin: 10px 0; font-size: 12px; color: #94A3B8;">FisioCareHub © ${ano} - Todos os direitos reservados</p>
                                        <p style="margin: 15px 0 0 0; font-size: 11px; color: #64748B;">Gerado em: ${dataExtenso}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
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

  const welcomeMessage = role === 'fisioterapeuta' 
    ? `
      <h2 style="color: #2563eb; margin-top: 0;">Bem-vindo à nossa rede de especialistas!</h2>
      <p>Estamos muito felizes em ter você como parceiro no <strong>FisioCareHub</strong>.</p>
      <p>Sua conta está sendo processada. Em breve você poderá gerenciar seus pacientes e utilizar nossa IA.</p>
      <p>Seus documentos já foram enviados para auditoria e você receberá uma confirmação assim que seu perfil for aprovado.</p>
    `
    : `
      <h2 style="color: #2563eb; margin-top: 0;">Sua jornada de recuperação começa aqui!</h2>
      <p>Estamos felizes em acompanhar você no seu processo de reabilitação através do <strong>FisioCareHub</strong>.</p>
      <p>Acesse o app para visualizar seus exercícios e acompanhar sua evolução.</p>
    `;

  const html = generateEmailHTML({
    nome_do_usuario: name,
    mensagem_principal_da_notificacao: welcomeMessage
  });

  try {
    console.log(`[EmailService] [FLOW-AUDIT] Invoking Edge Function 'Send-email' for ${email}`);
    // Using PascalCase for function name to match server.ts invocation
    const result = await invokeFunction('Send-email', {
      to: email,
      subject: `Bem-vindo ao FisioCareHub - ${name}`,
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
      <h2 style="color: #10b981; margin-top: 0;">Perfil Aprovado!</h2>
      <p>Parabéns, <strong>${name}</strong>! Seu perfil de fisioterapeuta foi revisado e aprovado com sucesso.</p>
      <p>Agora você já pode aceitar solicitações de pacientes e gerenciar seus atendimentos.</p>
    `
    : `
      <h2 style="color: #ef4444; margin-top: 0;">Perfil não aprovado</h2>
      <p>Olá, <strong>${name}</strong>. Infelizmente seu perfil não pôde ser aprovado no momento.</p>
      <p>Por favor, entre em contato com nosso suporte para mais detalhes.</p>
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
    <h2 style="color: #2563eb; margin-top: 0;">Atualização de Agendamento</h2>
    <p>Olá, <strong>${name}</strong>, o status do seu agendamento foi atualizado.</p>
    <div style="background-color: #f1f5f9; padding: 20px; border-radius: 12px; margin: 20px 0;">
      <p><strong>Novo Status:</strong> <span style="font-weight: bold;">${statusMap[status] || status}</span></p>
      <p><strong>Profissional:</strong> ${physioName}</p>
      <p><strong>Data:</strong> ${details.date}</p>
      <p><strong>Horário:</strong> ${details.time}</p>
      ${details.service ? `<p><strong>Tipo:</strong> ${details.service}</p>` : ''}
      ${details.reason ? `<p><strong>Motivo:</strong> ${details.reason}</p>` : ''}
    </div>
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
    <h2 style="color: #2563eb; margin-top: 0;">Novo Agendamento Confirmado</h2>
    <p>Olá, <strong>${details.patientName}</strong>, sua sessão de fisioterapia foi agendada com sucesso.</p>
    <div style="background-color: #f1f5f9; padding: 20px; border-radius: 12px; margin: 20px 0;">
      <p><strong>Profissional:</strong> ${details.physioName}</p>
      <p><strong>Data:</strong> ${details.date}</p>
      <p><strong>Horário:</strong> ${details.time}</p>
      <p><strong>Tipo:</strong> ${details.service}</p>
    </div>
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
          mensagem_principal_da_notificacao: `<p>Novo agendamento com ${details.patientName} em ${details.date} às ${details.time}.</p>`
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
