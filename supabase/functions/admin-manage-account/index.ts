import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AdminAction =
  | "list_accounts"
  | "set_account_status"
  | "set_plan_override"
  | "clear_plan_override";

type RequestBody = {
  action?: AdminAction;
  userId?: string;
  status?: "aprovado" | "suspenso" | "bloqueado";
  plan?: "free" | "basic" | "pro";
  expiresAt?: string | null;
  reason?: string | null;
};

const cleanText = (value: unknown) => String(value ?? "").trim();
const normalize = (value: unknown) => cleanText(value).toLowerCase();
const OWNER_EMAIL = "hogolezcano92@gmail.com";

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Método não permitido" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ success: false, error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados" }, 500);
    }

    const accessToken = cleanText(req.headers.get("Authorization")).replace(/^Bearer\s+/i, "");
    if (!accessToken) return json({ success: false, error: "Sessão administrativa ausente" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: requesterData, error: requesterError } = await admin.auth.getUser(accessToken);
    if (requesterError || !requesterData.user) {
      return json({ success: false, error: "Sessão administrativa inválida" }, 401);
    }

    const requester = requesterData.user;
    const requesterEmail = normalize(requester.email);

    const { data: requesterProfile } = await admin
      .from("perfis")
      .select("id,email,tipo_usuario,role,status_aprovacao")
      .eq("id", requester.id)
      .maybeSingle();

    const { data: collaborator } = requesterEmail
      ? await admin
          .from("admin_colaboradores")
          .select("id,email,status,permissoes")
          .ilike("email", requesterEmail)
          .maybeSingle()
      : { data: null } as any;

    const isOwner = requesterEmail === OWNER_EMAIL;
    const isProfileAdmin = requesterProfile?.tipo_usuario === "admin" || requesterProfile?.role === "admin";
    const collaboratorPermissions = Array.isArray(collaborator?.permissoes) ? collaborator.permissoes : [];
    const isActiveCollaborator = collaborator?.status === "ativo";

    const hasAnyPermission = (permissions: string[]) =>
      isOwner ||
      isProfileAdmin ||
      (isActiveCollaborator && permissions.some((permission) => collaboratorPermissions.includes(permission)));

    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const action = body.action;

    if (!action) return json({ success: false, error: "Ação administrativa não informada" }, 400);

    const canReadSubscriptions = hasAnyPermission(["subscriptions:read", "financial:read", "financial:manage"]);
    const canManageSubscriptions = hasAnyPermission(["subscriptions:manage", "financial:manage"]);
    // users:read é mantido como compatibilidade com os perfis operacionais já existentes.
    const canManageStatus = hasAnyPermission(["users:suspend", "users:manage", "users:read"]);

    const logHistory = async (type: string, description: string, referenceId?: string) => {
      const { error } = await admin.from("historico_atividades").insert({
        usuario_id: requester.id,
        tipo_usuario: "admin",
        tipo_acao: type,
        descricao: description,
        referencia_id: referenceId || null,
        created_at: new Date().toISOString(),
      });
      if (error) console.warn("[admin-manage-account] historico_atividades:", error.message);
    };

    const logAudit = async (
      tableName: string,
      recordId: string,
      auditAction: string,
      oldData: unknown,
      newData: unknown,
    ) => {
      const { error } = await admin.from("admin_audit_events").insert({
        table_name: tableName,
        record_id: recordId,
        action: auditAction,
        actor_id: requester.id,
        old_data: oldData,
        new_data: newData,
        created_at: new Date().toISOString(),
      });
      // A tabela é complementar. Se a migração ainda não tiver sido rodada,
      // a ação principal continua funcionando e o histórico legado permanece.
      if (error) console.warn("[admin-manage-account] admin_audit_events:", error.message);
    };

    if (action === "list_accounts") {
      if (!canReadSubscriptions) return json({ success: false, error: "Sem permissão para visualizar assinaturas" }, 403);

      const [{ data: profiles, error: profilesError }, { data: subscriptions, error: subscriptionsError }] = await Promise.all([
        admin
          .from("perfis")
          .select("id,email,nome_completo,tipo_usuario,role,plano,plan_type,is_pro,status_aprovacao,subscription_status,stripe_customer_id,stripe_subscription_id,trial_start,trial_end,next_billing_date,created_at,updated_at,admin_plan_override,admin_plan_override_until,admin_plan_override_reason,admin_plan_override_by,admin_plan_override_updated_at")
          .or("status_aprovacao.is.null,status_aprovacao.neq.excluido")
          .order("created_at", { ascending: false })
          .limit(1000),
        admin
          .from("assinaturas")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(3000),
      ]);

      if (profilesError) throw profilesError;
      if (subscriptionsError) {
        console.warn("[admin-manage-account] Não foi possível listar assinaturas:", subscriptionsError.message);
      }

      const latestByUser = new Map<string, any>();
      for (const row of subscriptions || []) {
        const userId = cleanText(row.user_id);
        if (userId && !latestByUser.has(userId)) latestByUser.set(userId, row);
      }

      const accounts = (profiles || []).map((profile: any) => ({
        ...profile,
        subscription: latestByUser.get(profile.id) || null,
      }));

      return json({ success: true, accounts });
    }

    const userId = cleanText(body.userId);
    if (!userId) return json({ success: false, error: "Usuário não informado" }, 400);
    if (userId === requester.id && action === "set_account_status" && body.status !== "aprovado") {
      return json({ success: false, error: "Você não pode suspender ou bloquear sua própria conta administrativa." }, 400);
    }

    const { data: target, error: targetError } = await admin
      .from("perfis")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (targetError) throw targetError;
    if (!target) return json({ success: false, error: "Usuário não encontrado" }, 404);

    const reason = cleanText(body.reason) || null;
    const now = new Date().toISOString();

    if (action === "set_account_status") {
      if (!canManageStatus) return json({ success: false, error: "Sem permissão para alterar o status desta conta" }, 403);

      const status = normalize(body.status);
      if (!["aprovado", "suspenso", "bloqueado"].includes(status)) {
        return json({ success: false, error: "Status de conta inválido" }, 400);
      }

      const { data: updated, error } = await admin
        .from("perfis")
        .update({ status_aprovacao: status, updated_at: now })
        .eq("id", userId)
        .select("*")
        .single();
      if (error) throw error;

      await logHistory(
        "admin_account_status",
        `Administrador alterou ${target.nome_completo || target.email || userId} de ${target.status_aprovacao || "sem status"} para ${status}${reason ? ` — Motivo: ${reason}` : ""}.`,
        userId,
      );
      await logAudit("perfis", userId, "ADMIN_STATUS_UPDATE", target, updated);

      return json({ success: true, profile: updated });
    }

    if (action === "set_plan_override") {
      if (!canManageSubscriptions) return json({ success: false, error: "Sem permissão para alterar planos" }, 403);

      const plan = normalize(body.plan);
      if (!["free", "basic", "pro"].includes(plan)) {
        return json({ success: false, error: "Plano inválido" }, 400);
      }

      let expiresAt: string | null = null;
      if (body.expiresAt) {
        const parsed = new Date(body.expiresAt);
        if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
          return json({ success: false, error: "A validade do acesso administrativo precisa estar no futuro" }, 400);
        }
        expiresAt = parsed.toISOString();
      }

      const payload = {
        admin_plan_override: plan,
        admin_plan_override_until: expiresAt,
        admin_plan_override_reason: reason,
        admin_plan_override_by: requester.id,
        admin_plan_override_updated_at: now,
        updated_at: now,
      };

      const { data: updated, error } = await admin
        .from("perfis")
        .update(payload)
        .eq("id", userId)
        .select("*")
        .single();
      if (error) throw error;

      await logHistory(
        "admin_plan_override",
        `Administrador definiu acesso ${plan.toUpperCase()} para ${target.nome_completo || target.email || userId}${expiresAt ? ` até ${expiresAt}` : " sem expiração"}${reason ? ` — Motivo: ${reason}` : ""}.`,
        userId,
      );
      await logAudit("perfis", userId, "ADMIN_PLAN_OVERRIDE", target, updated);

      return json({ success: true, profile: updated });
    }

    if (action === "clear_plan_override") {
      if (!canManageSubscriptions) return json({ success: false, error: "Sem permissão para alterar planos" }, 403);

      const { data: updated, error } = await admin
        .from("perfis")
        .update({
          admin_plan_override: null,
          admin_plan_override_until: null,
          admin_plan_override_reason: null,
          admin_plan_override_by: null,
          admin_plan_override_updated_at: now,
          updated_at: now,
        })
        .eq("id", userId)
        .select("*")
        .single();
      if (error) throw error;

      await logHistory(
        "admin_plan_override_clear",
        `Administrador removeu o override de plano de ${target.nome_completo || target.email || userId}. O acesso voltou a seguir a assinatura/perfil normal${reason ? ` — Motivo: ${reason}` : ""}.`,
        userId,
      );
      await logAudit("perfis", userId, "ADMIN_PLAN_OVERRIDE_CLEAR", target, updated);

      return json({ success: true, profile: updated });
    }

    return json({ success: false, error: "Ação administrativa desconhecida" }, 400);
  } catch (error) {
    console.error("[admin-manage-account] Erro:", error);
    return json({ success: false, error: error instanceof Error ? error.message : "Erro administrativo inesperado" }, 500);
  }
});
