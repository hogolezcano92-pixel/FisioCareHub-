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
  | "clear_plan_override"
  | "get_commission_rate"
  | "set_commission_rate"
  | "update_appointment_status"
  | "reschedule_appointment"
  | "mark_withdrawal_paid"
  | "reject_withdrawal";

type RequestBody = {
  action?: AdminAction;
  userId?: string;
  status?: "aprovado" | "suspenso" | "bloqueado";
  plan?: "free" | "basic" | "pro";
  expiresAt?: string | null;
  reason?: string | null;
  commissionRate?: number | string | null;
  appointmentId?: string;
  appointmentStatus?: "confirmado" | "cancelado" | "aguardando_confirmacao_paciente" | "concluido";
  date?: string;
  time?: string;
  withdrawalId?: string;
  reference?: string | null;
  note?: string | null;
};

const cleanText = (value: unknown) => String(value ?? "").trim();
const normalize = (value: unknown) => cleanText(value).toLowerCase();
const OWNER_EMAIL = "hogolezcano92@gmail.com";

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isOptionalColumnError = (error: any) => {
  const code = cleanText(error?.code).toLowerCase();
  const message = `${cleanText(error?.message)} ${cleanText(error?.details)}`.toLowerCase();
  return code === "42703" || message.includes("column") || message.includes("schema cache");
};

const isValidDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime());
const isValidTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
const normalizeTime = (value: string) => value.length === 5 ? `${value}:00` : value;

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
          .select("id,email,status,permissoes,perfil_acesso")
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
      (isActiveCollaborator && (
        collaboratorPermissions.includes("*") ||
        permissions.some((permission) => collaboratorPermissions.includes(permission))
      ));

    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const action = body.action;

    if (!action) return json({ success: false, error: "Ação administrativa não informada" }, 400);

    const canReadSubscriptions = hasAnyPermission(["subscriptions:read", "financial:read", "financial:manage"]);
    const canManageSubscriptions = hasAnyPermission(["subscriptions:manage", "financial:manage"]);
    // users:read é mantido como compatibilidade com os perfis operacionais já existentes na Fase 1.
    const canManageStatus = hasAnyPermission(["users:suspend", "users:manage", "users:read"]);
    const canReadFinancial = hasAnyPermission(["financial:read", "financial:manage", "withdrawals:manage"]);
    const canManageFinancial = hasAnyPermission(["financial:manage"]);
    const canManageWithdrawals = hasAnyPermission(["withdrawals:manage", "financial:manage"]);
    const canManageAppointments = hasAnyPermission(["appointments:manage"]);

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
      if (error) console.warn("[admin-manage-account] admin_audit_events:", error.message);
    };

    const insertNotification = async (payload: Record<string, unknown>) => {
      const { error } = await admin.from("notificacoes").insert(payload);
      if (error) console.warn("[admin-manage-account] notificacoes:", error.message);
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
      if (subscriptionsError) console.warn("[admin-manage-account] Não foi possível listar assinaturas:", subscriptionsError.message);

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

    if (action === "get_commission_rate") {
      if (!canReadFinancial) return json({ success: false, error: "Sem permissão para visualizar configurações financeiras" }, 403);

      const { data, error } = await admin
        .from("system_settings")
        .select("value,updated_at")
        .eq("key", "commission_rate")
        .maybeSingle();

      if (error && !String(error.message || "").toLowerCase().includes("does not exist")) throw error;
      const parsed = Number(data?.value);
      const rate = Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : 12;
      return json({ success: true, commissionRate: rate, updatedAt: data?.updated_at || null });
    }

    if (action === "set_commission_rate") {
      if (!canManageFinancial) return json({ success: false, error: "Sem permissão para alterar a comissão da plataforma" }, 403);

      const rate = Number(body.commissionRate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        return json({ success: false, error: "A comissão deve estar entre 0% e 100%" }, 400);
      }

      const roundedRate = Math.round(rate * 100) / 100;
      const { data: previous } = await admin
        .from("system_settings")
        .select("key,value,updated_at")
        .eq("key", "commission_rate")
        .maybeSingle();

      const now = new Date().toISOString();
      const { data: updated, error } = await admin
        .from("system_settings")
        .upsert({ key: "commission_rate", value: String(roundedRate), updated_at: now }, { onConflict: "key" })
        .select("key,value,updated_at")
        .single();
      if (error) throw error;

      await logHistory(
        "admin_commission_rate_update",
        `Administrador alterou a comissão da plataforma de ${previous?.value ?? "12"}% para ${roundedRate}%.`,
        "commission_rate",
      );
      await logAudit("system_settings", "commission_rate", "ADMIN_COMMISSION_RATE_UPDATE", previous, updated);

      return json({ success: true, commissionRate: roundedRate, updatedAt: updated.updated_at });
    }

    if (action === "update_appointment_status") {
      if (!canManageAppointments) return json({ success: false, error: "Sem permissão para gerenciar agendamentos" }, 403);

      const appointmentId = cleanText(body.appointmentId);
      const nextStatus = normalize(body.appointmentStatus);
      if (!appointmentId) return json({ success: false, error: "Agendamento não informado" }, 400);
      if (!["confirmado", "cancelado", "aguardando_confirmacao_paciente", "concluido"].includes(nextStatus)) {
        return json({ success: false, error: "Status administrativo de agendamento inválido" }, 400);
      }

      const { data: appointment, error: appointmentError } = await admin
        .from("agendamentos")
        .select("*")
        .eq("id", appointmentId)
        .maybeSingle();
      if (appointmentError) throw appointmentError;
      if (!appointment) return json({ success: false, error: "Agendamento não encontrado" }, 404);

      const { data: sessions } = await admin
        .from("sessoes")
        .select("*")
        .eq("agendamento_id", appointmentId);

      const now = new Date().toISOString();
      const reason = cleanText(body.reason) || null;
      let appointmentPayload: Record<string, unknown> = { status: nextStatus, updated_at: now };
      let appointmentFallback: Record<string, unknown> = { status: nextStatus };
      let sessionPayload: Record<string, unknown> | null = null;
      let notificationTitle = "Agendamento atualizado";
      let notificationMessage = `O status do seu agendamento foi atualizado administrativamente para ${nextStatus}.`;

      if (nextStatus === "confirmado") {
        notificationTitle = "Agendamento confirmado";
        notificationMessage = "Seu agendamento foi confirmado administrativamente pelo FisioCareHub.";
      }

      if (nextStatus === "cancelado") {
        const alreadyPaidOut = (sessions || []).some((session: any) => normalize(session.status_repasse) === "repassado_fisio");
        if (alreadyPaidOut) {
          return json({ success: false, error: "Este atendimento já possui repasse efetuado. O cancelamento exige tratamento financeiro específico." }, 409);
        }
        appointmentPayload = { status: "cancelado", updated_at: now };
        appointmentFallback = { status: "cancelado" };
        sessionPayload = { status_atendimento: "cancelado", status_repasse: "bloqueado" };
        notificationTitle = "Agendamento cancelado";
        notificationMessage = `Seu agendamento foi cancelado administrativamente${reason ? `: ${reason}` : "."}`;
      }

      if (nextStatus === "aguardando_confirmacao_paciente") {
        appointmentPayload = {
          status: nextStatus,
          fisioterapeuta_marcou_realizado_em: now,
          updated_at: now,
        };
        appointmentFallback = { status: nextStatus };
        sessionPayload = {
          status_atendimento: nextStatus,
          marcado_realizado_em: now,
          status_repasse: "pendente",
        };
        notificationTitle = "Confirme sua sessão";
        notificationMessage = "A sessão foi marcada administrativamente como realizada. Confirme a realização para liberar o repasse ou conteste se houver divergência.";
      }

      if (nextStatus === "concluido") {
        appointmentPayload = {
          status: "concluido",
          concluido_em: now,
          repasse_liberado_em: now,
          updated_at: now,
        };
        appointmentFallback = { status: "concluido" };
        sessionPayload = {
          status_atendimento: "concluido",
          status_repasse: "liberado",
        };
        notificationTitle = "Sessão concluída administrativamente";
        notificationMessage = "O FisioCareHub confirmou administrativamente a realização da sessão e liberou o repasse correspondente.";
      }

      let { data: updatedAppointment, error: updateError } = await admin
        .from("agendamentos")
        .update(appointmentPayload)
        .eq("id", appointmentId)
        .select("*")
        .single();

      if (updateError && isOptionalColumnError(updateError)) {
        const fallback = await admin
          .from("agendamentos")
          .update(appointmentFallback)
          .eq("id", appointmentId)
          .select("*")
          .single();
        updateError = fallback.error;
        updatedAppointment = fallback.data;
      }
      if (updateError) throw updateError;

      if (sessionPayload) {
        let { error: sessionError } = await admin
          .from("sessoes")
          .update(sessionPayload)
          .eq("agendamento_id", appointmentId);

        if (sessionError && isOptionalColumnError(sessionError)) {
          const fallbackPayload = nextStatus === "concluido"
            ? { status_repasse: "liberado" }
            : nextStatus === "aguardando_confirmacao_paciente"
              ? { status_repasse: "pendente" }
              : nextStatus === "cancelado"
                ? { status_repasse: "bloqueado" }
                : {};
          const fallback = await admin.from("sessoes").update(fallbackPayload).eq("agendamento_id", appointmentId);
          sessionError = fallback.error;
        }

        if (sessionError) {
          // Evita manter agendamento e sessão em estados financeiros contraditórios.
          await admin.from("agendamentos").update({ status: appointment.status }).eq("id", appointmentId);
          throw new Error(`Não foi possível sincronizar a sessão vinculada: ${sessionError.message}`);
        }
      }

      const targetUserIds = Array.from(new Set([cleanText(appointment.paciente_id), cleanText(appointment.fisio_id)].filter(Boolean)));
      for (const userId of targetUserIds) {
        await insertNotification({
          user_id: userId,
          titulo: notificationTitle,
          mensagem: notificationMessage,
          tipo: nextStatus === "concluido" ? "payment" : "appointment",
          lida: false,
          link: nextStatus === "concluido" && userId === cleanText(appointment.fisio_id) ? "/dashboard" : "/appointments",
          created_at: now,
        });
      }

      await logHistory(
        "admin_appointment_status_update",
        `Administrador alterou o agendamento ${appointmentId} de ${appointment.status || "sem status"} para ${nextStatus}${reason ? ` — Motivo: ${reason}` : ""}.`,
        appointmentId,
      );
      await logAudit("agendamentos", appointmentId, "ADMIN_APPOINTMENT_STATUS_UPDATE", appointment, updatedAppointment);

      return json({ success: true, appointment: updatedAppointment, status: nextStatus });
    }

    if (action === "reschedule_appointment") {
      if (!canManageAppointments) return json({ success: false, error: "Sem permissão para gerenciar agendamentos" }, 403);

      const appointmentId = cleanText(body.appointmentId);
      const date = cleanText(body.date);
      const time = normalizeTime(cleanText(body.time));
      if (!appointmentId) return json({ success: false, error: "Agendamento não informado" }, 400);
      if (!isValidDate(date) || !isValidTime(time)) return json({ success: false, error: "Data ou horário inválido" }, 400);

      const { data: appointment, error: appointmentError } = await admin
        .from("agendamentos")
        .select("*")
        .eq("id", appointmentId)
        .maybeSingle();
      if (appointmentError) throw appointmentError;
      if (!appointment) return json({ success: false, error: "Agendamento não encontrado" }, 404);

      const currentStatus = normalize(appointment.status);
      if (["concluido", "cancelado", "expirado"].includes(currentStatus)) {
        return json({ success: false, error: "Agendamentos concluídos/cancelados não podem ser reagendados diretamente." }, 409);
      }

      const oldDate = cleanText(appointment.data || appointment.data_servico).slice(0, 10);
      const oldTime = cleanText(appointment.hora).slice(0, 8);
      const newTimestamp = `${date}T${time}`;
      const now = new Date().toISOString();

      let { data: updatedAppointment, error: updateError } = await admin
        .from("agendamentos")
        .update({ data: date, hora: time, data_servico: newTimestamp, updated_at: now })
        .eq("id", appointmentId)
        .select("*")
        .single();

      if (updateError && isOptionalColumnError(updateError)) {
        const fallback = await admin
          .from("agendamentos")
          .update({ data: date, hora: time, data_servico: newTimestamp })
          .eq("id", appointmentId)
          .select("*")
          .single();
        updateError = fallback.error;
        updatedAppointment = fallback.data;
      }
      if (updateError) throw updateError;

      const { error: sessionError } = await admin
        .from("sessoes")
        .update({ data: date, hora: time })
        .eq("agendamento_id", appointmentId);

      if (sessionError) {
        // Rollback conservador: se a sessão vinculada não acompanhar, restaura o horário anterior do agendamento.
        const rollback: Record<string, unknown> = {};
        if (oldDate) rollback.data = oldDate;
        if (oldTime) rollback.hora = oldTime;
        if (oldDate) rollback.data_servico = `${oldDate}T${oldTime || "00:00:00"}`;
        if (Object.keys(rollback).length > 0) await admin.from("agendamentos").update(rollback).eq("id", appointmentId);
        throw new Error(`Não foi possível sincronizar a sessão vinculada: ${sessionError.message}`);
      }

      const targetUserIds = Array.from(new Set([cleanText(appointment.paciente_id), cleanText(appointment.fisio_id)].filter(Boolean)));
      for (const userId of targetUserIds) {
        await insertNotification({
          user_id: userId,
          titulo: "Agendamento reagendado",
          mensagem: `O FisioCareHub reagendou administrativamente o atendimento para ${date} às ${time.slice(0, 5)}.`,
          tipo: "appointment",
          lida: false,
          link: "/appointments",
          created_at: now,
        });
      }

      await logHistory(
        "admin_appointment_reschedule",
        `Administrador reagendou ${appointmentId} de ${oldDate || "data não informada"} ${oldTime || ""} para ${date} ${time.slice(0, 5)}.`,
        appointmentId,
      );
      await logAudit("agendamentos", appointmentId, "ADMIN_APPOINTMENT_RESCHEDULE", appointment, updatedAppointment);

      return json({ success: true, appointment: updatedAppointment });
    }

    if (action === "mark_withdrawal_paid") {
      if (!canManageWithdrawals) return json({ success: false, error: "Sem permissão para gerenciar saques" }, 403);

      const withdrawalId = cleanText(body.withdrawalId);
      if (!withdrawalId) return json({ success: false, error: "Solicitação de saque não informada" }, 400);

      const { data: withdrawal, error: withdrawalError } = await admin
        .from("solicitacoes_saque")
        .select("*")
        .eq("id", withdrawalId)
        .maybeSingle();
      if (withdrawalError) throw withdrawalError;
      if (!withdrawal) return json({ success: false, error: "Solicitação de saque não encontrada" }, 404);
      if (normalize(withdrawal.status) !== "pendente") {
        return json({ success: false, error: `Este saque já está com status ${withdrawal.status || "não informado"}.` }, 409);
      }

      const processedAt = new Date().toISOString();
      const reference = cleanText(body.reference) || null;
      const note = cleanText(body.note) || null;
      const primaryPayload = {
        status: "pago",
        processado_em: processedAt,
        processado_por: requester.id,
        referencia_pagamento: reference,
        admin_observacao: note,
      };

      let { data: updated, error } = await admin
        .from("solicitacoes_saque")
        .update(primaryPayload)
        .eq("id", withdrawalId)
        .select("*")
        .single();

      if (error && isOptionalColumnError(error)) {
        const fallback = await admin
          .from("solicitacoes_saque")
          .update({ status: "pago", processado_em: processedAt })
          .eq("id", withdrawalId)
          .select("*")
          .single();
        error = fallback.error;
        updated = fallback.data;
      }
      if (error) throw error;

      await logHistory(
        "withdrawal_marked_paid",
        `Administrador marcou manualmente como pago o saque ${withdrawalId} no valor de R$ ${Number(withdrawal.valor || 0).toFixed(2)}${reference ? ` — Referência: ${reference}` : ""}.`,
        withdrawalId,
      );
      await logAudit("solicitacoes_saque", withdrawalId, "ADMIN_WITHDRAWAL_MARK_PAID", withdrawal, updated);

      return json({ success: true, withdrawal: updated, processedAt });
    }

    if (action === "reject_withdrawal") {
      if (!canManageWithdrawals) return json({ success: false, error: "Sem permissão para gerenciar saques" }, 403);

      const withdrawalId = cleanText(body.withdrawalId);
      const reason = cleanText(body.reason);
      if (!withdrawalId) return json({ success: false, error: "Solicitação de saque não informada" }, 400);
      if (!reason) return json({ success: false, error: "Informe o motivo da recusa" }, 400);

      const { data: withdrawal, error: withdrawalError } = await admin
        .from("solicitacoes_saque")
        .select("*")
        .eq("id", withdrawalId)
        .maybeSingle();
      if (withdrawalError) throw withdrawalError;
      if (!withdrawal) return json({ success: false, error: "Solicitação de saque não encontrada" }, 404);
      if (normalize(withdrawal.status) !== "pendente") {
        return json({ success: false, error: `Este saque já está com status ${withdrawal.status || "não informado"}.` }, 409);
      }

      const processedAt = new Date().toISOString();
      const primaryPayload = {
        status: "recusado",
        processado_em: processedAt,
        processado_por: requester.id,
        motivo_recusa: reason,
        admin_observacao: cleanText(body.note) || null,
      };

      let { data: updated, error } = await admin
        .from("solicitacoes_saque")
        .update(primaryPayload)
        .eq("id", withdrawalId)
        .select("*")
        .single();

      if (error && isOptionalColumnError(error)) {
        const fallback = await admin
          .from("solicitacoes_saque")
          .update({ status: "recusado" })
          .eq("id", withdrawalId)
          .select("*")
          .single();
        error = fallback.error;
        updated = fallback.data;
      }
      if (error) throw error;

      await logHistory(
        "withdrawal_rejected",
        `Administrador recusou o saque ${withdrawalId}. Motivo: ${reason}.`,
        withdrawalId,
      );
      await logAudit("solicitacoes_saque", withdrawalId, "ADMIN_WITHDRAWAL_REJECT", withdrawal, updated);

      return json({ success: true, withdrawal: updated, processedAt });
    }

    // Ações da Fase 1 que atuam em uma conta específica.
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
