import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Re-implementing the template generation here to avoid complex imports if needed, 
// but we can try to import it since we are in a monorepo-like structure.
// However, Vercel functions sometimes have issues with relative imports to src/ if not configured.
// Let's try to import generateEmailHTML.
import { generateEmailHTML } from '../../src/services/emailService';

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://exciqetztunqgxbwwodo.supabase.co";
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ 
      success: false, 
      error: 'Method Not Allowed. Use POST.' 
    });
  }

  try {
    const authHeader = request.headers.authorization;
    if (!authHeader) return response.status(401).json({ error: "Unauthorized" });
    
    const token = authHeader.split(' ')[1];
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) return response.status(401).json({ error: "Invalid session" });

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('perfis')
      .select('tipo_usuario, email, nome_completo')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return response.status(404).json({ error: "Profile not found" });
    }

    if (profile.tipo_usuario !== 'admin') {
      return response.status(403).json({ error: "Access denied. Admins only." });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) return response.status(500).json({ error: "Resend API Key not configured" });

    const resend = new Resend(resendApiKey);

    const testHtml = generateEmailHTML({
      nome_do_usuario: profile.nome_completo || "Usuário Teste",
      mensagem_principal_da_notificacao: "Este é um teste do template real de e-mails do FisioCareHub. Verifique layout, espaçamento e compatibilidade com Gmail/Outlook."
    });

    const { data, error: resendError } = await resend.emails.send({
      from: process.env.RESEND_FROM || 'FisioCareHub <onboarding@resend.dev>',
      to: [profile.email],
      subject: 'Teste de Template - FisioCareHub',
      html: testHtml,
    });

    if (resendError) {
      console.error("[Resend] Error sending test email:", resendError);
      return response.status(500).json({ error: resendError.message });
    }

    console.log(`[Resend Test] Email sent to ${profile.email}`);
    return response.status(200).json({ success: true, messageId: data?.id });
  } catch (error: any) {
    console.error("[Resend Test API] Uncaught error:", error);
    return response.status(500).json({ 
      success: false, 
      error: error.message || 'Internal Server Error' 
    });
  }
}
