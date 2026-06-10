import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { getEffectivePlan, hasPlanAccess } from "../lib/planAccess";
import {
  Calendar,
  Users,
  FileText,
  Activity,
  TrendingUp,
  Clock,
  ChevronRight,
  Plus,
  MessageSquare,
  BrainCircuit,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  Video,
  Loader2,
  Crown,
  Route,
  Wallet,
  User,
  MapPin,
  Thermometer,
  AlertTriangle,
  Smartphone,
  DollarSign,
  Trophy,
  Medal,
  Star,
  Zap,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { cn, formatDate } from "../lib/utils";
import { formatHourBR } from "../utils/date";
import { toast } from "sonner";
import { getLinkedClinicalPatients, getPatientVisibleIds } from "../services/patientLinkService";

// New FisioCare Components
import {
  PainDiary,
  ExerciseChecklist,
} from "../components/FisioCare/PatientCare";
import { SOAPIntelligentRecord } from "../components/FisioCare/SOAPRecord";
import { RouteOptimizer } from "../components/FisioCare/RouteOptimizer";
import { FinancialDashboard } from "../components/FisioCare/FinancialDashboard";
import { EvolutionCharts } from "../components/FisioCare/EvolutionCharts";
import ActivityTimeline from "../components/FisioCare/ActivityTimeline";
import { Skeleton, ListSkeleton } from "../components/Skeleton";
import FloatingHelpMenu from "../components/FloatingHelpMenu";
import ProGuard from "../components/ProGuard";
import ClinicalAssistant from "../components/FisioCare/ClinicalAssistant";
import EvaluationModal from "../components/FisioCare/EvaluationModal";
import ApprovalWelcomeModal from "../components/ApprovalWelcomeModal";
import ProductStoreCarousel from "../components/ProductStoreCarousel";
import ClinicalUpdatesCarousel from "../components/FisioCare/ClinicalUpdatesCarousel";
import StoryAvatar from "../components/FisioStories/StoryAvatar";

const WEEK_DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

type WeeklyChartData = {
  painData: { day: string; level: number | null }[];
  exerciseData: { day: string; completed: number; total: number }[];
  melhora: number;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const getSaoPauloDateKey = (value?: string | Date | null) => {
  if (typeof value === "string") {
    const trimmed = value.trim();

    // data_registro vem do Supabase como YYYY-MM-DD.
    // Não pode passar por new Date(YYYY-MM-DD), porque o JS interpreta como UTC
    // e em America/Sao_Paulo pode cair no dia anterior.
    if (DATE_ONLY_PATTERN.test(trimmed)) return trimmed;
  }

  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : "";
};

const getCurrentWeekKeys = () => {
  const todayKey = getSaoPauloDateKey();
  const [year, month, day] = todayKey.split("-").map(Number);
  const today = new Date(Date.UTC(year, month - 1, day, 12));
  const dayOfWeek = today.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() + diffToMonday);

  return WEEK_DAY_LABELS.map((label, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    return {
      label,
      key: date.toISOString().slice(0, 10),
    };
  });
};

const getRecordDate = (item: any) =>
  item?.data_registro ||
  item?.data_conclusao ||
  item?.created_at ||
  item?.updated_at ||
  null;

const getRecordTimestamp = (item: any) => {
  const raw = item?.created_at || item?.updated_at || getRecordDate(item);
  const time = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
};

const buildWeeklyChartData = (
  registrosPaciente: any[] = [],
  checklistExercicios: any[] = [],
  totalWorkouts = 0,
): WeeklyChartData => {
  const week = getCurrentWeekKeys();
  const painByDay = new Map<string, any>();
  const journalCompletedByDay = new Map<string, number>();
  const checklistCompletedByDay = new Map<string, number>();

  registrosPaciente.forEach((registro: any) => {
    const dateKey = getSaoPauloDateKey(getRecordDate(registro));
    if (!dateKey) return;

    const painValue = Number(
      registro?.nivel_dor ?? registro?.intensidade ?? registro?.dor_escala,
    );
    if (Number.isFinite(painValue)) {
      const previous = painByDay.get(dateKey);
      const previousTime = previous ? getRecordTimestamp(previous) : 0;
      const currentTime = getRecordTimestamp(registro);
      if (!previous || currentTime >= previousTime)
        painByDay.set(dateKey, registro);
    }

    const completedFromJournal = Number(
      registro?.concluidos_count ?? registro?.exercicios_concluidos_count,
    );
    const completedFromList = Array.isArray(registro?.exercicios_concluidos)
      ? registro.exercicios_concluidos.filter((exercise: any) => Boolean(exercise?.completed)).length
      : 0;
    const rawDone = registro?.exercicios_realizados;
    const completedFallback =
      rawDone === true ||
      rawDone === 1 ||
      rawDone === "1" ||
      String(rawDone || "").toLowerCase() === "true"
        ? 1
        : 0;
    const completedCount = Math.max(
      Number.isFinite(completedFromJournal) ? completedFromJournal : 0,
      completedFromList,
      completedFallback,
    );
    if (completedCount > 0) {
      journalCompletedByDay.set(
        dateKey,
        Math.max(journalCompletedByDay.get(dateKey) || 0, completedCount),
      );
    }
  });

  checklistExercicios.forEach((item: any) => {
    const dateKey = getSaoPauloDateKey(
      item?.data_conclusao || item?.created_at || item?.updated_at,
    );
    if (!dateKey) return;
    if (item?.concluido === false) return;
    checklistCompletedByDay.set(dateKey, (checklistCompletedByDay.get(dateKey) || 0) + 1);
  });

  const completedByDay = new Map<string, number>();
  week.forEach(({ key }) => {
    const journalCount = journalCompletedByDay.get(key) || 0;
    const checklistCount = checklistCompletedByDay.get(key) || 0;
    const realCount = Math.max(journalCount, checklistCount);
    if (realCount > 0) completedByDay.set(key, realCount);
  });

  const painData = week.map(({ label, key }) => {
    const registro = painByDay.get(key);
    const level = registro
      ? Number(
          registro?.nivel_dor ?? registro?.intensidade ?? registro?.dor_escala,
        )
      : null;
    return {
      day: label,
      level:
        typeof level === "number" && Number.isFinite(level)
          ? Math.min(Math.max(level, 0), 10)
          : null,
    };
  });

  const completedSum = Array.from(completedByDay.values()).reduce(
    (acc, value) => acc + value,
    0,
  );
  let remainingWeeklyTarget = Math.max(totalWorkouts - completedSum, 0);
  const todayKey = getSaoPauloDateKey();

  const exerciseData = week.map(({ label, key }) => {
    const completed = completedByDay.get(key) || 0;
    const shouldReceiveOpenTarget =
      remainingWeeklyTarget > 0 &&
      (key === todayKey || (completedSum > 0 && completed > 0));
    const extraTarget = shouldReceiveOpenTarget ? remainingWeeklyTarget : 0;
    if (shouldReceiveOpenTarget) remainingWeeklyTarget = 0;

    return {
      day: label,
      completed,
      total: Math.max(completed, completed + extraTarget),
    };
  });

  if (remainingWeeklyTarget > 0 && exerciseData.length > 0) {
    const todayIndex = week.findIndex((item) => item.key === todayKey);
    const targetIndex = todayIndex >= 0 ? todayIndex : exerciseData.length - 1;
    exerciseData[targetIndex] = {
      ...exerciseData[targetIndex],
      total: exerciseData[targetIndex].total + remainingWeeklyTarget,
    };
  }

  const painLevels = painData
    .map((item) => item.level)
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value),
    );

  const firstPain = painLevels[0] || 0;
  const lastPain =
    painLevels.length > 0 ? painLevels[painLevels.length - 1] : firstPain;
  const melhora =
    firstPain > 0
      ? Math.max(0, Math.round(((firstPain - lastPain) / firstPain) * 100))
      : 0;

  return { painData, exerciseData, melhora };
};

const PAID_APPOINTMENT_PAYMENT_STATUSES = [
  "pago_app",
  "pago_manual",
  "paid",
  "pago",
  "confirmado",
  "confirmed",
  "recebido",
  "received",
  "recebido_manual",
  "payment_received",
];
const REAL_APPOINTMENT_STATUSES = [
  "confirmado",
  "concluido",
  "concluído",
  "concluida",
  "concluída",
  "finalizado",
  "finalizada",
  "completed",
];
const EVALUABLE_APPOINTMENT_STATUSES = [
  "concluido",
  "concluído",
  "concluida",
  "concluída",
  "finalizado",
  "finalizada",
  "completed",
];
const BLOCKED_APPOINTMENT_STATUSES = [
  "cancelado",
  "cancelada",
  "recusado",
  "recusada",
  "pendente",
  "pendente_pagamento",
  "aguardando_pagamento",
  "solicitado",
  "solicitada",
];

const normalizeStatus = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase();

const hasConfirmedPayment = (appointment: any) => {
  const paymentCandidates = [
    appointment?.status_pagamento,
    appointment?.payment_status,
    appointment?.pagamento_status,
    appointment?.status_payment,
  ].map(normalizeStatus);

  return paymentCandidates.some((status) =>
    PAID_APPOINTMENT_PAYMENT_STATUSES.includes(status),
  );
};

const hasRealConfirmedAppointment = (appointment: any) => {
  const status = normalizeStatus(appointment?.status);
  if (!status || BLOCKED_APPOINTMENT_STATUSES.includes(status)) return false;

  return hasConfirmedPayment(appointment) && REAL_APPOINTMENT_STATUSES.includes(status);
};

const hasCompletedPaidAppointment = (appointment: any) => {
  const status = normalizeStatus(appointment?.status);
  if (!status || BLOCKED_APPOINTMENT_STATUSES.includes(status)) return false;

  return hasConfirmedPayment(appointment) && EVALUABLE_APPOINTMENT_STATUSES.includes(status);
};

const hasPatientSubmittedEvaluation = (evaluation: any) => {
  const profissionalRating = Number(evaluation?.nota_profissional || 0);
  const platformRating = Number(evaluation?.nota_plataforma || 0);
  const comment = String(evaluation?.comentario || "").trim();

  return profissionalRating > 0 || platformRating > 0 || comment.length > 0;
};

const parseAppointmentDateTime = (appointment: any): Date | null => {
  const raw =
    appointment?.data_servico ||
    appointment?.data ||
    appointment?.data_agendamento ||
    appointment?.created_at ||
    appointment?.criado_em;
  if (!raw) return null;

  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw;
  }

  const rawText = String(raw).trim();
  if (
    !rawText ||
    rawText.toLowerCase() === "invalid date" ||
    rawText.toLowerCase() === "nan"
  )
    return null;

  const directDate = new Date(rawText);
  if (!Number.isNaN(directDate.getTime())) return directDate;

  const datePart = rawText.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!datePart) return null;

  let timePart = String(appointment?.hora || "").trim();
  if (/^\d{2}:\d{2}$/.test(timePart)) timePart = `${timePart}:00`;
  if (!/^\d{2}:\d{2}:\d{2}$/.test(timePart)) timePart = "12:00:00";

  const composedDate = new Date(`${datePart}T${timePart}`);
  return Number.isNaN(composedDate.getTime()) ? null : composedDate;
};

