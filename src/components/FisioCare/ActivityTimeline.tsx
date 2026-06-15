import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Calendar,
  CheckCircle2,
  Star,
  User,
  MessageSquare,
  Activity,
  Clock,
  ArrowRight,
  Stethoscope,
  ClipboardList,
  Sparkles,
  HeartPulse,
  X,
  ExternalLink,
  Hash,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "../../lib/utils";

interface ActivityItem {
  id: string;
  tipo_acao: string;
  descricao: string;
  created_at: string;
  referencia_id?: string;
  paciente_id?: string;
  atendimento_id?: string;
  source_table?: string;
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
  loading?: boolean;
  mode?: "patient" | "physio";
}

const normalizeAction = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const getActionStyles = (type: string) => {
  const normalized = type.toLowerCase();

  if (normalized.includes("triagem")) {
    return {
      icon: Stethoscope,
      iconColor: "text-violet-600 dark:text-violet-200",
      iconBg:
        "bg-gradient-to-br from-violet-100 via-fuchsia-50 to-sky-100 dark:from-violet-500/25 dark:via-fuchsia-500/15 dark:to-sky-500/20",
      nodeRing: "ring-violet-200/90 dark:ring-violet-300/20",
      cardBg:
        "bg-gradient-to-br from-violet-50 via-white to-sky-50 dark:from-violet-500/12 dark:via-white/[0.06] dark:to-sky-500/10",
      border: "border-violet-200/80 dark:border-violet-300/15",
      accent: "from-violet-500 to-sky-400",
      actionColor: "text-violet-700 dark:text-violet-200",
    };
  }

  if (normalized.includes("agendamento") && normalized.includes("concluido")) {
    return {
      icon: CheckCircle2,
      iconColor: "text-emerald-600 dark:text-emerald-200",
      iconBg:
        "bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 dark:from-emerald-500/25 dark:via-teal-500/15 dark:to-cyan-500/20",
      nodeRing: "ring-emerald-200/90 dark:ring-emerald-300/20",
      cardBg:
        "bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-500/12 dark:via-white/[0.06] dark:to-teal-500/10",
      border: "border-emerald-200/80 dark:border-emerald-300/15",
      accent: "from-emerald-500 to-teal-400",
      actionColor: "text-emerald-700 dark:text-emerald-200",
    };
  }

  if (normalized.includes("agendamento")) {
    return {
      icon: Calendar,
      iconColor: "text-blue-600 dark:text-blue-200",
      iconBg:
        "bg-gradient-to-br from-blue-100 via-sky-50 to-cyan-100 dark:from-blue-500/25 dark:via-sky-500/15 dark:to-cyan-500/20",
      nodeRing: "ring-blue-200/90 dark:ring-blue-300/20",
      cardBg:
        "bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-blue-500/12 dark:via-white/[0.06] dark:to-cyan-500/10",
      border: "border-blue-200/80 dark:border-blue-300/15",
      accent: "from-blue-500 to-cyan-400",
      actionColor: "text-blue-700 dark:text-blue-200",
    };
  }

  if (normalized.includes("avaliacao") || normalized.includes("avaliação")) {
    return {
      icon: Star,
      iconColor: "text-amber-600 dark:text-amber-200",
      iconBg:
        "bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 dark:from-amber-500/25 dark:via-orange-500/15 dark:to-yellow-500/20",
      nodeRing: "ring-amber-200/90 dark:ring-amber-300/20",
      cardBg:
        "bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-amber-500/12 dark:via-white/[0.06] dark:to-orange-500/10",
      border: "border-amber-200/80 dark:border-amber-300/15",
      accent: "from-amber-500 to-orange-400",
      actionColor: "text-amber-700 dark:text-amber-200",
    };
  }

  if (normalized.includes("perfil")) {
    return {
      icon: User,
      iconColor: "text-purple-600 dark:text-purple-200",
      iconBg:
        "bg-gradient-to-br from-purple-100 via-fuchsia-50 to-pink-100 dark:from-purple-500/25 dark:via-fuchsia-500/15 dark:to-pink-500/20",
      nodeRing: "ring-purple-200/90 dark:ring-purple-300/20",
      cardBg:
        "bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-purple-500/12 dark:via-white/[0.06] dark:to-pink-500/10",
      border: "border-purple-200/80 dark:border-purple-300/15",
      accent: "from-purple-500 to-pink-400",
      actionColor: "text-purple-700 dark:text-purple-200",
    };
  }

  if (normalized.includes("mensagem")) {
    return {
      icon: MessageSquare,
      iconColor: "text-sky-600 dark:text-sky-200",
      iconBg:
        "bg-gradient-to-br from-sky-100 via-cyan-50 to-blue-100 dark:from-sky-500/25 dark:via-cyan-500/15 dark:to-blue-500/20",
      nodeRing: "ring-sky-200/90 dark:ring-sky-300/20",
      cardBg:
        "bg-gradient-to-br from-sky-50 via-white to-blue-50 dark:from-sky-500/12 dark:via-white/[0.06] dark:to-blue-500/10",
      border: "border-sky-200/80 dark:border-sky-300/15",
      accent: "from-sky-500 to-blue-400",
      actionColor: "text-sky-700 dark:text-sky-200",
    };
  }

  if (normalized.includes("prontuario") || normalized.includes("prontuário")) {
    return {
      icon: ClipboardList,
      iconColor: "text-rose-600 dark:text-rose-200",
      iconBg:
        "bg-gradient-to-br from-rose-100 via-pink-50 to-orange-100 dark:from-rose-500/25 dark:via-pink-500/15 dark:to-orange-500/20",
      nodeRing: "ring-rose-200/90 dark:ring-rose-300/20",
      cardBg:
        "bg-gradient-to-br from-rose-50 via-white to-orange-50 dark:from-rose-500/12 dark:via-white/[0.06] dark:to-orange-500/10",
      border: "border-rose-200/80 dark:border-rose-300/15",
      accent: "from-rose-500 to-orange-400",
      actionColor: "text-rose-700 dark:text-rose-200",
    };
  }

  return {
    icon: Activity,
    iconColor: "text-slate-600 dark:text-slate-200",
    iconBg:
      "bg-gradient-to-br from-slate-100 via-white to-blue-100 dark:from-slate-500/25 dark:via-white/[0.08] dark:to-blue-500/20",
    nodeRing: "ring-slate-200/90 dark:ring-white/15",
    cardBg:
      "bg-gradient-to-br from-white via-slate-50 to-blue-50 dark:from-white/[0.08] dark:via-white/[0.05] dark:to-blue-500/10",
    border: "border-slate-200/90 dark:border-white/10",
    accent: "from-slate-500 to-blue-400",
    actionColor: "text-slate-700 dark:text-slate-200",
  };
};

