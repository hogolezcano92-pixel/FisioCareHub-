import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  console.log("[FUNCTION START] /api/admin/delete-user");

  // Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ 
      success: false, 
      error: 'Method Not Allowed. Use POST.' 
    });
  }

  try {
    const { userId, accessToken } = request.body;

    if (!userId || !accessToken) {
      return response.status(400).json({ error: "Missing user id or access token" });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://exciqetztunqgxbwwodo.supabase.co";
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseServiceRoleKey) {
      console.error("[CONFIG ERROR] SUPABASE_SERVICE_ROLE_KEY missing");
      return response.status(500).json({ error: "Server configuration error (Supabase Service Role Key missing)" });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (authError || !adminUser) {
      console.error("[AUTH ERROR]", authError);
      return response.status(401).json({ error: "Invalid session or unauthorized" });
    }

    // Role Validation Step
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('perfis')
      .select('tipo_usuario')
      .eq('id', adminUser.id)
      .single();

    const isAdmin = profile?.tipo_usuario === 'admin' || adminUser.email?.toLowerCase() === 'hogolezcano92@gmail.com';

    if (!isAdmin) {
      console.warn(`[FORBIDDEN] User ${adminUser.id} attempted DELETE action without admin privileges`);
      return response.status(403).json({ error: "Access denied. Admins only." });
    }

    console.log(`[Admin API] Deleting user ${userId} requested by ${adminUser.email}`);

    // 1. Delete from profiles (perfis) explicitly
    const { error: profileDeleteError } = await supabaseAdmin
      .from('perfis')
      .delete()
      .eq('id', userId);

    if (profileDeleteError) {
      console.warn("[Admin API] Profile delete warning (non-blocking):", profileDeleteError);
    }

    // 2. Delete from Auth
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error("[Admin API] Auth delete error:", authDeleteError);
      return response.status(500).json({ error: `Auth deletion failed: ${authDeleteError.message}` });
    }

    console.log(`[FUNCTION SUCCESS] User ${userId} deleted successfully.`);
    return response.status(200).json({ 
      success: true, 
      message: "Usuário excluído permanentemente com sucesso (Auth + Perfil)." 
    });

  } catch (error: any) {
    console.error("[UNCAUGHT ERROR] In function handler:", error);
    return response.status(500).json({ 
      success: false, 
      error: error.message || 'Fatal Execution Error' 
    });
  }
}
