import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowUpRight,
  BrainCircuit,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  MessageSquare,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { kineAIService } from '../../services/kineAI';
import { useAuth } from '../../contexts/AuthContext';

interface ClinicalAssistantProps {
  isPhysio: boolean;
}

type AnyRecord = Record<string, any>;

type ClinicalInsights = {
  statusDay: string;
  alerts: string[];
  suggestions: string[];
  nextPatientSummary?: string;
  daySummary?: string;
};

type PatientInfo = {
  id: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
};

const ACTIVE_APPOINTMENT_STATUSES = new Set([
  'agendado',
  'confirmado',
  'pago',
  'pendente',
  'pendente_pagamento'
]);

const FAILURE_STATUSES = new Set(['cancelado', 'cancelada', 'falta', 'faltou', 'no_show']);

const normalizeStatus = (status?: string | null) => String(status || '').toLowerCase().trim();

const formatDateOnly = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTime = (appointment: AnyRecord) => {
  const rawTime = appointment.hora || appointment.data_servico || appointment.data;

  if (!rawTime) return 'Horário não informado';

  if (typeof rawTime === 'string' && /^\d{2}:\d{2}/.test(rawTime)) {
    return rawTime.slice(0, 5);
  }

  const parsed = new Date(rawTime);
  if (Number.isNaN(parsed.getTime())) return String(rawTime).slice(0, 5);

  return parsed.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getAppointmentDate = (appointment: AnyRecord) => {
  const source = appointment.data_servico || appointment.data || appointment.created_at;
  const date = source ? new Date(source) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const getPatientNameFromRecord = (record?: AnyRecord | null) => {
  if (!record) return null;
  return (
    record.nome_completo ||
    record.nome ||
    record.name ||
    record.full_name ||
    record.email ||
    null
  );
};

const unique = <T,>(items: T[]) => Array.from(new Set(items.filter(Boolean)));

export default function ClinicalAssistant({ isPhysio }: ClinicalAssistantProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [insights, setInsights] = useState<ClinicalInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assistantQuestion, setAssistantQuestion] = useState('');
  const [assistantAnswer, setAssistantAnswer] = useState<string | null>(null);
  const [assistantLoading, setAssistantLoading] = useState(false);

  const fetchPatientMaps = useCallback(async (patientIds: string[]) => {
    const ids = unique(patientIds);
    const patientMap = new Map<string, PatientInfo>();

    if (ids.length === 0) return patientMap;

    const [profilePatientsResult, internalPatientsResult] = await Promise.allSettled([
      supabase.from('perfis').select('*').in('id', ids),
      supabase.from('pacientes').select('*').in('id', ids)
    ]);

    if (profilePatientsResult.status === 'fulfilled') {
      const { data } = profilePatientsResult.value;
      (data || []).forEach((patient: AnyRecord) => {
        patientMap.set(patient.id, {
          id: patient.id,
          name: getPatientNameFromRecord(patient) || 'Paciente sem nome',
          email: patient.email,
          avatarUrl: patient.avatar_url || patient.foto_url || null
        });
      });
    }

    if (internalPatientsResult.status === 'fulfilled') {
      const { data } = internalPatientsResult.value;
      (data || []).forEach((patient: AnyRecord) => {
        patientMap.set(patient.id, {
          id: patient.id,
          name: getPatientNameFromRecord(patient) || 'Paciente sem nome',
          email: patient.email,
          avatarUrl: patient.avatar_url || patient.foto_url || null
        });
      });
    }

    return patientMap;
  }, []);

  const buildLocalInsights = useCallback((params: {
    todayAppointments: AnyRecord[];
    nextAppointment?: AnyRecord | null;
    recentFailures: AnyRecord[];
    completedWithoutEvolution: AnyRecord[];
    totalPatients: number;
    patientMap: Map<string, PatientInfo>;
  }): ClinicalInsights => {
    const {
      todayAppointments,
      nextAppointment,
      recentFailures,
      completedWithoutEvolution,
      totalPatients,
      patientMap
    } = params;

    const activeToday = todayAppointments.filter((appointment) => {
      const status = normalizeStatus(appointment.status);
      return status !== 'cancelado' && status !== 'cancelada';
    });

    const remainingToday = activeToday.filter((appointment) => normalizeStatus(appointment.status) !== 'concluido');
    const alerts: string[] = [];
    const suggestions: string[] = [];

    const statusDay = activeToday.length === 0
      ? 'Nenhum atendimento agendado para hoje.'
      : activeToday.length === 1
        ? `Você tem 1 atendimento hoje, às ${formatTime(activeToday[0])}.`
        : `Você tem ${activeToday.length} atendimentos hoje. ${remainingToday.length} ainda ${remainingToday.length === 1 ? 'está pendente' : 'estão pendentes'}.`;

    const missingByPatient = completedWithoutEvolution.reduce<Record<string, number>>((acc, appointment) => {
      const patientId = appointment.paciente_id;
      if (!patientId) return acc;
      acc[patientId] = (acc[patientId] || 0) + 1;
      return acc;
    }, {});

    Object.entries(missingByPatient)
      .filter(([, count]) => count >= 1)
      .slice(0, 3)
      .forEach(([patientId, count]) => {
        const patientName = patientMap.get(patientId)?.name || 'paciente vinculado';
        alerts.push(
          count >= 2
            ? `Alerta de prontuário: ${count} atendimentos concluídos sem evolução registrada para ${patientName}.`
            : `Alerta de prontuário: 1 atendimento concluído sem evolução registrada para ${patientName}.`
        );
        suggestions.push(`Revisar prontuário de ${patientName} e registrar evolução clínica.`);
      });

    const failuresByPatient = recentFailures.reduce<Record<string, number>>((acc, appointment) => {
      const patientId = appointment.paciente_id;
      if (!patientId) return acc;
      acc[patientId] = (acc[patientId] || 0) + 1;
      return acc;
    }, {});

    Object.entries(failuresByPatient)
      .filter(([, count]) => count >= 2)
      .slice(0, 2)
      .forEach(([patientId, count]) => {
        const patientName = patientMap.get(patientId)?.name || 'paciente vinculado';
        alerts.push(`Alerta de comparecimento: ${patientName} teve ${count} cancelamentos ou faltas recentes.`);
        suggestions.push(`Entrar em contato com ${patientName} para confirmar adesão ao tratamento.`);
      });

    if (activeToday.length === 0) {
      suggestions.push('Usar a janela livre para revisar prontuários, evoluções pendentes ou entrar em contato com pacientes inativos.');
    } else if (totalPatients >= 3 && activeToday.length <= 1) {
      suggestions.push('Avaliar oportunidades de preencher horários livres com retornos ou pacientes em acompanhamento.');
    }

    if (suggestions.length === 0) {
      suggestions.push('Agenda sem pendências críticas. Mantenha os prontuários atualizados ao final de cada atendimento.');
    }

    const nextPatient = nextAppointment?.paciente_id
      ? patientMap.get(nextAppointment.paciente_id)
      : null;

    const nextPatientSummary = nextAppointment && nextPatient
      ? `Próxima consulta: ${nextPatient.name}, às ${formatTime(nextAppointment)}${nextAppointment.servico ? ` — ${nextAppointment.servico}` : ''}.`
      : 'Sem próximo paciente agendado.';

    return {
      statusDay,
      alerts,
      suggestions: unique(suggestions).slice(0, 4),
      nextPatientSummary,
      daySummary: activeToday.length > 0
        ? `Dia com ${activeToday.length} atendimento(s) e ${alerts.length} alerta(s) clínico(s).`
        : 'Dia sem atendimentos agendados.'
    };
  }, []);

  const fetchClinicalDataAndGenerateInsights = useCallback(async () => {
    if (!user || !isPhysio) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const today = formatDateOnly(now);
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(startOfToday);
      endOfToday.setDate(endOfToday.getDate() + 1);
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // A tabela agendamentos já apareceu no projeto com data_servico, data e hora.
      // A busca principal usa data_servico; se o banco estiver com dados antigos, cai para data.
      let todayAppointments: AnyRecord[] = [];
      const todayByServiceDate = await supabase
        .from('agendamentos')
        .select('*')
        .eq('fisio_id', user.id)
        .gte('data_servico', startOfToday.toISOString())
        .lt('data_servico', endOfToday.toISOString())
        .order('data_servico', { ascending: true });

      if (!todayByServiceDate.error && todayByServiceDate.data) {
        todayAppointments = todayByServiceDate.data;
      } else {
        const todayByDate = await supabase
          .from('agendamentos')
          .select('*')
          .eq('fisio_id', user.id)
          .eq('data', today)
          .order('hora', { ascending: true });

        if (todayByDate.error) throw todayByDate.error;
        todayAppointments = todayByDate.data || [];
      }

      const [{ data: upcomingAppointments }, { data: recentFailures }, { data: completedAppts }, { data: totalPatients }] = await Promise.all([
        supabase
          .from('agendamentos')
          .select('*')
          .eq('fisio_id', user.id)
          .gte('data_servico', now.toISOString())
          .order('data_servico', { ascending: true })
          .limit(10),
        supabase
          .from('agendamentos')
          .select('*')
          .eq('fisio_id', user.id)
          .in('status', Array.from(FAILURE_STATUSES))
          .gte('data_servico', sevenDaysAgo.toISOString())
          .order('data_servico', { ascending: false })
          .limit(30),
        supabase
          .from('agendamentos')
          .select('*')
          .eq('fisio_id', user.id)
          .eq('status', 'concluido')
          .gte('data_servico', sevenDaysAgo.toISOString())
          .order('data_servico', { ascending: false })
          .limit(30),
        supabase
          .from('pacientes')
          .select('id', { count: 'exact' })
          .eq('fisioterapeuta_id', user.id)
      ]);

      const activeUpcoming = (upcomingAppointments || []).filter((appointment) => {
        const status = normalizeStatus(appointment.status);
        return ACTIVE_APPOINTMENT_STATUSES.has(status);
      });
      const nextAppointment = activeUpcoming[0] || null;

      const allPatientIds = unique([
        ...todayAppointments.map((appointment) => appointment.paciente_id),
        ...activeUpcoming.map((appointment) => appointment.paciente_id),
        ...(recentFailures || []).map((appointment) => appointment.paciente_id),
        ...(completedAppts || []).map((appointment) => appointment.paciente_id)
      ]);

      const patientMap = await fetchPatientMaps(allPatientIds);

      let prontuarios: AnyRecord[] = [];
      if (allPatientIds.length > 0) {
        const prontuariosResult = await supabase
          .from('prontuarios')
          .select('*')
          .eq('fisio_id', user.id)
          .in('paciente_id', allPatientIds)
          .gte('data_registro', sevenDaysAgo.toISOString());

        if (!prontuariosResult.error) prontuarios = prontuariosResult.data || [];
      }

      let evolucoes: AnyRecord[] = [];
      const completedIds = unique((completedAppts || []).map((appointment) => appointment.id));
      if (completedIds.length > 0) {
        const evolucoesResult = await supabase
          .from('evolucoes')
          .select('*')
          .in('atendimento_id', completedIds);

        if (!evolucoesResult.error) evolucoes = evolucoesResult.data || [];
      }

      const completedWithoutEvolution = (completedAppts || []).filter((appointment) => {
        const appointmentDate = getAppointmentDate(appointment);
        const hasEvolutionByAppointment = evolucoes.some((evolution) => String(evolution.atendimento_id) === String(appointment.id));
        const hasProntuarioAfterAppointment = prontuarios.some((record) => {
          if (record.paciente_id !== appointment.paciente_id) return false;
          if (!appointmentDate) return true;
          const recordDate = new Date(record.data_registro || record.created_at);
          return !Number.isNaN(recordDate.getTime()) && recordDate >= appointmentDate;
        });

        return !hasEvolutionByAppointment && !hasProntuarioAfterAppointment;
      });

      const localInsights = buildLocalInsights({
        todayAppointments,
        nextAppointment,
        recentFailures: recentFailures || [],
        completedWithoutEvolution,
        totalPatients: totalPatients?.length || 0,
        patientMap
      });

      // A IA entra como camada extra, mas a tela não depende dela para funcionar.
      // Isso evita alertas ruins com UUID do paciente quando a IA não tem nome suficiente.
      try {
        const clinicalContext = {
          professionalName: profile?.nome_completo,
          todayStats: {
            total: todayAppointments.length,
            remaining: todayAppointments.filter((appointment) => normalizeStatus(appointment.status) !== 'concluido').length,
            appointments: todayAppointments.map((appointment) => ({
              time: formatTime(appointment),
              status: appointment.status,
              patient: patientMap.get(appointment.paciente_id)?.name || 'Paciente sem nome',
              service: appointment.servico || appointment.tipo || null
            })),
            next: nextAppointment ? {
              time: formatTime(nextAppointment),
              patient: patientMap.get(nextAppointment.paciente_id)?.name || 'Paciente sem nome',
              service: nextAppointment.servico || nextAppointment.tipo || null
            } : null
          },
          recentActivity: {
            failures: (recentFailures || []).map((appointment) => ({
              patient: patientMap.get(appointment.paciente_id)?.name || 'Paciente sem nome',
              status: appointment.status,
              date: appointment.data_servico || appointment.data
            })),
            completedWithoutEvolution: completedWithoutEvolution.map((appointment) => ({
              patient: patientMap.get(appointment.paciente_id)?.name || 'Paciente sem nome',
              date: appointment.data_servico || appointment.data
            })),
            totalPatients: totalPatients?.length || 0
          },
          localInsights,
          timestamp: now.toISOString()
        };

        const aiInsights = await kineAIService.generateClinicalInsights(clinicalContext);
        setInsights({
          statusDay: aiInsights?.statusDay || localInsights.statusDay,
          alerts: Array.isArray(aiInsights?.alerts) && aiInsights.alerts.length > 0 ? aiInsights.alerts : localInsights.alerts,
          suggestions: Array.isArray(aiInsights?.suggestions) && aiInsights.suggestions.length > 0 ? aiInsights.suggestions : localInsights.suggestions,
          nextPatientSummary: aiInsights?.nextPatientSummary || localInsights.nextPatientSummary,
          daySummary: aiInsights?.daySummary || localInsights.daySummary
        });
      } catch {
        setInsights(localInsights);
      }
    } catch (err) {
      console.error('Erro ao gerar insights clínicos:', err);
      setError('Não foi possível carregar os insights clínicos no momento.');
    } finally {
      setLoading(false);
    }
  }, [buildLocalInsights, fetchPatientMaps, isPhysio, profile?.nome_completo, user]);

  useEffect(() => {
    fetchClinicalDataAndGenerateInsights();
  }, [fetchClinicalDataAndGenerateInsights]);

  const visibleAlerts = useMemo(() => insights?.alerts?.filter(Boolean) || [], [insights?.alerts]);
  const visibleSuggestions = useMemo(() => insights?.suggestions?.filter(Boolean) || [], [insights?.suggestions]);

  const handleAssistantSubmit = async () => {
    const question = assistantQuestion.trim();
    if (!question || assistantLoading) return;

    setAssistantLoading(true);
    setAssistantAnswer(null);

    try {
      const contextMessage = `Contexto real do painel do fisioterapeuta: ${JSON.stringify(insights || {})}\n\nPergunta do profissional: ${question}`;
      const response = await kineAIService.chat(contextMessage);
      setAssistantAnswer(response);
    } catch {
      setAssistantAnswer('Não consegui responder agora. Tente novamente em alguns instantes.');
    } finally {
      setAssistantLoading(false);
    }
  };

  if (!isPhysio) return null;

  return (
    <motion.div
      layout
      className={cn(
        'w-full max-w-full min-w-0 bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-800 rounded-[2rem] sm:rounded-[2.5rem] text-white shadow-2xl shadow-blue-900/40 relative overflow-hidden border border-white/10 group transition-all duration-500',
        isExpanded ? 'p-5 sm:p-8' : 'p-5 sm:p-6 cursor-pointer'
      )}
      onClick={() => !isExpanded && setIsExpanded(true)}
    >
      <div className="absolute inset-0 bg-blue-400/10 animate-pulse pointer-events-none" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-110 transition-transform duration-700" />

      <div className="relative z-10 w-full max-w-full min-w-0 space-y-6 overflow-hidden">
        <div className="flex w-full max-w-full min-w-0 items-center justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner group-hover:rotate-12 transition-transform shrink-0">
              <BrainCircuit size={24} className="animate-pulse" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2 flex-wrap leading-tight">
                Assistente <span className="text-blue-200">Clínico</span>
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              </h3>
              <p className="text-blue-100/70 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.18em] sm:tracking-widest">Inteligência de dados reais</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isExpanded && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fetchClinicalDataAndGenerateInsights();
                }}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                aria-label="Atualizar assistente clínico"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
            )}
            {isExpanded && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                aria-label="Recolher assistente clínico"
              >
                <ChevronRight size={20} className="rotate-90" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-4">
            <Loader2 size={18} className="animate-spin text-blue-200" />
            <p className="text-sm font-medium text-blue-100">Analisando sua agenda e dados clínicos...</p>
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 py-4 text-amber-200 bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20">
            <AlertTriangle size={18} />
            <p className="text-xs font-bold">{error}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-blue-200">
                <CheckCircle2 size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Status do Dia</span>
              </div>
              <p className="text-sm font-medium leading-relaxed">{insights?.statusDay}</p>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full max-w-full min-w-0 space-y-6 overflow-hidden"
                >
                  {visibleAlerts.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-amber-300">
                        <AlertTriangle size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Alertas Inteligentes</span>
                      </div>
                      <div className="grid gap-2">
                        {visibleAlerts.map((alert, idx) => (
                          <div key={`${alert}-${idx}`} className="flex max-w-full gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-medium text-rose-100 leading-relaxed">
                            <span className="shrink-0">⚠️</span>
                            <span className="min-w-0 break-words">{alert}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 p-3 bg-emerald-500/10 border border-emerald-400/20 rounded-xl text-xs font-medium text-emerald-100 leading-relaxed">
                      <CheckCircle2 size={16} className="shrink-0 text-emerald-300" />
                      Nenhum alerta crítico encontrado agora.
                    </div>
                  )}

                  {insights?.nextPatientSummary && (
                    <div className="p-5 bg-black/20 backdrop-blur-xl rounded-[2rem] border border-white/10 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sky-300">
                          <Users size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Próxima Consulta</span>
                        </div>
                        <Sparkles size={16} className="text-sky-400 animate-pulse" />
                      </div>
                      <p className="text-xs text-white/90 leading-relaxed italic whitespace-pre-wrap">{insights.nextPatientSummary}</p>
                    </div>
                  )}

                  {visibleSuggestions.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-emerald-300">
                        <TrendingUp size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Sugestões de Ação</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {visibleSuggestions.map((suggestion, idx) => (
                          <button
                            type="button"
                            key={`${suggestion}-${idx}`}
                            className="flex w-full max-w-full items-center justify-between gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[11px] font-bold text-white transition-all text-left"
                          >
                            <span className="min-w-0 flex-1 break-words">{suggestion}</span>
                            <ArrowUpRight size={14} className="text-emerald-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <form
                    className="space-y-3 pt-4 border-t border-white/10"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleAssistantSubmit();
                    }}
                  >
                    <div className="flex w-full max-w-full min-w-0 items-center gap-2 sm:gap-3">
                      <div className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 transition-all focus-within:border-sky-300/70 focus-within:bg-white/15 focus-within:ring-2 focus-within:ring-sky-300/30">
                        <MessageSquare
                          className="pointer-events-none h-4 w-4 shrink-0 text-white/35"
                          aria-hidden="true"
                        />
                        <input
                          type="text"
                          value={assistantQuestion}
                          onChange={(event) => setAssistantQuestion(event.target.value)}
                          placeholder="Pergunte sobre agenda, evolução ou alertas..."
                          className="h-full min-w-0 flex-1 bg-transparent text-[11px] font-semibold text-white outline-none placeholder:block placeholder:truncate placeholder:text-white/45 sm:text-sm"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={assistantLoading || !assistantQuestion.trim()}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-900 shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                        aria-label="Enviar pergunta para assistente clínico"
                      >
                        {assistantLoading ? <Loader2 size={20} className="animate-spin" /> : <ArrowUpRight size={22} />}
                      </button>
                    </div>

                    {assistantAnswer && (
                      <div className="max-h-[22rem] overflow-y-auto rounded-2xl border border-white/10 bg-white/10 p-4 pb-6 text-sm leading-relaxed text-blue-50 whitespace-pre-wrap shadow-inner shadow-black/10">
                        {assistantAnswer}
                      </div>
                    )}
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {!isExpanded && (
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-[10px] font-black text-blue-200 uppercase tracking-widest">
                  <Calendar size={14} />
                  Dados do dia
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-200 uppercase tracking-widest">
                  Ver detalhes
                  <ChevronRight size={12} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
