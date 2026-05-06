
/**
 * FisioCareHub - Transactional Email Service
 * Reusable HTML template for system notifications.
 */

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
  const dataExtenso = data_hora_formatada || new Date().toLocaleString('pt-BR');

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
                <!-- Main Card -->
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 40px 30px; border-bottom: 1px solid #F1F5F9;">
                            <h1 style="margin: 0; font-size: 32px; font-weight: 800; color: #2563EB;">FisioCareHub</h1>
                            <p style="margin: 10px 0 0 0; color: #475569; font-size: 14px;">Plataforma de Gestão em Fisioterapia</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px; color: #334155; line-height: 1.6;">
                            <p style="font-size: 18px; margin: 0 0 24px 0; color: #1E293B;">Olá, <strong>${nome_do_usuario}</strong></p>
                            
                            <div style="font-size: 16px; color: #475569;">
                                ${mensagem_principal_da_notificacao}
                            </div>
                        </td>
                    </tr>

                    <!-- Footer / Branding Block -->
                    <tr>
                        <td style="background-color: #1E293B; padding: 40px 30px; text-align: center;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="color: #CBD5E1; font-size: 14px; line-height: 1.5;">
                                        <p style="margin: 0 0 10px 0; font-weight: bold; color: #FFFFFF;">Informações de Contato</p>
                                        <p style="margin: 5px 0;">Suporte: <a href="mailto:suporte@fisiocarehub.company" style="color: #FFFFFF; text-decoration: none; font-weight: bold;">suporte@fisiocarehub.company</a></p>
                                        <p style="margin: 5px 0;">Website: <a href="https://fisiocarehub.company" style="color: #FFFFFF; text-decoration: none; font-weight: bold;">fisiocarehub.company</a></p>
                                        <p style="margin: 5px 0; color: #FFFFFF; font-weight: bold;">São Paulo - Brasil | Latin America</p>
                                        
                                        <div style="margin: 20px 0; border-top: 1px solid #334155;"></div>
                                        
                                        <p style="margin: 10px 0; font-size: 12px; color: #94A3B8;">FisioCareHub © ${ano} - Todos os direitos reservados</p>
                                        <p style="margin: 10px 0; font-size: 12px; color: #94A3B8; font-style: italic;">Esta é uma mensagem automática, por favor não responda.</p>
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
  console.log(`[EmailService] Preparing welcome email for ${name} (${email}) as ${role}`);
  
  const welcomeMessage = role === 'fisioterapeuta' 
    ? `
      <h2 style="color: #2563eb; margin-top: 0;">Bem-vindo à nossa rede de especialistas!</h2>
      <p>Estamos muito felizes em ter você como parceiro no <strong>FisioCareHub</strong>.</p>
      <p>Sua conta está sendo processada. Em breve você poderá:</p>
      <ul style="padding-left: 20px;">
        <li>Gerenciar seus pacientes domiciliares</li>
        <li>Organizar sua agenda de atendimentos</li>
        <li>Utilizar nossa IA para auxiliar em seus prontuários</li>
      </ul>
      <p>Seus documentos já foram enviados para nossa equipe de auditoria e você receberá uma confirmação assim que seu perfil for aprovado.</p>
    `
    : `
      <h2 style="color: #2563eb; margin-top: 0;">Sua jornada de recuperação começa aqui!</h2>
      <p>Estamos felizes em acompanhar você no seu processo de reabilitação através do <strong>FisioCareHub</strong>.</p>
      <p>Agora você já pode:</p>
      <ul style="padding-left: 20px;">
        <li>Visualizar seus exercícios prescritos</li>
        <li>Acompanhar sua evolução</li>
        <li>Manter contato direto com seu fisioterapeuta</li>
      </ul>
      <p>Acesse o app para começar seus primeiros passos.</p>
    `;

  const html = generateEmailHTML({
    nome_do_usuario: name,
    mensagem_principal_da_notificacao: welcomeMessage
  });

  try {
    // In a production environment, you would call an Edge Function or Email API here.
    // Example: await supabase.functions.invoke('send-email', { body: { to: email, subject: 'Bem-vindo ao FisioCareHub', html } });
    
    console.log(`[EmailService] Welcome email generated for ${email}. (Ready for production integration)`);
    return { success: true };
  } catch (error) {
    console.error('[EmailService] Error sending welcome email:', error);
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
  console.log(`[EmailService] Preparing appointment confirmation for ${details.patientName}`);

  const message = `
    <h2 style="color: #2563eb; margin-top: 0;">Novo Agendamento Confirmado</h2>
    <p>Olá, <strong>${details.patientName}</strong>, sua sessão de fisioterapia foi agendada com sucesso.</p>
    
    <div style="background-color: #f1f5f9; padding: 20px; border-radius: 12px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Profissional:</strong> ${details.physioName}</p>
      <p style="margin: 5px 0;"><strong>Data:</strong> ${details.date}</p>
      <p style="margin: 5px 0;"><strong>Horário:</strong> ${details.time}</p>
      <p style="margin: 5px 0;"><strong>Tipo:</strong> ${details.service}</p>
      ${details.notes ? `<p style="margin: 5px 0;"><strong>Observações:</strong> ${details.notes}</p>` : ''}
    </div>

    <p>Caso precise desmarcar ou reagendar, por favor entre em contato com pelo menos 24 horas de antecedência.</p>
  `;

  const html = generateEmailHTML({
    nome_do_usuario: details.patientName,
    mensagem_principal_da_notificacao: message
  });

  try {
    // Logic for sending email would go here
    console.log(`[EmailService] Appointment confirmation generated for ${patientEmail}. (ID: ${details.appointmentId})`);
    return { success: true };
  } catch (error) {
    console.error('[EmailService] Error sending appointment confirmation:', error);
    return { success: false, error };
  }
};

