import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

/**
 * INTERNAL TEMPLATE GENERATOR
 * We define this here to ensure the Vercel function is self-contained 
 * and doesn't fail due to module resolution issues in the serverless environment.
 */
const generateEmailHTMLInternal = ({
  nome_do_usuario,
  mensagem_principal_da_notificacao,
  data_hora_formatada
}: {
  nome_do_usuario: string;
  mensagem_principal_da_notificacao: string;
  data_hora_formatada?: string;
}): string => {
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
        body { margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f8fafc; padding-bottom: 40px; padding-top: 40px; }
        .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .header { padding: 40px 30px; text-align: center; border-bottom: 1px solid #f1f5f9; }
        .header h1 { color: #2563eb; margin: 0; font-size: 28px; font-weight: 800; }
        .content { padding: 40px 30px; line-height: 1.6; }
        .greeting { font-size: 18px; margin-bottom: 24px; color: #111827; }
        .message-box { font-size: 16px; color: #4b5563; }
        .system-info { margin-top: 40px; padding-top: 30px; border-top: 1px solid #f1f5f9; }
        .system-info p { margin: 5px 0; font-size: 14px; color: #64748b; }
        .footer { padding: 30px; text-align: center; font-size: 12px; color: #94a3b8; }
    </style>
</head>
<body>
    <div class="wrapper">
        <table class="main">
            <tr>
                <td class="header">
                    <h1>FisioCareHub</h1>
                </td>
            </tr>
            <tr>
                <td class="content">
                    <div class="greeting">Olá, <strong>${nome_do_usuario}</strong></div>
                    <div class="message-box">
                        ${mensagem_principal_da_notificacao}
                    </div>
                    
                    <div class="system-info">
                        <p><strong>FisioCareHub</strong> – Plataforma de Gestão em Fisioterapia</p>
                        <p>Suporte: suporte@fisiocarehub.com</p>
                        <p>Website: <a href="https://www.fisiocarehub.com" style="color: #2563eb;">www.fisiocarehub.com</a></p>
                        <div style="margin-top: 15px; font-size: 12px; color: #94a3b8; font-style: italic;">
                            Gerado em: ${dataExtenso}
                        </div>
                    </div>
                </td>
            </tr>
            <tr>
                <td class="footer">
                    <p>FisioCareHub &copy; ${ano} – Todos os direitos reservados</p>
                    <p>Esta é uma mensagem automática, por favor não responda.</p>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
`;
};

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  console.log("[FUNCTION START] /api/admin/test-template-email");

  // Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ 
      success: false, 
      error: 'Method Not Allowed. Use POST.' 
    });
  }

  try {
    // Auth Validation Step
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      console.warn("[AUTH FAILED] No authorization header");
      return response.status(401).json({ error: "Unauthorized" });
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
      console.warn("[AUTH FAILED] Malformed token");
      return response.status(401).json({ error: "Invalid token format" });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://exciqetztunqgxbwwodo.supabase.co";
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseServiceRoleKey) {
      console.error("[CONFIG ERROR] SUPABASE_SERVICE_ROLE_KEY missing");
      return response.status(500).json({ error: "Server configuration error (Supabase)" });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error("[AUTH ERROR]", authError);
      return response.status(401).json({ error: "Invalid session" });
    }

    // Role Validation Step
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('perfis')
      .select('tipo_usuario, email, nome_completo')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error("[DB ERROR] Profile fetch failed:", profileError);
      return response.status(404).json({ error: "Profile not found" });
    }

    if (profile.tipo_usuario !== 'admin') {
      console.warn(`[FORBIDDEN] User ${user.id} attempted admin action as ${profile.tipo_usuario}`);
      return response.status(403).json({ error: "Access denied. Admins only." });
    }

    // Resend Initialization
    console.log("[RESEND INIT] Preparing client");
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("[CONFIG ERROR] RESEND_API_KEY missing");
      return response.status(500).json({ error: "Resend API Key not configured" });
    }

    const resend = new Resend(resendApiKey);

    // Template Generation
    console.log("[TEMPLATE GEN] Creating HTML");
    const testHtml = generateEmailHTMLInternal({
      nome_do_usuario: profile.nome_completo || "Usuário Teste",
      mensagem_principal_da_notificacao: "Este é um teste do template real de e-mails do FisioCareHub. Verifique layout, espaçamento e compatibilidade com Gmail/Outlook."
    });

    // Send Email
    console.log(`[EMAIL SENDING] Attempting to send to ${profile.email}`);
    
    // We strictly follow the required format: "Name <email@domain>"
    // Fallback priority: 1. ENV, 2. Official Domain, 3. Onboarding (Automatic)
    const primaryFrom = process.env.RESEND_FROM || 'FisioCareHub <no-reply@fisiocarehub.company>';
    const fallbackFrom = 'FisioCareHub <onboarding@resend.dev>';

    let sendResult;
    try {
      console.log(`[RESEND] Attempt 1 with: ${primaryFrom}`);
      sendResult = await resend.emails.send({
        from: primaryFrom,
        to: [profile.email],
        subject: 'Teste de Template - FisioCareHub',
        html: testHtml,
      });

      // Handle specific "from" or "domain" errors from Resend to trigger fallback
      if (sendResult.error) {
        const errMsg = sendResult.error.message.toLowerCase();
        const isDomainError = errMsg.includes('domain') || errMsg.includes('verified') || errMsg.includes('from') || errMsg.includes('identity');
        
        if (isDomainError) {
          console.warn(`[RESEND FALLBACK] Primary sender failed: ${sendResult.error.message}. Trying onboarding@resend.dev...`);
          sendResult = await resend.emails.send({
            from: fallbackFrom,
            to: [profile.email],
            subject: 'Teste de Template - FisioCareHub (Fallback)',
            html: testHtml,
          });
        }
      }
    } catch (error: any) {
      console.error("[RESEND CRITICAL] Exception during send:", error);
      // If it throws, we can also try fallback here if appropriate
      throw error;
    }

    const { data, error: resendError } = sendResult;

    if (resendError) {
      console.error("[RESEND ERROR]", resendError);
      return response.status(500).json({ 
        success: false,
        error: resendError.message,
        details: resendError
      });
    }

    console.log(`[FUNCTION SUCCESS] Email sent. ID: ${data?.id}`);
    return response.status(200).json({ 
      success: true, 
      message: "E-mail de teste enviado com sucesso!",
      messageId: data?.id,
      senderUsed: sendResult.data ? (sendResult.data as any).sender || 'unknown' : 'unknown'
    });

  } catch (error: any) {
    console.error("[UNCAUGHT ERROR] In function handler:", error);
    return response.status(500).json({ 
      success: false, 
      error: error.message || 'Fatal Execution Error' 
    });
  }
}