const formatActionLabel = (type: string) => {
  const label = type.replace(/_/g, " ").trim();
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const getActivityDetailTitle = (activity: ActivityItem) => {
  const action = normalizeAction(
    `${activity.tipo_acao || ""} ${activity.descricao || ""} ${activity.source_table || ""}`,
  );

  if (
    action.includes("diario") ||
    action.includes("dor") ||
    action.includes("checkin") ||
    action.includes("check-in")
  ) {
    return "Detalhes da dor registrada";
  }

  if (action.includes("triagem")) {
    return "Detalhes da triagem registrada";
  }

  if (action.includes("exercicio") || action.includes("treino")) {
    return "Detalhes do exercício registrado";
  }

  if (
    action.includes("melhora") ||
    action.includes("melhoria") ||
    action.includes("evolucao")
  ) {
    return "Detalhes da melhoria registrada";
  }

  if (action.includes("agendamento") || action.includes("consulta")) {
    return "Detalhes da atividade registrada";
  }

  return "Detalhes da atividade registrada";
};

const extractActivityHighlights = (activity: ActivityItem) => {
  const text = `${activity.tipo_acao || ""} ${activity.descricao || ""}`;
  const normalized = normalizeAction(text);
  const highlights: Array<{ label: string; value: string }> = [];

  const painMatch = text.match(
    /dor\s*(?:registrad[ao]\s*)?(?:•|:|-)?\s*(\d{1,2})\s*\/\s*10/i,
  );
  if (painMatch?.[1]) {
    highlights.push({ label: "Dor", value: `${painMatch[1]}/10` });
  }

  const riskMatch = text.match(
    /\b(verde|amarelo|vermelho|baixo|moderado|alto)\b/i,
  );
  if (
    (normalized.includes("triagem") || normalized.includes("risco")) &&
    riskMatch?.[1]
  ) {
    highlights.push({ label: "Classificação", value: riskMatch[1] });
  }

  const regionMatch = text.match(
    /(?:triagem ia realizada:|regi[aã]o|queixa|local)\s*([^•\n,]+)/i,
  );
  if (regionMatch?.[1]) {
    highlights.push({ label: "Região", value: regionMatch[1].trim() });
  }

  if (normalized.includes("concluido") || normalized.includes("concluida")) {
    highlights.push({ label: "Status", value: "Concluído" });
  }

  return highlights;
};

export default function ActivityTimeline({
  activities,
  loading,
  mode = "patient",
}: ActivityTimelineProps) {
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(
    null,
  );

  const selectedActivityDetails = useMemo(() => {
    if (!selectedActivity) return null;

    return {
      style: getActionStyles(selectedActivity.tipo_acao),
      title: getActivityDetailTitle(selectedActivity),
      highlights: extractActivityHighlights(selectedActivity),
      formattedDate: format(
        new Date(selectedActivity.created_at),
        "dd 'de' MMMM 'de' yyyy 'às' HH:mm",
        { locale: ptBR },
      ),
    };
  }, [selectedActivity]);
  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 rounded-[2rem] border border-slate-200/70 bg-white/70 shadow-sm dark:border-white/5 dark:bg-white/5"
          />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-[2.5rem] border border-dashed border-violet-200 bg-gradient-to-br from-white via-violet-50 to-sky-50 px-6 py-12 text-center shadow-sm dark:border-white/10 dark:from-white/[0.06] dark:via-violet-500/10 dark:to-sky-500/10">
        <HeartPulse
          size={48}
          className="mx-auto mb-4 text-violet-400 dark:text-violet-300"
        />
        <p className="font-bold text-slate-600 dark:text-slate-400">
          Nenhuma atividade registrada ainda.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="relative space-y-7 px-1 sm:px-0">
        <div className="absolute bottom-10 left-7 top-8 w-[2px] rounded-full bg-gradient-to-b from-violet-300 via-sky-200 to-emerald-200 dark:from-violet-400/50 dark:via-sky-400/25 dark:to-emerald-400/20" />

        {activities.map((activity, index) => {
          const style = getActionStyles(activity.tipo_acao);
          const Icon = style.icon;

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -18 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.06 }}
              viewport={{ once: true }}
              className="relative flex gap-4 sm:gap-6 group"
            >
              <div className="relative z-10 flex w-14 shrink-0 justify-center">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 shadow-xl ring-4 transition-all duration-300 group-hover:-translate-y-1 group-hover:scale-105 dark:border-white/10",
                    style.iconBg,
                    style.iconColor,
                    style.nodeRing,
                  )}
                >
                  <Icon size={21} />
                </div>
              </div>

              <div
                className={cn(
                  "relative min-w-0 flex-1 overflow-hidden rounded-[2rem] border p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-2xl transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_22px_55px_rgba(59,130,246,0.16)] sm:p-5 dark:shadow-black/10",
                  style.cardBg,
                  style.border,
                )}
              >
                <div
                  className={cn(
                    "absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-80",
                    style.accent,
                  )}
                />
                <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/50 blur-2xl dark:bg-white/10" />

                <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2">
                      <Sparkles
                        size={13}
                        className={cn("shrink-0", style.actionColor)}
                      />
                      <h4 className="text-base font-black leading-tight tracking-tight text-slate-950 dark:text-white sm:text-lg">
                        {formatActionLabel(activity.tipo_acao)}
                      </h4>
                    </div>
                    <p className="text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
                      {activity.descricao}
                    </p>
                  </div>

                  <div className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-700 shadow-sm dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
                    <Clock size={11} className="shrink-0 opacity-70" />
                    {format(
                      new Date(activity.created_at),
                      "HH:mm, d 'de' MMM",
                      { locale: ptBR },
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedActivity(activity)}
                  className={cn(
                    "relative mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] transition-colors group/link",
                    style.actionColor,
                  )}
                >
                  Ver detalhes
                  <ArrowRight
                    size={12}
                    className="transition-transform group-hover/link:translate-x-1"
                  />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {selectedActivity && selectedActivityDetails && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 px-3 pb-3 backdrop-blur-sm sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="Fechar detalhes da atividade"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setSelectedActivity(null)}
          />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            className={cn(
              "relative w-full max-w-lg overflow-hidden rounded-[2rem] border p-5 shadow-2xl sm:p-6",
              selectedActivityDetails.style.cardBg,
              selectedActivityDetails.style.border,
            )}
          >
            <div
              className={cn(
                "absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r",
                selectedActivityDetails.style.accent,
              )}
            />
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/60 blur-3xl dark:bg-white/10" />

            <div className="relative flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/70 shadow-xl ring-4 dark:border-white/10",
                    selectedActivityDetails.style.iconBg,
                    selectedActivityDetails.style.iconColor,
                    selectedActivityDetails.style.nodeRing,
                  )}
                >
                  {React.createElement(selectedActivityDetails.style.icon, {
                    size: 22,
                  })}
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                    Atividade do paciente
                  </p>
                  <h3 className="mt-1 text-lg font-black leading-tight text-slate-950 dark:text-white">
                    {selectedActivityDetails.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-500 shadow-sm transition-all hover:-translate-y-0.5 hover:text-slate-900 dark:border-white/10 dark:bg-white/10 dark:text-slate-300 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {selectedActivityDetails.highlights.length > 0 && (
              <div className="relative mt-5 grid grid-cols-2 gap-2">
                {selectedActivityDetails.highlights.map((item) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    className="rounded-2xl border border-white/70 bg-white/75 px-3 py-2 shadow-sm dark:border-white/10 dark:bg-black/20"
                  >
                    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="relative mt-5 space-y-3 rounded-[1.5rem] border border-white/70 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-black/20">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  Tipo
                </p>
                <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                  {formatActionLabel(selectedActivity.tipo_acao)}
                </p>
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  Descrição registrada
                </p>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
                  {selectedActivity.descricao ||
                    "Sem descrição adicional registrada."}
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-2xl bg-slate-100/80 px-3 py-2 text-xs font-black text-slate-700 dark:bg-white/10 dark:text-slate-200">
                <Clock size={14} className="opacity-70" />
                {selectedActivityDetails.formattedDate}
              </div>

              {(selectedActivity.referencia_id ||
                selectedActivity.source_table) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedActivity.source_table && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                      <ExternalLink size={11} /> {selectedActivity.source_table}
                    </span>
                  )}
                  {selectedActivity.referencia_id && (
                    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      <Hash size={11} /> Ref.{" "}
                      {String(selectedActivity.referencia_id).slice(0, 8)}
                    </span>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedActivity(null)}
              className="relative mt-5 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-sky-500 px-4 py-3 text-xs font-black text-white shadow-lg shadow-violet-500/20 transition-all hover:-translate-y-0.5"
            >
              Fechar detalhes
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
}
