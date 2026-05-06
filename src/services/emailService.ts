
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
