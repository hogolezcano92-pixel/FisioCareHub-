import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const normalizeEmail = (email: unknown) => String(email || "").trim().toLowerCase();

const getBearerToken = (req: Request) => {
  const authHeader = req.headers.get("authorization") || "";
  return authHeader.replace("Bearer ", "").trim();
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ success: false, error: "Método não permitido." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || serviceRoleKey;
    const appUrl = (Deno.env.get("APP_URL") || "https://www.fisiocarehub.company").replace(/\/$/, "");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json({ success: false, error: "Variáveis do Supabase não configuradas." }, 500);
    }

    const token = getBearerToken(req);
    if (!token) {
      return json({ success: false, error: "Token de autorização não enviado." }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData?.user) {
      return json({ success: false, error: "Sessão inválida ou expirada." }, 401);
    }

    const requesterId = authData.user.id;
    const body = await req.json().catch(() => ({}));
    const patientId = body.patientId || body.paciente_id;

    if (!patientId) {
      return json({ success: false, error: "patientId não enviado." }, 400);
    }

    const { data: requesterProfile, error: requesterProfileError } = await adminClient
      .from("perfis")
      .select("id, role, tipo_usuario, nome_completo, email")
      .eq("id", requesterId)
      .maybeSingle();

    if (requesterProfileError) throw requesterProfileError;

    const isAdmin =
      requesterProfile?.role === "admin" ||
      requesterProfile?.role === "super_admin" ||
      requesterProfile?.tipo_usuario === "admin";

    const isPhysio = requesterProfile?.tipo_usuario === "fisioterapeuta";

    if (!isAdmin && !isPhysio) {
      return json({ success: false, error: "Apenas fisioterapeutas ou admins podem enviar convites." }, 403);
    }

    const { data: patient, error: patientError } = await adminClient
      .from("pacientes")
      .select("*")
      .eq("id", patientId)
      .maybeSingle();

    if (patientError) throw patientError;
    if (!patient) {
      return json({ success: false, error: "Paciente não encontrado." }, 404);
    }

    if (!isAdmin && String(patient.fisioterapeuta_id) !== String(requesterId)) {
      return json({ success: false, error: "Este paciente não pertence ao fisioterapeuta logado." }, 403);
    }

    const email = normalizeEmail(patient.email);
    if (!email) {
      return json({ success: false, error: "O paciente precisa ter um e-mail cadastrado para receber o convite." }, 400);
    }

    const patientName =
      patient.nome_completo ||
      patient.nome ||
      patient.name ||
      "Paciente FisioCareHub";

    const now = new Date().toISOString();

    // Se já existe perfil com este e-mail, não faz sentido enviar convite.
    // Apenas vincula o prontuário clínico à conta existente.
    const { data: existingProfile, error: existingProfileError } = await adminClient
      .from("perfis")
      .select("id, email, nome_completo, tipo_usuario, role")
      .eq("email", email)
      .maybeSingle();

    if (existingProfileError) throw existingProfileError;

    if (existingProfile?.id) {
      const { error: updatePatientError } = await adminClient
        .from("pacientes")
        .update({
          perfil_id: existingProfile.id,
          acesso_status: "ativo",
          acesso_liberado_em: now,
          ultimo_convite_em: now,
        })
        .eq("id", patientId);

      if (updatePatientError) throw updatePatientError;

      return json({
        success: true,
        status: "linked_existing_account",
        message: "Paciente já possui conta ativa. Prontuário vinculado ao perfil existente.",
        patientId,
        profileId: existingProfile.id,
        email,
      });
    }

    // Cria usuário no Auth e envia convite oficial do Supabase.
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${appUrl}/login?convite_paciente=1`,
      data: {
        nome: patientName,
        nome_completo: patientName,
        tipo_usuario: "paciente",
        role: "paciente",
        invited_by: requesterId,
        fisioterapeuta_id: patient.fisioterapeuta_id,
        paciente_clinico_id: patientId,
      },
    });

    if (inviteError) {
      console.error("[invite-patient-access] Erro ao convidar usuário:", inviteError);
      return json({ success: false, error: inviteError.message }, 500);
    }

    const invitedUserId = inviteData?.user?.id;
    if (!invitedUserId) {
      return json({ success: false, error: "Convite criado, mas o ID do usuário não foi retornado." }, 500);
    }

    const { error: profileError } = await adminClient
      .from("perfis")
      .upsert(
        {
          id: invitedUserId,
          nome_completo: patientName,
          email,
          telefone: patient.telefone || null,
          tipo_usuario: "paciente",
          role: "paciente",
          plano: "gratuito",
          status_aprovacao: "aprovado",
          data_nascimento: patient.data_nascimento || null,
          observacoes_saude: patient.observacoes || null,
          welcome_seen: false,
          plan_intro_seen: false,
          created_at: now,
          updated_at: now,
        },
        { onConflict: "id" },
      );

    if (profileError) {
      console.error("[invite-patient-access] Erro ao criar perfil:", profileError);
      return json({ success: false, error: profileError.message }, 500);
    }

    const { error: updatePatientError } = await adminClient
      .from("pacientes")
      .update({
        perfil_id: invitedUserId,
        acesso_status: "convite_enviado",
        convite_enviado_em: now,
        ultimo_convite_em: now,
      })
      .eq("id", patientId);

    if (updatePatientError) throw updatePatientError;

    return json({
      success: true,
      status: "invite_sent",
      message: "Convite de acesso enviado com sucesso.",
      patientId,
      profileId: invitedUserId,
      email,
    });
  } catch (error) {
    console.error("[invite-patient-access] ERRO FINAL:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido.";
    return json({ success: false, error: message }, 500);
  }
});