const getUpcomingAppointment = (appointments: any[]) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return (
    appointments
      .map((appointment) => ({
        appointment,
        date: parseAppointmentDateTime(appointment),
      }))
      .filter(
        (item): item is { appointment: any; date: Date } =>
          Boolean(item.date) && item.date >= startOfToday,
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0]?.appointment ||
    null
  );
};

const formatAppointmentMonth = (appointment: any) => {
  const date = parseAppointmentDateTime(appointment);
  if (!date) return "--";
  return date
    .toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      month: "short",
    })
    .replace(".", "");
};

const formatAppointmentDay = (appointment: any) => {
  const date = parseAppointmentDateTime(appointment);
  if (!date) return "--";
  return date.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
  });
};

const formatAppointmentTime = (appointment: any) => {
  const rawTime = String(appointment?.hora || "").trim();
  if (/^\d{2}:\d{2}/.test(rawTime)) return rawTime.slice(0, 5);

  const date = parseAppointmentDateTime(appointment);
  if (!date) return "--:--";
  return date.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getAppointmentProviderName = (appointment: any) =>
  appointment?.nome_fisioterapeuta ||
  appointment?.fisioterapeuta?.nome_completo ||
  appointment?.fisioterapeuta?.nome ||
  "Fisioterapeuta";

const getTriageCreatedAt = (triage: any) =>
  triage?.created_at ||
  triage?.data_triagem ||
  triage?.updated_at ||
  new Date().toISOString();

const getTriageRegion = (triage: any) =>
  triage?.regiao_dor ||
  triage?.regiao ||
  triage?.queixa_principal ||
  triage?.classificacao ||
  "Triagem IA";

const buildDashboardActivities = (
  savedActivities: any[] = [],
  triages: any[] = [],
  appointments: any[] = [],
  prontuarios: any[] = [],
  evolucoes: any[] = [],
  registrosPaciente: any[] = [],
  exerciciosPaciente: any[] = [],
  documentos: any[] = [],
) => {
  const syntheticTriages = (triages || []).slice(0, 8).map((triage: any) => ({
    id: `triage-${triage.id}`,
    tipo_acao: "triagem_realizada",
    descricao: `Triagem IA realizada: ${getTriageRegion(triage)}${triage?.gravidade ? ` • ${triage.gravidade}` : ""}`,
    created_at: getTriageCreatedAt(triage),
    referencia_id: triage.id,
    paciente_id: triage.paciente_id,
    source_table: "triagens",
  }));

  const syntheticAppointments = (appointments || [])
    .slice(0, 6)
    .map((appointment: any) => ({
      id: `appointment-${appointment.id}`,
      tipo_acao:
        appointment?.status === "concluido"
          ? "agendamento_concluido"
          : "agendamento_criado",
      descricao:
        appointment?.status === "concluido"
          ? "Consulta concluída"
          : `Consulta ${appointment?.status || "agendada"} com ${getAppointmentProviderName(appointment)}`,
      created_at:
        appointment?.updated_at ||
        appointment?.created_at ||
        appointment?.data_servico ||
        appointment?.data ||
        new Date().toISOString(),
      referencia_id: appointment.id,
      paciente_id: appointment.paciente_id,
      source_table: "agendamentos",
    }));

  const syntheticProntuarios = (prontuarios || [])
    .slice(0, 6)
    .map((item: any) => ({
      id: `prontuario-${item.id}`,
      tipo_acao: "prontuario_criado",
      descricao: item?.tipo_atendimento
        ? `Prontuário ${item.tipo_atendimento} salvo`
        : "Prontuário clínico salvo",
      created_at:
        item?.data_registro ||
        item?.created_at ||
        item?.updated_at ||
        new Date().toISOString(),
      referencia_id: item.id,
      paciente_id: item.paciente_id,
      source_table: "prontuarios",
    }));

  const syntheticEvolucoes = (evolucoes || []).slice(0, 6).map((item: any) => ({
    id: `evolucao-${item.id}`,
    tipo_acao: "evolucao_registrada",
    descricao: "Evolução clínica registrada",
    created_at:
      item?.data_evolucao ||
      item?.created_at ||
      item?.updated_at ||
      new Date().toISOString(),
    referencia_id: item.id,
    paciente_id: item.paciente_id,
    atendimento_id: item.atendimento_id,
    source_table: "evolucoes",
  }));

  const syntheticRegistros = (registrosPaciente || [])
    .slice(0, 6)
    .map((item: any) => ({
      id: `registro-paciente-${item.id || item.data_registro}`,
      tipo_acao: "diario_dor_registrado",
      descricao:
        item?.nivel_dor !== undefined && item?.nivel_dor !== null
          ? `Diário de dor registrado • Dor ${item.nivel_dor}/10`
          : "Registro de evolução do paciente salvo",
      created_at:
        item?.created_at ||
        item?.data_registro ||
        item?.updated_at ||
        new Date().toISOString(),
      referencia_id: item.id || item.data_registro,
      paciente_id: item.paciente_id,
      source_table: "registros_paciente",
    }));

  const syntheticExercises = (exerciciosPaciente || [])
    .slice(0, 6)
    .map((item: any) => ({
      id: `exercicio-${item.id}`,
      tipo_acao: "exercicio_prescrito",
      descricao:
        item?.exercicio_nome || item?.nome || item?.exercicio?.nome
          ? `Exercício prescrito: ${item.exercicio_nome || item.nome || item.exercicio?.nome}`
          : "Exercício prescrito para o paciente",
      created_at:
        item?.created_at || item?.updated_at || new Date().toISOString(),
      referencia_id: item.id,
      paciente_id: item.paciente_id,
      source_table: "exercicios_paciente",
    }));

  const syntheticDocuments = (documentos || [])
    .slice(0, 6)
    .map((item: any) => ({
      id: `documento-${item.id}`,
      tipo_acao: "documento_gerado",
      descricao:
        item?.tipo_documento || item?.tipo || item?.titulo
          ? `Documento gerado: ${item.tipo_documento || item.tipo || item.titulo}`
          : "Documento clínico gerado",
      created_at:
        item?.created_at ||
        item?.data_geracao ||
        item?.updated_at ||
        new Date().toISOString(),
      referencia_id: item.id,
      paciente_id: item.paciente_id,
      source_table: "documentos_gerados",
    }));

  const unique = new Map<string, any>();
  [
    ...(savedActivities || []),
    ...syntheticTriages,
    ...syntheticAppointments,
    ...syntheticProntuarios,
    ...syntheticEvolucoes,
    ...syntheticRegistros,
    ...syntheticExercises,
    ...syntheticDocuments,
  ]
    .filter(Boolean)
    .forEach((activity: any) => {
      const key = String(
        activity?.id ||
          `${activity?.tipo_acao}-${activity?.referencia_id}-${activity?.created_at}`,
      );
      if (!unique.has(key)) unique.set(key, activity);
    });

  return Array.from(unique.values())
    .sort(
      (a: any, b: any) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime(),
    )
    .slice(0, 12);
};

export default function Dashboard() {
  const {
    user,
    profile,
    subscription,
    loading: authLoading,
    refreshProfile,
  } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    appointments: 0,
    patients: 0,
    records: 0,
    pendingTriages: 0,
    workouts: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [recentTriages, setRecentTriages] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [weeklyChartData, setWeeklyChartData] = useState<WeeklyChartData>(() =>
    buildWeeklyChartData([], [], 0),
  );
  const [statsLoading, setStatsLoading] = useState(true);
  const [apptsLoading, setApptsLoading] = useState(true);
  const [patientSearch, setPatientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [isAiExpanded, setIsAiExpanded] = useState(true);
  const [aiMessage, setAiMessage] = useState("");

  const [showEvaluation, setShowEvaluation] = useState(false);
  const [pendingEvaluation, setPendingEvaluation] = useState<any>(null);

  const lastLoadedProfileId = useRef<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null,
  );
  const [showWelcome, setShowWelcome] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const planId = searchParams.get("plan_id");

    if (sessionId && planId === "pro") {
      toast.success("Assinatura Pro Ativada!", {
        description:
          "Parabéns! Você agora tem acesso a todos os recursos avançados.",
      });
      refreshProfile();
      navigate("/dashboard", { replace: true });
    }
  }, [searchParams, refreshProfile, navigate]);

  const fetchPatientWorkoutCount = useCallback(async (patientProfile: any) => {
    const visiblePatientIds = await getPatientVisibleIds(
      patientProfile.id,
      patientProfile.email,
    );

    if (visiblePatientIds.length === 0) return 0;

    const { data: protocolsData, error: protocolsError } = await supabase
      .from("protocolos_prescricao")
      .select("id")
      .in("paciente_id", visiblePatientIds);

    if (protocolsError) {
      console.error(
        "Erro ao contar protocolos do paciente no dashboard:",
        protocolsError,
      );
    }

    const protocolIds = (protocolsData || [])
      .map((protocol: any) => protocol.id)
      .filter(Boolean);
    let protocolItemsCount = 0;

    if (protocolIds.length > 0) {
      const { count, error } = await supabase
        .from("protocolo_itens")
        .select("id", { count: "exact", head: true })
        .in("protocolo_id", protocolIds);

      if (error) {
        console.error("Erro ao contar itens de protocolo no dashboard:", error);
      } else {
        protocolItemsCount = count || 0;
      }
    }

    const { count: directPrescriptionsCount, error: directPrescriptionsError } =
      await supabase
        .from("exercicios_paciente")
        .select("id", { count: "exact", head: true })
        .in("paciente_id", visiblePatientIds)
        .eq("status", "ativo");

    if (directPrescriptionsError) {
      console.error(
        "Erro ao contar exercícios prescritos diretamente no dashboard:",
        directPrescriptionsError,
      );
    }

    return protocolItemsCount + (directPrescriptionsCount || 0);
  }, []);

  const checkPendingEvaluations = useCallback(async (userId: string, email?: string | null) => {
    try {
      const visiblePatientIds = await getPatientVisibleIds(userId, email);

      if (visiblePatientIds.length === 0) {
        console.warn("[Dashboard] Nenhum vínculo de paciente encontrado para verificar avaliações.");
        return;
      }

      const { data: appointments, error: apptError } = await supabase
        .from("agendamentos")
        .select(
          `
          id,
          paciente_id,
          fisio_id,
          status,
          status_pagamento,
          payment_status,
          pagamento_status,
          status_payment,
          data,
          hora,
          data_servico,
          concluido_em,
          fisioterapeuta:perfis!fisio_id(nome_completo)
        `,
        )
        .in("paciente_id", visiblePatientIds)
        .order("data_servico", { ascending: false, nullsFirst: false })
        .order("data", { ascending: false, nullsFirst: false });

      if (apptError) throw apptError;

      const appointmentsToCheck = (appointments || []).filter(hasCompletedPaidAppointment);
      if (appointmentsToCheck.length === 0) {
        setPendingEvaluation(null);
        setShowEvaluation(false);
        return;
      }

      const appointmentIds = appointmentsToCheck.map((appointment: any) => appointment.id).filter(Boolean);

      const { data: evaluations, error: evalError } = await supabase
        .from("avaliacoes")
        .select("agendamento_id, paciente_id, nota_profissional, nota_plataforma, comentario")
        .in("paciente_id", visiblePatientIds)
        .in("agendamento_id", appointmentIds);

      if (evalError) throw evalError;

      const evaluatedIds = new Set(
        (evaluations || [])
          .filter(hasPatientSubmittedEvaluation)
          .map((evaluation: any) => evaluation.agendamento_id),
      );
      const apptToEvaluate = appointmentsToCheck.find((a) => !evaluatedIds.has(a.id));

      if (apptToEvaluate) {
        setPendingEvaluation({
          id: apptToEvaluate.id,
          paciente_id: apptToEvaluate.paciente_id,
          fisio_id: apptToEvaluate.fisio_id,
          fisio_nome: Array.isArray(apptToEvaluate.fisioterapeuta)
            ? apptToEvaluate.fisioterapeuta[0]?.nome_completo
            : (apptToEvaluate.fisioterapeuta as any)?.nome_completo,
        });
        setShowEvaluation(true);
      } else {
        setPendingEvaluation(null);
        setShowEvaluation(false);
      }
    } catch (err) {
      console.error("Erro ao verificar avaliações pendentes:", err);
    }
  }, []);

  const fetchDashboardData = useCallback(
    async (data: any) => {
      if (!data) return;

      setStatsLoading(true);
      setApptsLoading(true);

      if (data.tipo_usuario === "paciente") {
        checkPendingEvaluations(data.id, data.email);
      }

      try {
        const isPhysio = data.tipo_usuario === "fisioterapeuta";
        const roleField =
          data.tipo_usuario === "paciente" ? "paciente_id" : "fisio_id";

        let agendamentoIds: string[] = [];
        let linkedPatientProfileIds: string[] = [];

        if (isPhysio) {
          const linkedIds = new Set<string>();

          const { data: appts } = await supabase
            .from("agendamentos")
            .select("id, paciente_id, status, status_pagamento, payment_status, pagamento_status, status_payment")
            .eq("fisio_id", data.id)
            .in("status", REAL_APPOINTMENT_STATUSES);

          const realLinkedAppointments = (appts || []).filter(hasRealConfirmedAppointment);
          agendamentoIds = realLinkedAppointments
            .map((appt: any) => appt.id)
            .filter(Boolean);
          realLinkedAppointments.forEach((appt: any) => {
            if (appt.paciente_id) linkedIds.add(appt.paciente_id);
          });

          const { data: internalPatients } = await supabase
            .from("pacientes")
            .select("id, perfil_id, email")
            .eq("fisioterapeuta_id", data.id);

          (internalPatients || []).forEach((patient: any) => {
            // O app pode salvar paciente_id como pacientes.id ou como perfis.id.
            // Por isso o Dashboard considera os dois identificadores.
            if (patient?.id) linkedIds.add(String(patient.id));
            if (patient?.perfil_id) linkedIds.add(String(patient.perfil_id));
          });

          const internalPatientEmails = Array.from(
            new Set(
              (internalPatients || [])
                .map((patient: any) =>
                  String(patient.email || "")
                    .trim()
                    .toLowerCase(),
                )
                .filter(Boolean),
            ),
          );

          if (internalPatientEmails.length > 0) {
            const { data: linkedProfiles } = await supabase
              .from("perfis")
              .select("id, email")
              .in("email", internalPatientEmails);

            (linkedProfiles || []).forEach((patientProfile: any) => {
              if (patientProfile.id) linkedIds.add(patientProfile.id);
            });
          }

          linkedPatientProfileIds = Array.from(linkedIds);
        }

        const linkedClinicalPatientsForPatient = !isPhysio
          ? await getLinkedClinicalPatients(data.id, data.email)
          : [];

        const patientTriageIds = !isPhysio
          ? Array.from(
              new Set(
                [
                  data.id,
                  user?.id,
                  ...linkedClinicalPatientsForPatient
                    .flatMap((patient: any) => [patient.id, patient.perfil_id])
                    .filter(Boolean),
                ]
                  .filter(Boolean)
                  .map(String),
              ),
            )
          : [];

        const linkedPhysioIdsForPatient = !isPhysio
          ? Array.from(
              new Set(
                linkedClinicalPatientsForPatient
                  .map((patient: any) => patient.fisioterapeuta_id)
                  .filter(Boolean)
                  .map(String),
              ),
            )
          : [];

        let realAppointmentsData: any[] = [];
        let patientRealAppointmentIds: string[] = [];

        if (isPhysio) {
          const { data: fetchedRealAppointments, error: fetchedRealAppointmentsError } = await supabase
            .from("agendamentos")
            .select("*")
            .eq("fisio_id", data.id)
            .in("status", REAL_APPOINTMENT_STATUSES);

          if (fetchedRealAppointmentsError) {
            console.error(
              "Erro ao buscar atendimentos reais do fisioterapeuta no dashboard:",
              fetchedRealAppointmentsError,
            );
          }

          realAppointmentsData = (fetchedRealAppointments || []).filter(hasRealConfirmedAppointment);
          agendamentoIds = realAppointmentsData.map((appointment: any) => appointment.id).filter(Boolean);
        }

        if (!isPhysio) {
          const {
            data: realPatientAppointments,
            error: realPatientAppointmentsError,
          } =
            patientTriageIds.length > 0
              ? await supabase
                  .from("agendamentos")
                  .select("*")
                  .in("paciente_id", patientTriageIds)
                  .in("status", REAL_APPOINTMENT_STATUSES)
              : await supabase
                  .from("agendamentos")
                  .select("*")
                  .eq("paciente_id", data.id)
                  .in("status", REAL_APPOINTMENT_STATUSES);

          if (realPatientAppointmentsError) {
            console.error(
              "Erro ao buscar consultas reais confirmadas do paciente no dashboard:",
              realPatientAppointmentsError,
            );
          }

          realAppointmentsData = (realPatientAppointments || []).filter(hasRealConfirmedAppointment);
          patientRealAppointmentIds = realAppointmentsData
            .map((appointment: any) => appointment.id)
            .filter(Boolean);
        }

        const patientTriagesCountQuery =
          patientTriageIds.length > 0
            ? supabase
                .from("triagens")
                .select("*", { count: "exact", head: true })
                .in("paciente_id", patientTriageIds)
            : supabase
                .from("triagens")
                .select("*", { count: "exact", head: true })
                .eq("paciente_id", data.id);

        const physioTriagesCountQuery =
          linkedPatientProfileIds.length > 0
            ? supabase
                .from("triagens")
                .select("*", { count: "exact", head: true })
                .in("paciente_id", linkedPatientProfileIds)
            : Promise.resolve({ count: 0 });

        const activityUserIds = Array.from(
          new Set([data.id, user?.id].filter(Boolean).map(String)),
        );
        const activityPatientIds = isPhysio
          ? linkedPatientProfileIds
          : patientTriageIds;

        const triagesListQuery = isPhysio
          ? linkedPatientProfileIds.length > 0
            ? supabase
                .from("triagens")
                .select("*")
                .in("paciente_id", linkedPatientProfileIds)
                .order("created_at", { ascending: false })
                .limit(5)
            : Promise.resolve({ data: [] })
          : patientTriageIds.length > 0
            ? supabase
                .from("triagens")
                .select("*")
                .in("paciente_id", patientTriageIds)
                .order("created_at", { ascending: false })
                .limit(5)
            : Promise.resolve({ data: [] });

        const queries = [
          isPhysio
            ? Promise.all([
                Promise.resolve({ count: realAppointmentsData.length }),
                supabase
                  .from("pacientes")
                  .select("*", { count: "exact", head: true })
                  .eq("fisioterapeuta_id", data.id),
                agendamentoIds.length > 0
                  ? supabase
                      .from("evolucoes")
                      .select("*", { count: "exact", head: true })
                      .in("atendimento_id", agendamentoIds)
                  : Promise.resolve({ count: 0 }),
                physioTriagesCountQuery,
              ])
            : Promise.all([
Promise.resolve({ count: realAppointmentsData.length }),
                patientRealAppointmentIds.length > 0
                  ? supabase
                      .from("evolucoes")
                      .select("*", { count: "exact", head: true })
                      .in("atendimento_id", patientRealAppointmentIds)
                  : Promise.resolve({ count: 0 }),
                patientTriagesCountQuery,
              ]),
          Promise.resolve({
            data: [...realAppointmentsData]
              .sort((a: any, b: any) => {
                const dateA = parseAppointmentDateTime(a)?.getTime() || 0;
                const dateB = parseAppointmentDateTime(b)?.getTime() || 0;
                return dateB - dateA;
              })
              .slice(0, 5),
          }),
          triagesListQuery,
          supabase
            .from("historico_atividades")
            .select("*")
            .in(
              "usuario_id",
              activityUserIds.length > 0 ? activityUserIds : [data.id],
            )
            .order("created_at", { ascending: false })
            .limit(12),
          isPhysio
            ? supabase
                .from("prontuarios")
                .select(
                  "id, created_at, updated_at, data_registro, tipo_atendimento, paciente_id, fisio_id",
                )
                .eq("fisio_id", data.id)
                .order("data_registro", { ascending: false })
                .limit(8)
            : activityPatientIds.length > 0
              ? supabase
                  .from("prontuarios")
                  .select(
                    "id, created_at, updated_at, data_registro, tipo_atendimento, paciente_id, fisio_id",
                  )
                  .in("paciente_id", activityPatientIds)
                  .order("data_registro", { ascending: false })
                  .limit(8)
              : Promise.resolve({ data: [] }),
          isPhysio
            ? agendamentoIds.length > 0
              ? supabase
                  .from("evolucoes")
                  .select(
                    "id, created_at, updated_at, data_evolucao, paciente_id, atendimento_id",
                  )
                  .in("atendimento_id", agendamentoIds)
                  .order("created_at", { ascending: false })
                  .limit(8)
              : Promise.resolve({ data: [] })
            : patientRealAppointmentIds.length > 0
              ? supabase
                  .from("evolucoes")
                  .select(
                    "id, created_at, updated_at, data_evolucao, paciente_id, atendimento_id",
                  )
                  .in("atendimento_id", patientRealAppointmentIds)
                  .order("created_at", { ascending: false })
                  .limit(8)
              : Promise.resolve({ data: [] }),
          activityPatientIds.length > 0
            ? supabase
                .from("registros_paciente")
                .select(
                  "id, created_at, data_registro, paciente_id, nivel_dor, notas, concluidos_count, total_exercicios",
                )
                .in("paciente_id", activityPatientIds)
                .order("data_registro", { ascending: false })
                .limit(40)
            : Promise.resolve({ data: [] }),
          activityPatientIds.length > 0
            ? supabase
                .from("checklist_exercicios")
                .select(
                  "id, created_at, updated_at, paciente_id, exercicio_id, concluido, data_conclusao",
                )
                .in("paciente_id", activityPatientIds)
                .order("data_conclusao", { ascending: false })
                .limit(120)
            : Promise.resolve({ data: [] }),
          activityPatientIds.length > 0
            ? supabase
                .from("exercicios_paciente")
                .select(
                  "id, created_at, updated_at, paciente_id, exercicio_nome, nome, status",
                )
                .in("paciente_id", activityPatientIds)
                .order("created_at", { ascending: false })
                .limit(8)
            : Promise.resolve({ data: [] }),
          isPhysio
            ? supabase
                .from("documentos_gerados")
                .select(
                  "id, created_at, updated_at, data_geracao, paciente_id, fisio_id, tipo_documento, tipo, titulo",
                )
                .eq("fisio_id", data.id)
                .order("created_at", { ascending: false })
                .limit(8)
            : activityPatientIds.length > 0
              ? supabase
                  .from("documentos_gerados")
                  .select(
                    "id, created_at, updated_at, data_geracao, paciente_id, fisio_id, tipo_documento, tipo, titulo",
                  )
                  .in("paciente_id", activityPatientIds)
                  .order("created_at", { ascending: false })
                  .limit(8)
              : Promise.resolve({ data: [] }),
        ];

        const results = await Promise.allSettled(queries as any[]);
        const statsResults = results[0];
        const apptsResult = results[1];
        const triagesResult = results[2];
        const activitiesResult = results[3];
        const prontuariosResult = results[4];
        const evolucoesResult = results[5];
        const registrosPacienteResult = results[6];
        const checklistExerciciosResult = results[7];
        const exerciciosPacienteResult = results[8];
        const documentosResult = results[9];

        let patientWorkoutsCount = 0;

        if (statsResults.status === "fulfilled") {
          const res = statsResults.value;
          if (isPhysio) {
            setStats({
              appointments: res[0].count || 0,
              patients: res[1].count || 0,
              records: res[2].count || 0,
              pendingTriages: res[3].count || 0,
              workouts: 0,
            });
          } else {
            const workoutsCount = await fetchPatientWorkoutCount(data);
            patientWorkoutsCount = workoutsCount;
            setStats({
              appointments: res[0].count || 0,
              patients: linkedPhysioIdsForPatient.length,
              records: res[1].count || 0,
              pendingTriages: res[2].count || 0,
              workouts: workoutsCount,
            });
          }
        }

        if (apptsResult.status === "fulfilled") {
          const appointmentsData = apptsResult.value.data || [];
          setRecentAppointments(
            appointmentsData.filter(hasRealConfirmedAppointment),
          );
        }

        let recentTriagesData =
          triagesResult.status === "fulfilled" && !triagesResult.value.error
            ? triagesResult.value.data || []
            : [];

        // Enriquecimento visual das triagens no dashboard do fisioterapeuta.
        // A tabela triagens pode não trazer join com perfis/pacientes; por isso buscamos
        // a foto/nome real do paciente sem alterar a lógica de listagem.
        if (isPhysio && recentTriagesData.length > 0) {
          const triagePatientIds = Array.from(
            new Set(
              recentTriagesData
                .map((triage: any) => triage.paciente_id)
                .filter(Boolean)
                .map(String),
            ),
          );

          if (triagePatientIds.length > 0) {
            const [profilePatientsResult, internalPatientsResult] =
              await Promise.allSettled([
                supabase
                  .from("perfis")
                  .select("id, nome_completo, email, avatar_url, foto_url")
                  .in("id", triagePatientIds),
                supabase
                  .from("pacientes")
                  .select(
                    "id, nome_completo, nome, email, avatar_url, foto_url",
                  )
                  .in("id", triagePatientIds),
              ]);

            const patientMap = new Map<string, any>();

            if (
              profilePatientsResult.status === "fulfilled" &&
              !profilePatientsResult.value.error
            ) {
              (profilePatientsResult.value.data || []).forEach(
                (patient: any) => {
                  patientMap.set(String(patient.id), patient);
                },
              );
            }

            if (
              internalPatientsResult.status === "fulfilled" &&
              !internalPatientsResult.value.error
            ) {
              (internalPatientsResult.value.data || []).forEach(
                (patient: any) => {
                  const current = patientMap.get(String(patient.id)) || {};
                  patientMap.set(String(patient.id), {
                    ...current,
                    ...patient,
                  });
                },
              );
            }

            recentTriagesData = recentTriagesData.map((triage: any) => {
              const realPatient = patientMap.get(String(triage.paciente_id));
              return realPatient
                ? {
                    ...triage,
                    paciente: { ...(triage.paciente || {}), ...realPatient },
                  }
                : triage;
            });
          }
        }
        const recentActivitiesData =
          activitiesResult && activitiesResult.status === "fulfilled"
            ? activitiesResult.value.data || []
            : [];
        const recentAppointmentsForActivity =
          apptsResult.status === "fulfilled"
            ? (apptsResult.value.data || []).filter(hasRealConfirmedAppointment)
            : [];
        const recentProntuariosData =
          prontuariosResult && prontuariosResult.status === "fulfilled"
            ? prontuariosResult.value.data || []
            : [];
        const recentEvolucoesData =
          evolucoesResult && evolucoesResult.status === "fulfilled"
            ? evolucoesResult.value.data || []
            : [];
        let recentRegistrosPacienteData =
          registrosPacienteResult &&
          registrosPacienteResult.status === "fulfilled" &&
          !registrosPacienteResult.value.error
            ? registrosPacienteResult.value.data || []
            : [];

        if (
          registrosPacienteResult &&
          registrosPacienteResult.status === "fulfilled" &&
          registrosPacienteResult.value.error
        ) {
          console.error(
            "Erro ao buscar registros_paciente no Dashboard:",
            registrosPacienteResult.value.error,
          );
        }

        // Segurança extra para o Dashboard do paciente:
        // se a busca geral não trouxer os registros, busca diretamente por todos os IDs possíveis.
        // No FisioCareHub existem registros antigos usando perfis.id/auth.uid() e registros
        // clínicos usando pacientes.id. O Dashboard precisa aceitar os dois formatos.
        if (!isPhysio && recentRegistrosPacienteData.length === 0) {
          const directPatientIds = Array.from(
            new Set(
              [
                data.id,
                user?.id,
                ...linkedClinicalPatientsForPatient
                  .flatMap((patient: any) => [patient.id, patient.perfil_id])
                  .filter(Boolean),
              ]
                .filter(Boolean)
                .map(String),
            ),
          );

          if (directPatientIds.length > 0) {
            // Select mínimo e compatível: evita quebrar caso a tabela não tenha
            // colunas opcionais como updated_at/exercicios_realizados em algum ambiente.
            const { data: directRegistros, error: directRegistrosError } = await supabase
              .from("registros_paciente")
              .select(
                "id, created_at, data_registro, paciente_id, nivel_dor, notas, concluidos_count, total_exercicios",
              )
              .in("paciente_id", directPatientIds)
              .order("data_registro", { ascending: false })
              .limit(40);

            if (directRegistrosError) {
              console.error(
                "Erro ao buscar registros diretos do paciente no dashboard:",
                directRegistrosError,
              );
            } else {
              recentRegistrosPacienteData = directRegistros || [];
            }
          }
        }
        const recentChecklistExerciciosData =
          checklistExerciciosResult &&
          checklistExerciciosResult.status === "fulfilled" &&
          !checklistExerciciosResult.value.error
            ? checklistExerciciosResult.value.data || []
            : [];
        const recentExerciciosPacienteData =
          exerciciosPacienteResult &&
          exerciciosPacienteResult.status === "fulfilled"
            ? exerciciosPacienteResult.value.data || []
            : [];
        const recentDocumentosData =
          documentosResult && documentosResult.status === "fulfilled"
            ? documentosResult.value.data || []
            : [];

        if (!isPhysio) {
          setWeeklyChartData(
            buildWeeklyChartData(
              recentRegistrosPacienteData,
              recentChecklistExerciciosData,
              patientWorkoutsCount,
            ),
          );
        }

        setRecentTriages(recentTriagesData);
        setActivities(
          buildDashboardActivities(
            recentActivitiesData,
            recentTriagesData,
            recentAppointmentsForActivity,
            recentProntuariosData,
            recentEvolucoesData,
            recentRegistrosPacienteData,
            recentExerciciosPacienteData,
            recentDocumentosData,
          ),
        );
      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
      } finally {
        setStatsLoading(false);
        setApptsLoading(false);
      }
    },
    [fetchPatientWorkoutCount, checkPendingEvaluations, user?.id],
  );

  useEffect(() => {
    const handlePatientProgressUpdated = () => {
      if (profile) fetchDashboardData(profile);
    };

    window.addEventListener("fisiocare:patient-progress-updated", handlePatientProgressUpdated);
    return () => window.removeEventListener("fisiocare:patient-progress-updated", handlePatientProgressUpdated);
  }, [fetchDashboardData, profile]);

  const { isPhysio, isApproved, isPro, isAdmin } = useMemo(
    () => ({
      isPhysio: profile?.tipo_usuario === "fisioterapeuta",
      isApproved: profile?.status_aprovacao === "aprovado",
      isPro: hasPlanAccess(getEffectivePlan(profile, subscription), "pro"),
      isAdmin:
        profile?.tipo_usuario === "admin" ||
        user?.email?.toLowerCase() === "hogolezcano92@gmail.com",
    }),
    [profile, subscription, user?.email],
  );

  const nextPatientAppointment = !isPhysio
    ? getUpcomingAppointment(recentAppointments)
    : null;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    } else if (profile) {
      if (isPhysio && !isApproved && !isAdmin) {
        navigate("/aguardando-aprovacao", { replace: true });
        return;
      }

      if (lastLoadedProfileId.current !== profile.id) {
        lastLoadedProfileId.current = profile.id;
        fetchDashboardData(profile);

        if (
          profile.tipo_usuario === "fisioterapeuta" &&
          profile.status_aprovacao === "aprovado" &&
          !profile.plan_intro_seen
        ) {
          setShowWelcome(true);
        }
      }

      const action = searchParams.get("action");
      if (action === "services") {
        const element = document.getElementById("financial-section");
        element?.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("open-financial-services"));
        }, 800);
      }
    }
  }, [
    user,
    profile,
    authLoading,
    navigate,
    fetchDashboardData,
    isPhysio,
    isApproved,
    isAdmin,
    searchParams,
  ]);

  useEffect(() => {
    if (authLoading || !user) return;

    const searchPatients = async () => {
      if (patientSearch.length < 3) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const { data, error } = await supabase
          .from("perfis")
          .select("*")
          .eq("tipo_usuario", "paciente")
          .or(
            `nome_completo.ilike.%${patientSearch}%,email.ilike.%${patientSearch}%`,
          )
          .limit(5);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (err) {
        console.error("Erro ao buscar pacientes:", err);
      } finally {
        setSearching(false);
      }
    };

    const timer = setTimeout(() => {
      if (patientSearch) searchPatients();
    }, 300);

    return () => clearTimeout(timer);
  }, [patientSearch, authLoading, user]);

  const getGreeting = () => {
    const offset = -3;
    const now = new Date();
    const brazilTime = new Date(
      now.getTime() + offset * 3600 * 1000 + now.getTimezoneOffset() * 60000,
    );
    const hour = brazilTime.getHours();
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  useEffect(() => {
    if (!profile || !isPhysio || authLoading || !user) return;

    setAiMessage(
      `Olá, Dr. ${profile.nome_completo.split(" ")[0]}. Notei que você tem atendimentos próximos no Morumbi. Deseja otimizar sua rota agora?`,
    );
  }, [profile, isPhysio, authLoading, user]);

  if (authLoading)
    return (
      <div className="min-h-screen pt-20 bg-[#0B1120] px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="flex items-center gap-6">
            <Skeleton className="w-20 h-20 rounded-2xl" />
            <div className="space-y-3 flex-1">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 rounded-2xl" />
              <Skeleton className="h-64 rounded-2xl" />
            </div>
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </div>
      </div>
    );

  return (
    <div className="dashboard-light-page patient-dashboard-shell min-h-screen -mt-4 md:-mt-8 pt-0 md:pt-0 pb-12 bg-background relative overflow-hidden transition-colors duration-500">
      <style>{`
        /* Dashboard: melhora o selo Story e força os ícones rápidos coloridos no tema claro sem alterar o dark mode */
        html:not(.dark) .dashboard-story-avatar > button,
        html.light .dashboard-story-avatar > button,
        body.light .dashboard-story-avatar > button,
        :root[data-theme="light"] .dashboard-story-avatar > button {
          background: linear-gradient(135deg, #ECFDF5 0%, #E0F2FE 100%) !important;
          border-color: rgba(16, 185, 129, 0.65) !important;
          color: #047857 !important;
          box-shadow: 0 12px 30px -22px rgba(5, 150, 105, 0.75) !important;
          opacity: 1 !important;
        }

        html:not(.dark) .dashboard-story-avatar > button:hover,
        html.light .dashboard-story-avatar > button:hover,
        body.light .dashboard-story-avatar > button:hover,
        :root[data-theme="light"] .dashboard-story-avatar > button:hover {
          background: linear-gradient(135deg, #D1FAE5 0%, #DBEAFE 100%) !important;
          color: #065F46 !important;
          border-color: rgba(59, 130, 246, 0.55) !important;
        }

        html:not(.dark) .dashboard-story-avatar > button::before,
        html.light .dashboard-story-avatar > button::before,
        body.light .dashboard-story-avatar > button::before,
        :root[data-theme="light"] .dashboard-story-avatar > button::before {
          content: '';
          display: inline-block;
          width: 6px;
          height: 6px;
          margin-right: 6px;
          border-radius: 999px;
          background: #10B981;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15);
          vertical-align: 1px;
        }

        html:not(.dark) .dashboard-quick-icon-purple,
        html.light .dashboard-quick-icon-purple,
        body.light .dashboard-quick-icon-purple,
        :root[data-theme="light"] .dashboard-quick-icon-purple {
          color: #7C3AED !important;
          stroke: #7C3AED !important;
        }

        html:not(.dark) .dashboard-quick-icon-blue,
        html.light .dashboard-quick-icon-blue,
        body.light .dashboard-quick-icon-blue,
        :root[data-theme="light"] .dashboard-quick-icon-blue {
          color: #2563EB !important;
          stroke: #2563EB !important;
        }

        html:not(.dark) .dashboard-quick-icon-green,
        html.light .dashboard-quick-icon-green,
        body.light .dashboard-quick-icon-green,
        :root[data-theme="light"] .dashboard-quick-icon-green {
          color: #16A34A !important;
          stroke: #16A34A !important;
        }

        html:not(.dark) .dashboard-quick-icon-orange,
        html.light .dashboard-quick-icon-orange,
        body.light .dashboard-quick-icon-orange,
        :root[data-theme="light"] .dashboard-quick-icon-orange {
          color: #EA580C !important;
          stroke: #EA580C !important;
        }

        html:not(.dark) .dashboard-quick-icon-emerald,
        html.light .dashboard-quick-icon-emerald,
        body.light .dashboard-quick-icon-emerald,
        :root[data-theme="light"] .dashboard-quick-icon-emerald {
          color: #059669 !important;
          stroke: #059669 !important;
        }

        html:not(.dark) .dashboard-quick-icon-amber,
        html.light .dashboard-quick-icon-amber,
        body.light .dashboard-quick-icon-amber,
        :root[data-theme="light"] .dashboard-quick-icon-amber {
          color: #D97706 !important;
          stroke: #D97706 !important;
        }
      `}</style>
      <div className="absolute -top-4 md:-top-8 inset-x-0 bottom-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="absolute -top-4 md:-top-8 inset-x-0 bottom-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.1),transparent_50%)] pointer-events-none"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 md:space-y-10 relative z-10">
        <header className={cn("mt-1 md:mt-2 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/5 backdrop-blur-3xl p-4 md:p-5 rounded-[2rem] border border-white/10 shadow-2xl shadow-blue-900/20 relative overflow-hidden", !isPhysio && "patient-card-purple")}>
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 blur-[60px] -mr-24 -mt-24 pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
            {!profile ? (
              <div className="w-16 h-16 bg-slate-800 animate-pulse rounded-full border-4 border-white/5" />
            ) : isPhysio ? (
              <StoryAvatar
                physioId={profile.id}
                name={profile.nome_completo}
                avatarUrl={
                  (profile as any).foto_url ||
                  profile.avatar_url ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`
                }
                sizeClassName="w-16 h-16"
                className="dashboard-story-avatar"
              />
            ) : (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <img
                  src={
                    profile.avatar_url ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`
                  }
                  alt={profile.nome_completo}
                  className="relative w-16 h-16 rounded-full border-4 border-white/10 shadow-2xl object-cover"
                />
                <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-emerald-500 border-[2px] border-[#0B1120] rounded-full shadow-lg z-10" />
              </div>
            )}

            <div className="space-y-0.5 flex-1">
              <div className="flex flex-col gap-0">
                <h1 className="text-lg md:text-xl font-black text-white tracking-tight opacity-90">
                  {getGreeting()},
                </h1>

                {!profile ? (
                  <span className="text-xl font-black animate-pulse text-slate-600">
                    Conectando...
                  </span>
                ) : (
                  <div className="flex flex-col leading-[0.9] pt-0.5">
                    {isPhysio && (
                      <span className="text-base md:text-lg font-black bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent uppercase tracking-tighter mb-0">
                        Dr.
                      </span>
                    )}

                    <div className="flex flex-col">
                      {profile.nome_completo
                        .split(" ")
                        .map((namePart, idx, arr) => (
                          <div
                            key={idx}
                            className="flex flex-wrap items-baseline gap-2"
                          >
                            <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent uppercase tracking-tighter break-all sm:break-normal">
                              {namePart}
                            </span>
                            {idx === arr.length - 1 && (
                              <div className="flex items-center gap-1.5 pb-0.5 self-end mb-0.5">
                                {isPro && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-[8px] font-black text-white uppercase tracking-widest rounded-full shadow-lg shadow-orange-500/20 border border-white/20 whitespace-nowrap">
                                    <Crown size={7} fill="currentColor" />
                                    Pro
                                  </span>
                                )}
                                {isPhysio ? (
                                  <span className="badge-physio !px-2 !py-0.5 !text-[9px] whitespace-nowrap">
                                    Fisioterapeuta
                                  </span>
                                ) : (
                                  <span className="badge-patient !px-2 !py-0.5 !text-[9px] whitespace-nowrap">
                                    Paciente
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <p className="text-slate-400 font-bold text-[10px] tracking-wide max-w-md">
                {isPhysio
                  ? "Bem-vindo a FisioCareHub, a sua plataforma de performance"
                  : "Bem-vindo a FisioCareHub, sua plataforma de reabilitação domiciliar e performance"}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-3 mt-2 lg:mt-0">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-[8px] uppercase tracking-[0.2em] bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">
              <Sparkles size={10} className="text-sky-500 animate-pulse" />
              {isPhysio ? "Gestão Profissional" : "Sua Jornada de Saúde"}
            </div>

            <div className="flex items-center gap-2">
              <button className="p-3 bg-white/5 rounded-xl text-slate-400 hover:text-sky-400 hover:bg-white/10 transition-all border border-white/5 shadow-inner group">
                <Bell size={18} className="group-hover:animate-swing" />
              </button>
              {!isPhysio && (
                <button
                  onClick={() => navigate("/triage")}
                  className="btn-primary-compact !px-4 !py-2 !text-xs !bg-sky-500 hover:!bg-sky-600"
                >
                  <Plus size={14} className="stroke-[3px]" />
                  Nova Triagem
                </button>
              )}
            </div>
          </div>
        </header>

        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-1 bg-gradient-to-r from-sky-600 via-indigo-600 to-cyan-600 rounded-2xl shadow-xl shadow-sky-900/30"
          >
            <div className="bg-card rounded-[0.95rem] p-5 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-sky-600/10 blur-[80px] -mr-24 -mt-24 rounded-full group-hover:bg-sky-600/20 transition-all duration-1000"></div>

              <div className="flex items-center gap-4 relative z-10">
                <div className="w-14 h-14 bg-sky-600/20 rounded-xl flex items-center justify-center text-sky-400 border border-sky-500/30">
                  <Smartphone size={28} className="animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight mb-1">
                    Novas Interfaces Mobile
                  </h2>
                  <p className="text-slate-400 text-xs font-medium max-w-md">
                    Criei a visualização side-by-side (Paciente vs
                    Fisioterapeuta) com os elementos fotorrealistas e wireframes
                    que você solicitou.
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate("/preview")}
                className="relative z-10 px-6 py-3 bg-white text-slate-950 rounded-xl font-black text-xs hover:scale-105 transition-all shadow-xl shadow-white/10 flex items-center gap-2 group/btn"
              >
                VER PRÉVIA AGORA
                <ChevronRight
                  size={16}
                  className="group-hover/btn:translate-x-1 transition-transform"
                />
              </button>
            </div>
          </motion.div>
        )}

        {isPhysio && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-3 gap-3"
          >
            <Link
              to="/patients"
              className="p-4 bg-white/5 backdrop-blur-xl rounded-2xl hover:bg-violet-600/10 group transition-all text-center space-y-1.5 border border-white/10 hover:border-violet-500/20 shadow-xl shadow-violet-900/10"
            >
              <Users
                className="dashboard-quick-icon-purple mx-auto transition-colors dark:text-slate-400 dark:group-hover:text-sky-400"
                size={24}
              />
              <p className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-500 group-hover:text-violet-700 dark:group-hover:text-sky-400 tracking-widest">
                Pacientes
              </p>
            </Link>
            <Link
              to="/agenda"
              className="p-4 bg-white/5 backdrop-blur-xl rounded-2xl hover:bg-sky-600/10 group transition-all text-center space-y-1.5 border border-white/10 hover:border-sky-500/20 shadow-xl shadow-sky-900/10"
            >
              <Calendar
                className="dashboard-quick-icon-blue mx-auto transition-colors dark:text-slate-400 dark:group-hover:text-sky-400"
                size={24}
              />
              <p className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-500 group-hover:text-sky-700 dark:group-hover:text-sky-400 tracking-widest">
                Agenda
              </p>
            </Link>
            <Link
              to="/exercises"
              className="p-4 bg-white/5 backdrop-blur-xl rounded-2xl hover:bg-emerald-600/10 group transition-all text-center space-y-1.5 border border-white/10 hover:border-emerald-500/20 shadow-xl shadow-emerald-900/10"
            >
              <Activity
                className="dashboard-quick-icon-green mx-auto transition-colors dark:text-slate-400 dark:group-hover:text-emerald-400"
                size={24}
              />
              <p className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-500 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 tracking-widest">
                Exercícios
              </p>
            </Link>
            <Link
              to="/records"
              className="p-4 bg-white/5 backdrop-blur-xl rounded-2xl hover:bg-orange-600/10 group transition-all text-center space-y-1.5 border border-white/10 hover:border-orange-500/20 shadow-xl shadow-orange-900/10"
            >
              <FileText
                className="dashboard-quick-icon-orange mx-auto transition-colors dark:text-slate-400 dark:group-hover:text-rose-400"
                size={24}
              />
              <p className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-500 group-hover:text-orange-700 dark:group-hover:text-rose-400 tracking-widest">
                Prontuários
              </p>
            </Link>
            <button
              onClick={() => {
                const element = document.getElementById("financial-section");
                element?.scrollIntoView({ behavior: "smooth" });
                window.dispatchEvent(
                  new CustomEvent("open-financial-services"),
                );
              }}
              className="p-4 bg-white/5 backdrop-blur-xl rounded-2xl hover:bg-emerald-600/10 group transition-all text-center space-y-1.5 border border-white/10 hover:border-emerald-500/20 shadow-xl shadow-emerald-900/10"
            >
              <DollarSign
                className="dashboard-quick-icon-emerald mx-auto transition-colors dark:text-slate-400 dark:group-hover:text-blue-400"
                size={24}
              />
              <p className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-500 group-hover:text-emerald-700 dark:group-hover:text-blue-400 tracking-widest">
                Financeiro
              </p>
            </button>
            <Link
              to="/dashboard/fisio?tab=avaliacoes"
              className="p-4 bg-white/5 backdrop-blur-xl rounded-2xl hover:bg-amber-600/10 group transition-all text-center space-y-1.5 border border-white/10 hover:border-amber-500/20 shadow-xl shadow-amber-900/10"
            >
              <Star
                className="dashboard-quick-icon-amber mx-auto transition-colors dark:text-slate-400 dark:group-hover:text-amber-400"
                size={24}
              />
              <p className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 tracking-widest">
                Reputação
              </p>
            </Link>
          </motion.div>
        )}

        {isPhysio && <ClinicalUpdatesCarousel />}

        <ProductStoreCarousel audience={isPhysio ? "physio" : "patient"} className={!isPhysio ? "patient-card-orange patient-store-card" : undefined} />

        {!isPhysio && (
          <div className="relative overflow-hidden rounded-[2rem] border border-violet-200/80 bg-gradient-to-br from-white via-violet-50/90 to-purple-100/80 p-4 shadow-2xl shadow-violet-300/20 ring-1 ring-white/80 dark:border-violet-400/25 dark:from-slate-950 dark:via-violet-950/45 dark:to-purple-950/35 dark:shadow-violet-950/30 dark:ring-violet-400/10 md:p-5">
            <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-violet-300/45 blur-3xl dark:bg-violet-500/20" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-fuchsia-200/60 blur-3xl dark:bg-fuchsia-500/15" />
            <div className="pointer-events-none absolute right-6 top-8 hidden h-32 w-56 rounded-full border border-white/40 opacity-60 dark:border-violet-200/10 sm:block" />
            <Sparkles className="pointer-events-none absolute right-14 top-9 text-violet-500/70 dark:text-violet-300/60" size={18} />
            <Sparkles className="pointer-events-none absolute right-8 top-16 text-purple-500/60 dark:text-purple-300/50" size={14} />

            <div className="relative flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-100 via-white to-purple-100 text-violet-800 shadow-inner shadow-violet-200/70 dark:border-violet-400/20 dark:from-violet-500/15 dark:via-violet-950/40 dark:to-purple-500/10 dark:text-violet-200">
                  <Route size={26} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.26em] text-violet-700 dark:text-violet-300">
                    Nova experiência
                  </p>
                  <h2 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-4xl">
                    Jornada de Recuperação
                  </h2>
                  <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-slate-700 dark:text-slate-300">
                    Acompanhe sua evolução, dor, exercícios e próximos passos em
                    uma tela exclusiva.
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate("/jornada")}
                className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-700 via-purple-700 to-violet-950 px-5 py-3.5 text-sm font-black text-white shadow-xl shadow-violet-700/25 transition-all hover:-translate-y-0.5 hover:shadow-violet-700/35 active:translate-y-0 dark:from-violet-500 dark:via-purple-600 dark:to-violet-800"
              >
                Abrir jornada
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="relative mt-4 grid grid-cols-3 gap-2 rounded-3xl border border-violet-200/80 bg-white/65 p-2 shadow-inner shadow-violet-100/80 backdrop-blur-xl dark:border-violet-400/15 dark:bg-white/5 dark:shadow-none">
              <div className="rounded-2xl bg-gradient-to-br from-white to-violet-100/90 p-3 text-center shadow-lg shadow-violet-200/40 ring-1 ring-violet-100 dark:from-violet-500/15 dark:to-purple-500/10 dark:shadow-none dark:ring-violet-400/15">
                <Activity
                  className="mx-auto mb-1 text-violet-700 dark:text-violet-300"
                  size={20}
                />
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-800 dark:text-slate-200">
                  Progresso
                </p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-white to-violet-100/90 p-3 text-center shadow-lg shadow-violet-200/40 ring-1 ring-violet-100 dark:from-violet-500/15 dark:to-purple-500/10 dark:shadow-none dark:ring-violet-400/15">
                <Zap
                  className="mx-auto mb-1 text-violet-700 dark:text-violet-300"
                  size={20}
                />
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-800 dark:text-slate-200">
                  Dor
                </p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-white to-violet-100/90 p-3 text-center shadow-lg shadow-violet-200/40 ring-1 ring-violet-100 dark:from-violet-500/15 dark:to-purple-500/10 dark:shadow-none dark:ring-violet-400/15">
                <Calendar
                  className="mx-auto mb-1 text-violet-700 dark:text-violet-300"
                  size={20}
                />
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-800 dark:text-slate-200">
                  Sessões
                </p>
              </div>
            </div>
          </div>
        )}

        {!isPhysio && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nextPatientAppointment ? (
              <div className="patient-card-green p-4 rounded-2xl flex items-center justify-between group hover:-translate-y-0.5 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-sky-500 text-white rounded-xl flex flex-col items-center justify-center shadow-lg shadow-sky-900/40">
                    <span className="text-[9px] font-black uppercase opacity-80">
                      {formatAppointmentMonth(nextPatientAppointment)}
                    </span>
                    <span className="text-xl font-black">
                      {formatAppointmentDay(nextPatientAppointment)}
                    </span>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-sky-400 uppercase tracking-[0.15em] mb-0.5">
                      Próxima Consulta
                    </p>
                    <p className="text-lg font-black text-white tracking-tight">
                      {getAppointmentProviderName(nextPatientAppointment)}
                    </p>
                    <p className="text-xs text-slate-400 font-bold">
                      {formatAppointmentTime(nextPatientAppointment)} •{" "}
                      <span className="text-sky-400">Presencial</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/appointments")}
                  className="p-3 bg-white/5 text-slate-400 rounded-xl group-hover:bg-sky-500 group-hover:text-white transition-all shadow-sm"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            ) : (
              <div className="patient-card-green p-4 rounded-2xl flex items-center justify-between group hover:-translate-y-0.5 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-sky-100 to-emerald-100 text-sky-700 rounded-xl flex items-center justify-center shadow-inner border border-sky-100 dark:from-sky-500/20 dark:to-emerald-500/20 dark:text-sky-300 dark:border-sky-400/15">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <p className="text-lg font-black text-white tracking-tight">
                      Agendar Consulta
                    </p>
                    <p className="text-xs text-slate-400 font-bold">
                      Você não tem consultas pendentes.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/triage")}
                  className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-emerald-400 text-white rounded-xl font-bold text-xs hover:brightness-105 transition-all shadow-lg shadow-sky-500/25"
                >
                  Agendar
                </button>
              </div>
            )}

            <div className="patient-card-blue p-5 rounded-2xl text-slate-950 flex items-center justify-around relative overflow-hidden group dark:text-white">
              <div className="absolute inset-0 bg-gradient-to-br from-sky-400/10 via-emerald-300/10 to-orange-300/10 opacity-70 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="text-center relative z-10">
                <p className="text-2xl font-black text-white">
                  {stats.records > 0 ? "75%" : "0%"}
                </p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                  Melhora
                </p>
              </div>
              <div className="w-px h-8 bg-white/10 relative z-10" />
              <div className="text-center relative z-10">
                <p className="text-2xl font-black text-white">
                  {stats.appointments}
                </p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                  Sessões
                </p>
              </div>
              <div className="w-px h-8 bg-white/10 relative z-10" />
              <div className="text-center relative z-10">
                <p className="text-2xl font-black text-white">
                  {stats.workouts}
                </p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                  Treinos
                </p>
              </div>
            </div>
          </div>
        )}

        {!isPhysio && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-white tracking-tight">
                Evolução da <span className="text-sky-400 italic">Dor</span>
              </h2>
              {weeklyChartData.melhora > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 rounded-full text-[9px] font-bold uppercase tracking-widest border border-emerald-500/20">
                  <TrendingUp size={10} />+{weeklyChartData.melhora}% de Melhora
                </div>
              )}
            </div>
            <div className="premium-card patient-card-blue">
              <EvolutionCharts
                painData={weeklyChartData.painData}
                exerciseData={weeklyChartData.exerciseData}
                melhora={weeklyChartData.melhora}
              />
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">
              Histórico de{" "}
              <span className="text-blue-400 italic">Atividades</span>
            </h2>
          </div>
          <div className="premium-card patient-card-purple">
            <ActivityTimeline activities={activities} mode={isPhysio ? "physio" : "patient"} />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[
            {
              label: "Consultas",
              value: stats.appointments,
              icon: Calendar,
              color: "sky",
              trend: "+12%",
              show: isPhysio || stats.appointments > 0,
            },
            {
              label: isPhysio ? "Pacientes" : "Fisioterapeutas",
              value: stats.patients,
              icon: Users,
              color: "emerald",
              trend: "+5%",
              show: isPhysio || stats.patients > 0,
            },
            {
              label: "Prontuários",
              value: stats.records,
              icon: FileText,
              color: "indigo",
              trend: "+8%",
              show: isPhysio || stats.records > 0,
            },
            {
              label: "Triagens",
              value: stats.pendingTriages,
              icon: Activity,
              color: "rose",
              trend: "0%",
              show: isPhysio || stats.pendingTriages > 0,
            },
          ]
            .filter((s) => s.show)
            .map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "group relative overflow-hidden !p-4 md:!p-6 rounded-2xl sm:rounded-3xl border backdrop-blur-xl shadow-xl transition-all duration-300 hover:-translate-y-0.5",
                  stat.color === "sky" && "bg-gradient-to-br from-sky-50 via-white to-blue-50 border-sky-100 shadow-sky-100/60 dark:from-sky-500/15 dark:via-white/[0.055] dark:to-blue-500/10 dark:border-sky-400/15 dark:shadow-sky-950/20",
                  stat.color === "emerald" && "bg-gradient-to-br from-emerald-50 via-white to-lime-50 border-emerald-100 shadow-emerald-100/60 dark:from-emerald-500/15 dark:via-white/[0.055] dark:to-lime-500/10 dark:border-emerald-400/15 dark:shadow-emerald-950/20",
                  stat.color === "indigo" && "bg-gradient-to-br from-orange-50 via-white to-amber-50 border-orange-100 shadow-orange-100/60 dark:from-orange-500/15 dark:via-white/[0.055] dark:to-amber-500/10 dark:border-orange-400/15 dark:shadow-orange-950/20",
                  stat.color === "rose" && "bg-gradient-to-br from-sky-50 via-white to-emerald-50 border-sky-100 shadow-sky-100/60 dark:from-sky-500/15 dark:via-white/[0.055] dark:to-emerald-500/10 dark:border-sky-400/15 dark:shadow-sky-950/20",
                )}
              >
                <div
                  className={cn(
                    "absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full opacity-[0.05] transition-transform group-hover:scale-110",
                    stat.color === "sky"
                      ? "bg-sky-600"
                      : stat.color === "emerald"
                        ? "bg-emerald-600"
                        : stat.color === "indigo"
                          ? "bg-indigo-600"
                          : "bg-rose-600",
                  )}
                />

                <div className="flex justify-between items-start mb-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all border border-white/5",
                      stat.color === "sky" &&
                        "bg-sky-500/10 text-sky-400 shadow-sky-900/20",
                      stat.color === "emerald" &&
                        "bg-emerald-500/10 text-emerald-400 shadow-emerald-900/20",
                      stat.color === "indigo" &&
                        "bg-orange-500/10 text-orange-500 dark:text-orange-300 shadow-orange-900/20",
                      stat.color === "rose" &&
                        "bg-sky-500/10 text-sky-500 dark:text-sky-300 shadow-sky-900/20",
                    )}
                  >
                    <stat.icon size={20} />
                  </div>
                  {stat.trend !== "0%" && (
                    <div
                      className={cn(
                        "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black tracking-tighter",
                        stat.trend.startsWith("+")
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-rose-500/10 text-rose-400",
                      )}
                    >
                      {stat.trend.startsWith("+") ? (
                        <ArrowUpRight size={8} />
                      ) : (
                        <ArrowDownRight size={8} />
                      )}
                      {stat.trend}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xl font-black text-white tracking-tight">
                    {stat.value}
                  </p>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                    {stat.label}
                  </p>
                </div>
              </motion.div>
            ))}
        </div>

        {isPhysio && (
          <div className="premium-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base font-black text-white tracking-tight">
                Buscar Pacientes
              </h3>
              <div className="relative w-full max-w-md">
                <div
                  className="absolute flex items-center pointer-events-none z-20"
                  style={{
                    left: "16px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "20px",
                    height: "20px",
                    color: "#94a3b8",
                  }}
                >
                  {searching ? (
                    <Loader2 className="animate-spin text-sky-500" size={18} />
                  ) : (
                    <Users size={18} style={{ color: "#94a3b8" }} />
                  )}
                </div>
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Nome ou e-mail..."
                  className="input-compact pr-4 !pl-[60px]"
                />
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                {searchResults.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => setSelectedPatientId(patient.id)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group",
                      selectedPatientId === patient.id
                        ? "bg-sky-600/10 border-sky-500 shadow-lg shadow-sky-900/20"
                        : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          patient.avatar_url ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${patient.id}`
                        }
                        alt={patient.nome_completo}
                        className="w-10 h-10 rounded-lg object-cover border border-white/10"
                      />
                      <div>
                        <p
                          className={cn(
                            "text-sm font-bold transition-colors",
                            selectedPatientId === patient.id
                              ? "text-sky-400"
                              : "text-white group-hover:text-sky-400",
                          )}
                        >
                          {patient.nome_completo}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {patient.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedPatientId === patient.id && (
                        <div className="px-2 py-0.5 bg-sky-600 text-white text-[8px] font-black rounded-full uppercase tracking-widest">
                          Selecionado
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/physio/${patient.id}`);
                        }}
                        className="p-2 bg-white/10 text-sky-400 rounded-lg shadow-sm hover:bg-sky-600 hover:text-white transition-all border border-white/5"
                      >
                        <User size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {patientSearch.length >= 3 &&
              searchResults.length === 0 &&
              !searching && (
                <p className="text-center text-slate-500 py-2 text-xs">
                  Nenhum paciente encontrado para \"{patientSearch}\"
                </p>
              )}
          </div>
        )}

        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">
                Consultas <span className="text-blue-400 italic">Recentes</span>
              </h2>
              <Link
                to={isPhysio ? "/agenda?view=all" : "/appointments"}
                className="text-xs font-bold text-blue-400 hover:underline flex items-center gap-1"
              >
                Ver todas <ChevronRight size={12} />
              </Link>
            </div>

            <div className="premium-card !p-0 overflow-hidden patient-card-blue">
              {apptsLoading ? (
                <div className="p-4">
                  <ListSkeleton count={3} />
                </div>
              ) : recentAppointments.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-10 h-10 bg-white/5 text-slate-500 rounded-full flex items-center justify-center mx-auto border border-white/5">
                    <Calendar size={20} />
                  </div>
                  <p className="text-slate-500 text-[10px] font-medium">
                    Nenhuma consulta agendada.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {recentAppointments.map((appt) => (
                    <div
                      key={appt.id}
                      onClick={() =>
                        navigate(
                          isPhysio
                            ? `/agenda?agendamento_id=${appt.id}`
                            : `/appointments?id=${appt.id}`,
                        )
                      }
                      className="p-3.5 flex items-center justify-between hover:bg-white/5 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-600/10 text-blue-400 rounded-lg flex items-center justify-center font-black text-xs border border-blue-500/20">
                          {formatAppointmentDay(appt)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                            {isPhysio
                              ? appt.nome_paciente ||
                                appt.paciente?.nome_completo ||
                                "Paciente"
                              : appt.nome_fisioterapeuta ||
                                appt.fisioterapeuta?.nome_completo ||
                                "Fisioterapeuta"}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                            <span className="flex items-center gap-1">
                              <Clock size={9} />
                              {formatAppointmentTime(appt)}
                            </span>
                            <span className="w-0.5 h-0.5 bg-white/10 rounded-full"></span>
                            <span
                              className={cn(
                                "capitalize px-1.5 py-0.5 rounded text-[8px] font-black",
                                appt.status === "confirmado"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : appt.status === "pendente"
                                    ? "bg-amber-500/20 text-amber-400"
                                    : "bg-slate-500/20 text-slate-400",
                              )}
                            >
                              {appt.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="p-1 text-slate-500 group-hover:text-blue-400 group-hover:bg-white/5 rounded-lg transition-all">
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">
                  {isPhysio ? (
                    <>
                      Triagens{" "}
                      <span className="text-indigo-400 italic">
                        Inteligentes
                      </span>
                    </>
                  ) : (
                    <>
                      Suas{" "}
                      <span className="text-indigo-400 italic">Triagens</span>
                    </>
                  )}
                </h2>
                <Link
                  to={isPhysio ? "/records" : "/triage"}
                  className="text-xs font-bold text-indigo-400 hover:underline flex items-center gap-1"
                >
                  {isPhysio ? "Ver todas" : "Ver histórico"}{" "}
                  <ChevronRight size={12} />
                </Link>
              </div>

              <div className="premium-card !p-0 overflow-hidden patient-card-purple">
                {recentTriages.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <div className="w-10 h-10 bg-white/5 text-slate-500 rounded-full flex items-center justify-center mx-auto border border-white/5">
                      <BrainCircuit size={20} />
                    </div>
                    <p className="text-slate-500 text-[10px] font-medium">
                      Nenhuma triagem recente.
                    </p>
                    {!isPhysio && (
                      <button
                        onClick={() => navigate("/triage")}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-full font-bold text-[9px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/40"
                      >
                        Fazer triagem
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {recentTriages.map((triage) => (
                      <div
                        key={triage.id}
                        className="p-3.5 hover:bg-white/5 transition-colors group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                isPhysio
                                  ? triage.paciente?.foto_url ||
                                    triage.paciente?.avatar_url ||
                                    triage.foto_url ||
                                    triage.avatar_url ||
                                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${triage.paciente_id}`
                                  : profile?.foto_url ||
                                    profile?.avatar_url ||
                                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`
                              }
                              alt={
                                isPhysio
                                  ? triage.paciente?.nome_completo ||
                                    triage.paciente?.nome ||
                                    triage.nome_paciente ||
                                    "Paciente"
                                  : profile?.nome_completo || "Paciente"
                              }
                              className="w-9 h-9 rounded-lg object-cover border border-white/10"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <p className="text-sm font-bold text-white">
                                {isPhysio
                                  ? triage.paciente?.nome_completo ||
                                    triage.paciente?.nome ||
                                    triage.nome_paciente ||
                                    "Paciente"
                                  : `${triage.regiao_dor || "Sua triagem"}${triage.tempo_sintomas ? ` • ${triage.tempo_sintomas}` : ""}`}
                              </p>
                              <p className="text-[9px] text-slate-500 font-medium">
                                {formatDate(triage.created_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full text-[7px] font-black uppercase tracking-widest border border-indigo-500/20">
                              {triage.classificacao}
                            </span>
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border",
                                triage.gravidade === "grave"
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                              )}
                            >
                              {triage.gravidade}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 text-[9px] text-slate-400 font-medium">
                            <span className="flex items-center gap-1">
                              <MapPin size={10} /> {triage.regiao_dor}
                            </span>
                            <span className="flex items-center gap-1">
                              <Thermometer size={10} /> Dor {triage.escala_dor}
                              /10
                            </span>
                            {triage.red_flag && (
                              <span className="flex items-center gap-1 text-rose-400 font-bold">
                                <AlertTriangle size={10} /> Red Flag!
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              navigate(
                                isPhysio
                                  ? `/records?patient=${triage.paciente_id}`
                                  : "/triage",
                              )
                            }
                            className="p-1 text-slate-500 hover:text-indigo-400 hover:bg-white/5 rounded-lg transition-all"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-8 overflow-hidden">
            {isPhysio && <ClinicalAssistant isPhysio={isPhysio} />}
            {!isPhysio && (
              <motion.div
                layout
                className={cn(
                  "relative overflow-hidden rounded-[2rem] border border-violet-200/80 bg-gradient-to-br from-white via-violet-50/95 to-purple-100/85 p-5 text-slate-950 shadow-2xl shadow-violet-300/20 ring-1 ring-white/80 dark:border-violet-400/25 dark:from-slate-950 dark:via-violet-950/45 dark:to-purple-950/35 dark:text-white dark:shadow-violet-950/30 dark:ring-violet-400/10 md:p-6",
                  isAiExpanded ? "lg:col-span-1 h-auto" : "h-fit",
                )}
              >
                <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-300/45 blur-3xl dark:bg-violet-500/20" />
                <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-fuchsia-200/60 blur-3xl dark:bg-fuchsia-500/15" />
                <div className="pointer-events-none absolute inset-x-10 top-[7.9rem] h-px bg-gradient-to-r from-transparent via-violet-300 to-transparent dark:via-violet-400/30" />
                <Sparkles className="pointer-events-none absolute left-1/2 top-[7.45rem] -translate-x-1/2 text-violet-500/70 dark:text-violet-300/60" size={18} />

                <div className="relative z-10 space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-4">
                      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-100 via-white to-purple-100 text-violet-900 shadow-inner shadow-violet-200/70 dark:border-violet-400/20 dark:from-violet-500/15 dark:via-violet-950/40 dark:to-purple-500/10 dark:text-violet-200">
                        <BrainCircuit size={24} />
                        <Sparkles className="absolute -bottom-1 -right-1 text-violet-500 dark:text-violet-300" size={14} />
                      </div>
                      <div className="min-w-0 pt-1">
                        <h3 className="flex flex-wrap items-center gap-2 text-2xl font-black tracking-tight text-violet-950 dark:text-white">
                          Assistente Viva
                          <span className="flex h-2.5 w-2.5 rounded-full bg-violet-600 shadow-lg shadow-violet-500/40 dark:bg-violet-300" />
                        </h3>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600 dark:text-violet-100/80">
                          Seu assistente inteligente para te apoiar na sua recuperação.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAiExpanded((value) => !value)}
                      aria-label={isAiExpanded ? "Recolher assistente" : "Expandir assistente"}
                      className="rounded-full p-2 text-violet-950 transition-all hover:bg-violet-100 dark:text-violet-100 dark:hover:bg-white/10"
                    >
                      <ChevronRight
                        size={20}
                        className={cn("transition-transform", isAiExpanded ? "-rotate-90" : "rotate-90")}
                      />
                    </button>
                  </div>

                  {isAiExpanded && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4 pt-4"
                    >
                      <div className="space-y-3 rounded-3xl border border-violet-200/80 bg-white/60 p-3 shadow-inner shadow-violet-100/80 backdrop-blur-xl dark:border-violet-400/15 dark:bg-white/5 dark:shadow-none">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-700 dark:text-violet-300">
                          Sugestões
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          <button
                            onClick={() => navigate("/treinos")}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-2 text-[11px] font-black text-violet-900 shadow-lg shadow-violet-200/40 transition-all hover:-translate-y-0.5 hover:border-violet-400 hover:text-violet-700 dark:border-violet-400/20 dark:bg-white/10 dark:text-violet-100 dark:shadow-none"
                          >
                            <Activity size={14} />
                            Treino de Hoje
                          </button>
                          <button
                            onClick={() => navigate("/diario")}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-2 text-[11px] font-black text-violet-900 shadow-lg shadow-violet-200/40 transition-all hover:-translate-y-0.5 hover:border-violet-400 hover:text-violet-700 dark:border-violet-400/20 dark:bg-white/10 dark:text-violet-100 dark:shadow-none"
                          >
                            <Zap size={14} />
                            Relatar Dor
                          </button>
                          <button
                            onClick={() => navigate("/treinos")}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-2 text-[11px] font-black text-violet-900 shadow-lg shadow-violet-200/40 transition-all hover:-translate-y-0.5 hover:border-violet-400 hover:text-violet-700 dark:border-violet-400/20 dark:bg-white/10 dark:text-violet-100 dark:shadow-none"
                          >
                            <FileText size={14} />
                            Ver Exercícios
                          </button>
                          <button
                            onClick={() => navigate("/appointments")}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-2 text-[11px] font-black text-violet-900 shadow-lg shadow-violet-200/40 transition-all hover:-translate-y-0.5 hover:border-violet-400 hover:text-violet-700 dark:border-violet-400/20 dark:bg-white/10 dark:text-violet-100 dark:shadow-none"
                          >
                            <Calendar size={14} />
                            Próxima Sessão
                          </button>
                          <button
                            onClick={() => navigate("/chat")}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-2 text-[11px] font-black text-violet-900 shadow-lg shadow-violet-200/40 transition-all hover:-translate-y-0.5 hover:border-violet-400 hover:text-violet-700 dark:border-violet-400/20 dark:bg-white/10 dark:text-violet-100 dark:shadow-none"
                          >
                            <MessageSquare size={14} />
                            Falar com IA
                          </button>
                          <button
                            onClick={() => navigate("/jornada")}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-2 text-[11px] font-black text-violet-900 shadow-lg shadow-violet-200/40 transition-all hover:-translate-y-0.5 hover:border-violet-400 hover:text-violet-700 dark:border-violet-400/20 dark:bg-white/10 dark:text-violet-100 dark:shadow-none"
                          >
                            <TrendingUp size={14} />
                            Minha Evolução
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Pergunte algo..."
                          className="min-w-0 flex-1 rounded-2xl border border-violet-200 bg-white/85 px-4 py-3 text-sm font-semibold text-violet-950 placeholder-violet-300 shadow-lg shadow-violet-200/30 outline-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-violet-400/20 dark:bg-white/10 dark:text-white dark:placeholder-violet-200/40 dark:shadow-none"
                        />
                        <button className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-violet-200 bg-white text-violet-800 shadow-lg shadow-violet-200/40 transition-all hover:-translate-y-0.5 hover:bg-violet-50 dark:border-violet-400/20 dark:bg-white/10 dark:text-violet-100 dark:shadow-none">
                          <ArrowUpRight size={22} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {!isAiExpanded && (
                    <button
                      onClick={() => navigate("/triage")}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-700 via-purple-700 to-violet-950 py-3 text-sm font-black text-white shadow-xl shadow-violet-700/25 transition-all hover:-translate-y-0.5 dark:from-violet-500 dark:via-purple-600 dark:to-violet-800"
                    >
                      Iniciar Triagem
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <div className="space-y-10">
          {isPhysio ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-white tracking-tight">
                  Recursos Profissionais
                </h2>
                <div className="flex items-center gap-2">
                  <select className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[8px] font-bold text-slate-400 uppercase tracking-widest outline-none focus:ring-1 focus:ring-blue-500 transition-all">
                    <option>Semana</option>
                    <option>Mês</option>
                  </select>
                  {!isPro && (
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[7px] font-black uppercase tracking-widest rounded-full border border-amber-500/20">
                      Pro
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <ProGuard
                  variant="full"
                  className="xl:col-span-1 md:col-span-2"
                >
                  <div
                    id="financial-section"
                    className="bg-card/50 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl shadow-premium/20 relative group h-full"
                  >
                    <FinancialDashboard />
                  </div>
                </ProGuard>

                <ProGuard variant="full">
                  <div className="bg-card/50 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl shadow-premium/20 relative group h-full">
                    <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded-full text-[7px] font-black uppercase tracking-widest border border-blue-500/20">
                        <MapPin size={8} />3 Pacientes
                      </div>
                    </div>
                    <RouteOptimizer />
                  </div>
                </ProGuard>

                <div className="bg-card/50 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl shadow-premium/20">
                  <SOAPIntelligentRecord
                    pacienteId={selectedPatientId || undefined}
                    onSave={() => {
                      fetchDashboardData(profile);
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">
                  <div className="patient-card-blue p-4 rounded-2xl">
                    <PainDiary onSaved={() => fetchDashboardData(profile)} />
                  </div>
                  <div className="patient-card-green p-4 rounded-2xl">
                    <ExerciseChecklist onUpdated={() => fetchDashboardData(profile)} />
                  </div>
                </div>
                <div className="space-y-5">
                  <div className="patient-card-purple p-5 rounded-2xl space-y-3.5">
                    <h3 className="text-base font-black text-slate-950 dark:text-white">
                      Ações Rápidas
                    </h3>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Link
                        to="/chat"
                        className="patient-subcard-purple p-3 rounded-2xl text-center space-y-1 shadow-sm hover:-translate-y-0.5 group transition-all"
                      >
                        <MessageSquare
                          className="mx-auto text-sky-600 dark:text-sky-300 group-hover:scale-110 transition-all"
                          size={20}
                        />
                        <p className="text-[8px] font-black uppercase text-slate-500 group-hover:text-blue-400">
                          Chat
                        </p>
                      </Link>
                      <Link
                        to="/treinos"
                        className="patient-subcard-purple p-3 rounded-2xl text-center space-y-1 shadow-sm hover:-translate-y-0.5 group transition-all"
                      >
                        <Activity
                          className="mx-auto text-emerald-600 dark:text-emerald-300 group-hover:scale-110 transition-all"
                          size={20}
                        />
                        <p className="text-[8px] font-black uppercase text-slate-500 group-hover:text-emerald-400">
                          Treinos
                        </p>
                      </Link>
                      <button
                        onClick={() =>
                          window.open(
                            `https://meet.jit.si/FisioCareHub-${profile?.id || "room"}`,
                            "_blank",
                          )
                        }
                        className="patient-subcard-purple p-3 rounded-2xl text-center space-y-1 shadow-sm hover:-translate-y-0.5 group transition-all"
                      >
                        <Video
                          className="mx-auto text-orange-600 dark:text-orange-300 group-hover:scale-110 transition-all"
                          size={20}
                        />
                        <p className="text-[8px] font-black uppercase text-slate-500 group-hover:text-sky-400">
                          Consulta
                        </p>
                      </button>
                      <Link
                        to="/triage"
                        className="patient-subcard-purple p-3 rounded-2xl text-center space-y-1 shadow-sm hover:-translate-y-0.5 group transition-all"
                      >
                        <BrainCircuit
                          className="mx-auto text-blue-600 dark:text-blue-300 group-hover:scale-110 transition-all"
                          size={20}
                        />
                        <p className="text-[8px] font-black uppercase text-slate-500 group-hover:text-indigo-400">
                          Triagem
                        </p>
                      </Link>
                    </div>
                  </div>

                  <div className="patient-card-orange p-5 rounded-2xl space-y-3.5">
                    <h3 className="text-base font-black text-slate-950 dark:text-white flex items-center gap-2">
                      <Trophy className="text-amber-500" size={18} />
                      Conquistas
                    </h3>
                    <div className="space-y-2.5">
                      {[
                        {
                          label: "Bronze",
                          desc: "7 dias ativos",
                          icon: Medal,
                          color:
                            "text-amber-500 bg-amber-500/10 border-amber-500/20",
                          progress: stats.records > 0 ? 100 : 0,
                        },
                        {
                          label: "Foco",
                          desc: "Triagem feita",
                          icon: Zap,
                          color:
                            "text-blue-400 bg-blue-500/10 border-blue-500/20",
                          progress: stats.pendingTriages > 0 ? 100 : 0,
                        },
                        {
                          label: "Superação",
                          desc: "50% menos dor",
                          icon: Star,
                          color:
                            "text-purple-400 bg-purple-500/10 border-purple-500/20",
                          progress: stats.records > 5 ? 40 : 0,
                        },
                      ].map((badge, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center gap-2.5 p-2.5 rounded-xl border transition-all shadow-sm",
                            i === 0 && "bg-orange-50 border-orange-100 hover:border-orange-200 dark:bg-orange-500/10 dark:border-orange-400/15",
                            i === 1 && "bg-orange-50 border-orange-100 hover:border-orange-200 dark:bg-orange-500/10 dark:border-orange-400/15",
                            i === 2 && "bg-orange-50 border-orange-100 hover:border-orange-200 dark:bg-orange-500/10 dark:border-orange-400/15",
                          )}
                        >
                          <div
                            className={cn(
                              "w-9 h-9 rounded-lg flex items-center justify-center shadow-sm border shrink-0",
                              badge.color,
                              badge.progress === 0 && "grayscale opacity-30",
                            )}
                          >
                            <badge.icon size={18} />
                          </div>
                          <div className="flex-1 space-y-0.5">
                            <p className="text-[11px] font-black text-white">
                              {badge.label}
                            </p>
                            <p className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">
                              {badge.desc}
                            </p>
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full transition-all duration-1000",
                                  badge.color
                                    .split(" ")[0]
                                    .replace("text-", "bg-"),
                                )}
                                style={{ width: `${badge.progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <FloatingHelpMenu />
      {showWelcome && (
        <ApprovalWelcomeModal onClose={() => setShowWelcome(false)} />
      )}

      {user && pendingEvaluation && (
        <EvaluationModal
          isOpen={showEvaluation}
          onClose={() => setShowEvaluation(false)}
          appointment={pendingEvaluation}
          userId={profile?.id || user.id}
          onSuccess={() => {
            fetchDashboardData(profile);
          }}
        />
      )}
    </div>
  );
}
