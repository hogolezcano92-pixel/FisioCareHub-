
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
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notificação FisioCareHub</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            -webkit-font-smoothing: antialiased;
        }
        .wrapper {
            width: 100%;
            table-layout: fixed;
            background-color: #f8fafc;
            padding-bottom: 40px;
            padding-top: 40px;
        }
        .main {
            background-color: #ffffff;
            margin: 0 auto;
            width: 100%;
            max-width: 600px;
            border-spacing: 0;
            color: #374151;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .header {
            padding: 40px 30px;
            text-align: center;
            border-bottom: 1px solid #f1f5f9;
        }
        .header h1 {
            color: #2563eb;
            margin: 0;
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.025em;
        }
        .content {
            padding: 40px 30px;
            line-height: 1.6;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 24px;
            color: #111827;
        }
        .message-box {
            font-size: 16px;
            color: #4b5563;
        }
        .system-info {
            margin-top: 40px;
            padding-top: 30px;
            border-top: 1px solid #f1f5f9;
        }
        .system-info p {
            margin: 5px 0;
            font-size: 14px;
            color: #64748b;
        }
        .data-hora {
            margin-top: 15px;
            font-size: 12px;
            color: #94a3b8;
            font-style: italic;
        }
        .footer {
            padding: 30px;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
            line-height: 1.5;
        }
        .footer p {
            margin: 5px 0;
        }
        @media screen and (max-width: 600px) {
            .main {
                width: 95% !important;
            }
        }
    </style>
</head>
<body>
    <center class="wrapper">
        <table class="main" width="100%">
            <!-- Header -->
            <tr>
                <td class="header">
                    <h1>FisioCareHub</h1>
                </td>
            </tr>
            
            <!-- Content -->
            <tr>
                <td class="content">
                    <p class="greeting">Olá, <strong>${nome_do_usuario}</strong>.</p>
                    <p>Obrigado por usar o FisioCareHub.</p>
                    
                    <div class="message-box">
                        ${mensagem_principal_da_notificacao}
                    </div>

                    <!-- System Info Block -->
                    <div class="system-info">
                        <p><strong>FisioCareHub – Plataforma de Gestão em Fisioterapia</strong></p>
                        <p>Suporte: <a href="mailto:suporte@fisiocarehub.com" style="color: #2563eb; text-decoration: none;">suporte@fisiocarehub.com</a></p>
                        <p>Website: <a href="https://www.fisiocarehub.com" style="color: #2563eb; text-decoration: none;">www.fisiocarehub.com</a></p>
                        
                        <div class="data-hora">
                            Data da notificação: ${dataExtenso}
                        </div>
                    </div>
                </td>
            </tr>

            <!-- Footer -->
            <tr>
                <td class="footer">
                    <p>FisioCareHub © ${ano} – Todos os direitos reservados.</p>
                    <p>Esta é uma mensagem automática do sistema. Por favor, não responda este e-mail.</p>
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
