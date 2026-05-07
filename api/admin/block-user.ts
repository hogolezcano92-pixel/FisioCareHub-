import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  console.log("[FUNCTION START] /api/admin/block-user");

  if (request.method !== 'POST') {
    return response.status(405).json({ success: false, error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const { userId, accessToken, block } = request.body;

    if (!userId || !accessToken) {
      return response.status(400).json({ error: "Missing required fields" });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://exciqetztunqgxbwwodo.supabase.co";
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseServiceRoleKey) {
      return response.status(500).json({ error: "Server configuration error" });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (authError || !adminUser) {
      return response.status(401).json({ error: "Invalid session" });
    }

    const { data: profile } = await supabaseAdmin
      .from('perfis')
      .select('tipo_usuario')
      .eq('id', adminUser.id)
      .single();

    const isAdmin = profile?.tipo_usuario === 'admin' || adminUser.email?.toLowerCase() === 'hogolezcano92@gmail.com';

    if (!isAdmin) {
      return response.status(403).json({ error: "Access denied." });
    }

    console.log(`[Admin API] ${block ? 'Blocking' : 'Unblocking'} user ${userId}`);

    // 1. Update Auth (Ban)
    const { error: authErrorUpdate } = await supabaseAdmin.auth.admin.updateUserById(
      userId, 
      { ban_duration: block ? '876600h' : 'none' }
    );

    if (authErrorUpdate) throw authErrorUpdate;

    // 2. Update profile status
    const { error: profileError } = await supabaseAdmin
      .from('perfis')
      .update({ status_aprovacao: block ? 'bloqueado' : 'aprovado' })
      .eq('id', userId);

    if (profileError) throw profileError;

    return response.status(200).json({ 
      success: true, 
      message: `Usuário ${block ? 'bloqueado' : 'desbloqueado'} com sucesso.` 
    });

  } catch (error: any) {
    console.error("[UNCAUGHT ERROR]", error);
    return response.status(500).json({ success: false, error: error.message });
  }
}
