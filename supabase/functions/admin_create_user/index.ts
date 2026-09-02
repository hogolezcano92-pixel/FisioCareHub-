import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AdminCreateUserBody = {
  tipo_usuario?: "paciente" | "fisioterapeuta";
  nome_completo?: string;
  email?: string;
  telefone?: string;
  temporary_password?: string;
  data_nascimento?: string;
  cidade?: string;
  estado?: string;
  observacoes_saude?: string;
  crefito?: string;
  especialidade?: string;
  plano?: "gratuito" | "basic" | "pro";
  status_aprovacao?: "pendente" | "aprovado";
};

const cleanText = (value: unknown) => String(value ?? "").trim();

const generateTemporaryPassword = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@$#";
  const bytes = new Uint8Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ success: false, error: "Método não permitido" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados");
    }

    const authorization = req.headers.get("Authorization") || "";
    const accessToken = authorization.replace("Bearer ", "").trim();

    if (!accessToken) {
      return new Response(JSON.stringify({ success: false, error: "Token administrativo ausente" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: requesterData, error: requesterError } = await supabaseAdmin.auth.getUser(accessToken);

    if (requesterError || !requesterData.user) {
      return new Response(JSON.stringify({ success: false, error: "Sessão administrativa inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requester = requesterData.user;
    const { data: requesterProfile, error: requesterProfileError } = await supabaseAdmin
      .from("perfis")
      .select("id, role, tipo_usuario, status_aprovacao, email")
      .eq("id", requester.id)
      .maybeSingle();

    if (requesterProfileError) throw requesterProfileError;

    const isAdmin =
      requester.app_metadata?.role === "admin" ||
      requester.user_metadata?.role === "admin" ||
      requesterProfile?.role === "admin" ||
      requesterProfile?.tipo_usuario === "admin";

    if (!isAdmin) {
      return new Response(JSON.stringify({ success: false, error: "Apenas administradores podem criar usuários" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as AdminCreateUserBody;
    const tipo_usuario = body.tipo_usuario;
    const nome_completo = cleanText(body.nome_completo);
    const email = cleanText(body.email).toLowerCase();
    const telefone = cleanText(body.telefone);
    const data_nascimento = cleanText(body.data_nascimento);
    const cidade = cleanText(body.cidade);
    const estado = cleanText(body.estado).toUpperCase().slice(0, 2);
    const observacoes_saude = cleanText(body.observacoes_saude);
    const crefito = cleanText(body.crefito);
    const especialidade = cleanText(body.especialidade);
    const requestedPlan = body.plano || (tipo_usuario === "fisioterapeuta" ? "basic" : "gratuito");
    const plano = requestedPlan === "gratuito" ? "free" : requestedPlan;
    const status_aprovacao = body.status_aprovacao || (tipo_usuario === "fisioterapeuta" ? "pendente" : "aprovado");
    const temporaryPassword = cleanText(body.temporary_password) || generateTemporaryPassword();

    if (tipo_usuario !== "paciente" && tipo_usuario !== "fisioterapeuta") {
      return new Response(JSON.stringify({ success: false, error: "Tipo de usuário inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!nome_completo || !email) {
      return new Response(JSON.stringify({ success: false, error: "Nome completo e e-mail são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (temporaryPassword.length < 8) {
      return new Response(JSON.stringify({ success: false, error: "A senha temporária precisa ter pelo menos 8 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        nome: nome_completo,
        nome_completo,
        tipo_usuario,
      },
      app_metadata: {
        role: tipo_usuario === "fisioterapeuta" ? "fisioterapeuta" : "user",
      },
    });

    if (createAuthError || !authData.user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: createAuthError?.message || "Não foi possível criar o usuário no Auth",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userId = authData.user.id;
    const now = new Date().toISOString();

    const profilePayload: Record<string, unknown> = {
      id: userId,
      email,
      nome_completo,
      telefone: telefone || null,
      tipo_usuario,
      role: tipo_usuario === "fisioterapeuta" ? "fisioterapeuta" : "user",
      plano,
      plan_type: plano,
      subscription_status: plano === "free" ? "free" : "ativo",
      is_pro: plano === "pro",
      status_aprovacao,
      cidade: cidade || null,
      estado: estado || null,
      data_nascimento: data_nascimento || null,
      observacoes_saude: tipo_usuario === "paciente" ? observacoes_saude || null : null,
      crefito: tipo_usuario === "fisioterapeuta" ? crefito || null : null,
      especialidade: tipo_usuario === "fisioterapeuta" ? especialidade || null : null,
      welcome_seen: false,
      created_at: now,
      updated_at: now,
    };

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("perfis")
      .upsert(profilePayload, { onConflict: "id" })
      .select("*")
      .single();

    if (profileError) {
      console.error("[admin-create-user] Erro ao criar perfil. Revertendo Auth:", profileError);
      await supabaseAdmin.auth.admin.deleteUser(userId);

      return new Response(
        JSON.stringify({ success: false, error: profileError.message || "Não foi possível criar o perfil público" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    await supabaseAdmin.from("historico_atividades").insert({
      usuario_id: requester.id,
      tipo_usuario: "admin",
      tipo_acao: "admin_create_user",
      descricao: `Administrador criou manualmente ${nome_completo} (${tipo_usuario}).`,
      referencia_id: userId,
      created_at: now,
    }).throwOnError();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Usuário criado com sucesso",
        userId,
        email,
        temporaryPassword,
        profile,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[admin-create-user] Erro final:", err);
    const message = err instanceof Error ? err.message : "Erro desconhecido";

    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