/**
 * Sends a notification email about appointment status changes (approved, cancelled, etc)
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
  }
) => {
  if (!email) return { success: false, error: 'Email não fornecido' };
  
  console.log(`[EmailService] Sending status update (${status}) to ${name}`);

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
      <p style="margin: 5px 0;"><strong>Novo Status:</strong> <span style="color: ${status === 'cancelado' ? '#ef4444' : '#10b981'}; font-weight: bold;">${statusMap[status] || status}</span></p>
      <p style="margin: 5px 0;"><strong>Profissional:</strong> ${physioName}</p>
      <p style="margin: 5px 0;"><strong>Data:</strong> ${details.date}</p>
      <p style="margin: 5px 0;"><strong>Horário:</strong> ${details.time}</p>
      ${details.service ? `<p style="margin: 5px 0;"><strong>Serviço:</strong> ${details.service}</p>` : ''}
      ${details.reason ? `<p style="margin: 5px 0;"><strong>Motivo:</strong> ${details.reason}</p>` : ''}
    </div>

    ${status === 'cancelado' ? '<p>Para dúvidas, entre em contato com o suporte.</p>' : '<p>Esperamos por você!</p>'}
  `;

  const html = generateEmailHTML({
    nome_do_usuario: name,
    mensagem_principal_da_notificacao: message
  });

  try {
    console.log(`[EmailService] Status email (${status}) generated for ${email}.`);
    return { success: true };
  } catch (error) {
    console.error('[EmailService] Error sending status email:', error);
    return { success: false, error };
  }
};

/**
 * Example of how to use this service with a provider like Resend or Supabase Edge Functions:
 * 
 * export const sendNotification = async (userId: string, message: string) => {
 *   const { data: userProfile } = await supabase.from('profiles').select('nome_completo, email').eq('id', userId).single();
 *   
 *   const html = generateEmailHTML({
 *     nome_do_usuario: userProfile.nome_completo,
 *     mensagem_principal_da_notificacao: message
 *   });
 *   
 *   // Logic to call your SMTP/Email API provider here
 * };
 */
