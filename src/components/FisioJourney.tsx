import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FileText,
  HeartPulse,
  Loader2,
  MessageCircle,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { formatDateBR, formatHourBR } from '../utils/date';
import { getLinkedClinicalPatients, getPatientVisibleIds } from '../services/patientLinkService';

type JourneyMode = 'patient' | 'physio';
type JourneyProps = { patientId?: string; patient?: any; mode?: JourneyMode; compact?: boolean };
type JourneyState = {
  journals: any[];
  appointments: any[];
  protocols: any[];
  protocolItems: any[];
  directPrescriptions: any[];
  evolutions: any[];
  evaluations: any[];
  documents: any[];
  visiblePatientIds: string[];
  clinicalPatientIds: string[];
};

const initialState: JourneyState = {
  journals: [],
  appointments: [],
  protocols: [],
  protocolItems: [],
  directPrescriptions: [],
  evolutions: [],
  evaluations: [],
  documents: [],
  visiblePatientIds: [],
  clinicalPatientIds: [],
};

const normalizeEmail = (value?: string | null) => value?.trim().toLowerCase() || '';
const uniqueStrings = (values: any[]) => Array.from(new Set(values.filter(Boolean).map(String)));
const safeDate = (value: any) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const getPainValue = (entry: any) => {
  for (const candidate of [entry?.nivel_dor, entry?.dor_escala, entry?.escala_dor, entry?.pain_level, entry?.dor, entry?.intensidade_dor]) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
};

const appointmentDate = (appointment: any) => {
  const raw = appointment?.data_servico || appointment?.data || appointment?.data_agendamento || appointment?.created_at || appointment?.criado_em;
  const hour = String(appointment?.hora || appointment?.horario || '12:00').slice(0, 5);
  const dateOnly = String(raw || '').match(/^\d{4}-\d{2}-\d{2}/)?.[0];

  if (dateOnly) {
    return safeDate(`${dateOnly}T${hour}:00`);
  }

  return safeDate(raw);
};

const latestDate = (item: any) => {
  const raw = item?.data_registro || item?.created_at || item?.criado_em || item?.data || item?.data_servico || item?.updated_at;
  return safeDate(raw)?.getTime() || 0;
};

const getExerciseCompletionFromJournals = (journals: any[]) => {
  let completed = 0;
  let total = 0;

  journals.forEach((entry) => {
    const entryTotal = Number(entry?.total_exercicios);
    const entryCompleted = Number(entry?.concluidos_count);

    if (Number.isFinite(entryTotal) && entryTotal > 0) {
      total += entryTotal;
      completed += Number.isFinite(entryCompleted) ? entryCompleted : 0;
      return;
    }

    const exercises = Array.isArray(entry?.exercicios_concluidos) ? entry.exercicios_concluidos : [];
    if (exercises.length > 0) {
      total += exercises.length;
      completed += exercises.filter((exercise: any) => Boolean(exercise?.completed || exercise?.concluido)).length;
    }
  });

  return { completed, total };
};

const getPhysioVisibleIds = async (targetPatientId: string, patient: any) => {
  const baseIds = uniqueStrings([
    targetPatientId,
    patient?.id,
    patient?.perfil_id,
    patient?.profile_id,
    patient?.user_id,
    patient?.auth_user_id,
    patient?.paciente_id,
  ]);

  const clinicalIds = uniqueStrings([targetPatientId, patient?.id]);
  const patientEmail = normalizeEmail(patient?.email);

  if (!patientEmail) {
    return { visiblePatientIds: baseIds, clinicalPatientIds: clinicalIds };
  }

  const { data: linkedProfile, error } = await supabase
    .from('perfis')
    .select('id')
    .ilike('email', patientEmail)
    .maybeSingle();

  if (error) {
    console.warn('Jornada: não foi possível buscar perfil vinculado ao paciente:', error);
  }

  return {
    visiblePatientIds: uniqueStrings([...baseIds, linkedProfile?.id]),
    clinicalPatientIds: uniqueStrings(clinicalIds),
  };
};

const getPatientModeVisibleIds = async (userId: string, email?: string | null) => {
  const linkedClinicalPatients = await getLinkedClinicalPatients(userId, email);
  const visiblePatientIds = await getPatientVisibleIds(userId, email);

  return {
    visiblePatientIds: uniqueStrings(visiblePatientIds),
    clinicalPatientIds: uniqueStrings(linkedClinicalPatients.map((linked) => linked.id)),
  };
};

export default function FisioJourney({ patientId, patient, mode = 'patient', compact = false }: JourneyProps) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<JourneyState>(initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const targetPatientId = patientId || patient?.id || user?.id || '';
  const isPhysioMode = mode === 'physio';

  const loadJourney = useCallback(async () => {
    if (!targetPatientId) return;

    setLoading(true);
    setError('');

    try {
      const ids = isPhysioMode
        ? await getPhysioVisibleIds(targetPatientId, patient)
        : await getPatientModeVisibleIds(profile?.id || user?.id || targetPatientId, profile?.email || user?.email);

      const visiblePatientIds = ids.visiblePatientIds.length > 0 ? ids.visiblePatientIds : [targetPatientId];
      const clinicalPatientIds = ids.clinicalPatientIds.length > 0 ? ids.clinicalPatientIds : [targetPatientId];
      const allPatientIds = uniqueStrings([...visiblePatientIds, ...clinicalPatientIds]);

      const [journalsResult, appointmentsResult, protocolsResult, directPrescriptionsResult, evolutionsResult, evaluationsResult, docsByIdResult] = await Promise.all([
        supabase.from('registros_paciente').select('*').in('paciente_id', visiblePatientIds).order('data_registro', { ascending: false }).limit(30),
        supabase.from('agendamentos').select('*').in('paciente_id', allPatientIds).order('data', { ascending: false }).limit(30),
        supabase.from('protocolos_prescricao').select('*').in('paciente_id', allPatientIds).order('created_at', { ascending: false }).limit(12),
        supabase.from('exercicios_paciente').select('*, exercicio:exercicios(nome, descricao, objetivo_principal, imagem_url, video_url)').in('paciente_id', clinicalPatientIds).order('created_at', { ascending: false }).limit(80),
        supabase.from('evolucoes').select('*').in('paciente_id', clinicalPatientIds).order('created_at', { ascending: false }).limit(20),
        supabase.from('fichas_avaliacao').select('*').in('paciente_id', clinicalPatientIds).order('created_at', { ascending: false }).limit(10),
        supabase.from('documentos_gerados').select('*').in('paciente_id', allPatientIds).order('criado_em', { ascending: false }).limit(12),
      ]);

      let documents = docsByIdResult.data || [];
      const patientEmail = normalizeEmail(patient?.email || profile?.email || user?.email);

      if ((docsByIdResult.error || documents.length === 0) && patientEmail) {
        const { data: docsByEmail, error: docsByEmailError } = await supabase
          .from('documentos_gerados')
          .select('*')
          .eq('patient_email', patientEmail)
          .order('criado_em', { ascending: false })
          .limit(12);

        if (!docsByEmailError && docsByEmail) {
          documents = docsByEmail;
        }

        if (docsByEmailError) {
          console.warn('Jornada: fallback por e-mail em documentos falhou:', docsByEmailError);
        }
      }

      const protocols = protocolsResult.data || [];
      const protocolIds = protocols.map((protocol: any) => protocol.id).filter(Boolean);
      let protocolItems: any[] = [];

      if (protocolIds.length > 0) {
        const itemsResult = await supabase
          .from('protocolo_itens')
          .select('*, exercicio:exercicios(nome, descricao, objetivo_principal, imagem_url, video_url)')
          .in('protocolo_id', protocolIds)
          .limit(120);

        protocolItems = itemsResult.data || [];
        if (itemsResult.error) console.warn('Jornada: protocolo_itens indisponível:', itemsResult.error);
      }

      [
        journalsResult.error,
        appointmentsResult.error,
        protocolsResult.error,
        directPrescriptionsResult.error,
        evolutionsResult.error,
        evaluationsResult.error,
        docsByIdResult.error,
      ]
        .filter(Boolean)
        .forEach((softError) => console.warn('Jornada carregada parcialmente:', softError));

      setData({
        journals: journalsResult.data || [],
        appointments: appointmentsResult.data || [],
        protocols,
        protocolItems,
        directPrescriptions: directPrescriptionsResult.data || [],
        evolutions: evolutionsResult.data || [],
        evaluations: evaluationsResult.data || [],
        documents,
        visiblePatientIds,
        clinicalPatientIds,
      });
    } catch (err) {
      console.error('Erro ao carregar Jornada de Recuperação:', err);
      setError('Não foi possível carregar todos os dados reais da Jornada agora. Os demais dados do app continuam preservados.');
    } finally {
      setLoading(false);
    }
  }, [targetPatientId, isPhysioMode, patient, profile, user]);

  useEffect(() => {
    loadJourney();
  }, [loadJourney]);

  const metrics = useMemo(() => {
    const painEntries = [...data.journals, ...data.evolutions, ...data.evaluations]
      .map((entry) => ({ ...entry, pain: getPainValue(entry), date: latestDate(entry) }))
      .filter((entry) => entry.pain !== null && entry.date > 0)
      .sort((a, b) => a.date - b.date);

    const initialPain = painEntries[0]?.pain ?? null;
    const currentPain = painEntries[painEntries.length - 1]?.pain ?? null;
    const painImprovement = initialPain !== null && currentPain !== null && initialPain > 0
      ? clamp(Math.round(((initialPain - currentPain) / initialPain) * 100))
      : 0;

    const completedAppointments = data.appointments.filter((appt) =>
      ['realizado', 'concluido', 'concluído', 'confirmado', 'pago'].includes(String(appt.status || '').toLowerCase())
    ).length;
    const missedAppointments = data.appointments.filter((appt) =>
      ['cancelado', 'faltou', 'ausente'].includes(String(appt.status || '').toLowerCase())
    ).length;

    const journalExercises = getExerciseCompletionFromJournals(data.journals);
    const prescribedExercises = data.protocolItems.length + data.directPrescriptions.length;
    const totalExercises = Math.max(prescribedExercises, journalExercises.total);
    const completedExercises = journalExercises.completed;
    const exerciseAdherence = journalExercises.total > 0
      ? clamp(Math.round((journalExercises.completed / journalExercises.total) * 100))
      : prescribedExercises > 0
        ? 0
        : 0;

    const progress = clamp(Math.round(
      (painImprovement * 0.45) +
      (exerciseAdherence * 0.35) +
      ((Math.min(completedAppointments, 8) / 8) * 20)
    ));

    const nextAppointment = data.appointments
      .map((appointment) => ({ appointment, date: appointmentDate(appointment) }))
      .filter((item): item is { appointment: any; date: Date } => Boolean(item.date) && item.date >= new Date())
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

    const lastJournal = data.journals[0];
    const lastJournalDays = lastJournal ? Math.floor((Date.now() - (latestDate(lastJournal) || Date.now())) / 86400000) : null;
    const alerts = [
      lastJournalDays !== null && lastJournalDays >= 3
        ? { type: 'warning', title: `Paciente ficou ${lastJournalDays} dias sem registrar evolução`, detail: 'Vale enviar um lembrete gentil.' }
        : null,
      painEntries.length >= 2 && currentPain !== null && currentPain > (painEntries[painEntries.length - 2]?.pain ?? currentPain)
        ? { type: 'danger', title: 'Dor aumentou no último registro', detail: 'Revisar carga e sintomas na próxima sessão.' }
        : null,
      progress >= 60
        ? { type: 'success', title: 'Boa evolução detectada', detail: 'Paciente mantém sinais positivos de progresso.' }
        : null,
      missedAppointments > 0
        ? { type: 'warning', title: `${missedAppointments} falta/cancelamento registrado`, detail: 'Acompanhar adesão às sessões.' }
        : null,
    ].filter(Boolean) as any[];

    return {
      initialPain,
      currentPain,
      painImprovement,
      completedAppointments,
      missedAppointments,
      totalExercises,
      completedExercises,
      exerciseAdherence,
      progress,
      nextAppointment,
      alerts,
    };
  }, [data]);

  const timeline = useMemo(() => [
    ...data.evaluations.map((item) => ({
      type: 'Avaliação',
      title: item.diagnostico_fisio || item.queixa_principal || 'Avaliação inicial',
      description: item.objetivos_terapeuticos || item.conduta || item.observacoes_finais || 'Ficha de avaliação registrada pelo fisioterapeuta.',
      date: latestDate(item),
      icon: ClipboardList,
    })),
    ...data.evolutions.map((item) => ({
      type: 'Evolução',
      title: 'Evolução clínica',
      description: item.descricao || item.observacoes || item.plano || 'Evolução registrada pelo fisioterapeuta.',
      date: latestDate(item),
      icon: Activity,
    })),
    ...data.journals.map((item) => ({
      type: 'Diário',
      title: `Dor ${getPainValue(item) ?? '-'}/10`,
      description: item.notas || item.observacoes || item.descricao || item.sintomas || 'Registro rápido do paciente.',
      date: latestDate(item),
      icon: HeartPulse,
    })),
    ...data.protocols.map((item) => ({
      type: 'Protocolo',
      title: item.titulo || 'Protocolo de exercícios',
      description: item.observacoes || 'Prescrição de exercícios vinculada ao tratamento.',
      date: latestDate(item),
      icon: Activity,
    })),
    ...data.directPrescriptions.map((item) => ({
      type: 'Exercício',
      title: item.exercicio?.nome || item.nome || 'Exercício prescrito',
      description: item.observacoes || item.exercicio?.descricao || 'Exercício prescrito pelo fisioterapeuta.',
      date: latestDate(item),
      icon: Activity,
    })),
    ...data.documents.map((item) => ({
      type: 'Documento',
      title: item.title || item.titulo || item.type || item.tipo || 'Documento clínico',
      description: item.description || item.descricao || 'Documento gerado no tratamento.',
      date: latestDate(item),
      icon: FileText,
    })),
  ].filter((item) => item.date > 0).sort((a, b) => b.date - a.date).slice(0, compact ? 4 : 8), [data, compact]);

  const patientName = patient?.nome_completo || profile?.nome_completo || 'Paciente';

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-purple-100 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-center gap-3 text-purple-700 font-black">
          <Loader2 className="animate-spin" size={22} /> Carregando Jornada de Recuperação...
        </div>
      </div>
    );
  }

  return (
    <section className="min-h-full bg-white text-slate-950">
      <div className={cn(compact ? 'p-0' : 'mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8', 'space-y-6')}>
        {error && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">{error}</div>}

        <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] border border-purple-100 bg-white p-5 md:p-7 shadow-[0_20px_70px_rgba(88,28,135,0.10)]">
          <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-purple-100 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <img src={patient?.avatar_url || patient?.foto_url || profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetPatientId}`} alt={patientName} className="h-16 w-16 rounded-2xl border-4 border-purple-100 object-cover shadow-sm" />
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-purple-700"><Sparkles size={12} /> FisioJourney</div>
                <h1 className="text-2xl md:text-4xl font-black tracking-tight text-purple-800">Jornada de Recuperação</h1>
                <p className="mt-1 text-sm md:text-base font-semibold text-slate-700">{isPhysioMode ? `Visão completa da evolução de ${patientName}.` : 'Acompanhe sua evolução de forma simples, visual e motivadora.'}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-[1.5rem] border border-purple-100 bg-purple-50/70 p-3 text-center">
              <div><p className="text-2xl font-black text-purple-800">{metrics.progress}%</p><p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Progresso</p></div>
              <div className="border-x border-purple-100 px-3"><p className="text-2xl font-black text-purple-800">{metrics.currentPain ?? '-'}/10</p><p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Dor atual</p></div>
              <div><p className="text-2xl font-black text-purple-800">{metrics.exerciseAdherence}%</p><p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Adesão</p></div>
            </div>
          </div>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Melhora da dor', value: `${metrics.painImprovement}%`, icon: HeartPulse, tone: 'text-rose-600 bg-rose-50 border-rose-100' },
                { label: 'Sessões', value: metrics.completedAppointments, icon: Calendar, tone: 'text-purple-700 bg-purple-50 border-purple-100' },
                { label: 'Exercícios', value: metrics.totalExercises, icon: Activity, tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
                { label: 'Documentos', value: data.documents.length, icon: FileText, tone: 'text-blue-700 bg-blue-50 border-blue-100' },
              ].map((item) => (
                <div key={item.label} className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
                  <div className={cn('mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border', item.tone)}><item.icon size={22} /></div>
                  <p className="text-2xl font-black text-slate-950">{item.value}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[2rem] border border-purple-100 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-purple-800">Linha do tempo clínica</h2>
                  <p className="text-sm font-semibold text-slate-600">Tudo importante da recuperação em ordem cronológica.</p>
                </div>
                <Target className="text-purple-700" />
              </div>
              {timeline.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-purple-200 bg-purple-50 p-6 text-center">
                  <p className="font-black text-purple-800">A jornada ainda está começando.</p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">Conforme houver diário, exercícios, documentos e evoluções, tudo aparecerá aqui.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {timeline.map((item, index) => (
                    <div key={`${item.type}-${item.date}-${index}`} className="relative flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-700 text-white shadow-sm"><item.icon size={20} /></div>
                        {index < timeline.length - 1 && <div className="mt-2 h-full min-h-8 w-px bg-purple-100" />}
                      </div>
                      <div className="flex-1 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-black text-purple-800">{item.type}</p>
                          <p className="text-xs font-bold text-slate-500">{formatDateBR(new Date(item.date).toISOString())}</p>
                        </div>
                        <h3 className="mt-1 text-base font-black text-slate-950">{item.title}</h3>
                        <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-700">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border border-purple-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-700 text-white"><Sparkles size={22} /></div>
                <div>
                  <h2 className="text-xl font-black text-purple-800">Resumo inteligente</h2>
                  <p className="text-sm font-semibold text-slate-600">Leitura rápida para orientar a próxima conduta.</p>
                </div>
              </div>
              <p className="rounded-2xl bg-purple-50 p-4 text-sm md:text-base font-semibold leading-relaxed text-slate-800">
                {metrics.currentPain !== null
                  ? `Nos registros reais encontrados, a dor atual está em ${metrics.currentPain}/10${metrics.initialPain !== null ? `, saindo de ${metrics.initialPain}/10 no início` : ''}. A evolução estimada é de ${metrics.progress}% e a adesão registrada no diário está em ${metrics.exerciseAdherence}%. ${metrics.painImprovement > 0 ? 'Há sinal positivo de melhora; vale manter acompanhamento e progressão segura.' : 'Ainda há poucos sinais de melhora mensurável; vale reforçar registros, exercícios e reavaliação clínica.'}`
                  : 'Ainda faltam registros de dor para gerar uma leitura clínica mais precisa. Oriente o paciente a preencher o diário para enriquecer a jornada.'}
              </p>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-[2rem] border border-purple-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-black text-purple-800">Próximo passo</h2><Trophy className="text-purple-700" size={22} /></div>
              {metrics.nextAppointment ? (
                <div className="rounded-2xl bg-purple-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-purple-700">Próxima sessão</p>
                  <p className="mt-2 text-xl font-black text-slate-950">{formatDateBR(metrics.nextAppointment.date.toISOString())}</p>
                  <p className="text-sm font-bold text-slate-700">{formatHourBR(metrics.nextAppointment.date.toISOString())}</p>
                </div>
              ) : (
                <div className="rounded-2xl bg-purple-50 p-4">
                  <p className="font-black text-slate-950">Sem sessão futura registrada.</p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">O próximo agendamento aparecerá aqui automaticamente.</p>
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border border-purple-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-black text-purple-800">Alertas inteligentes</h2><Zap className="text-purple-700" size={22} /></div>
              <div className="space-y-3">
                {metrics.alerts.length === 0 ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2 font-black text-emerald-800"><CheckCircle2 size={18} /> Tudo estável</div>
                    <p className="mt-1 text-sm font-semibold text-slate-700">Nenhum alerta importante no momento.</p>
                  </div>
                ) : metrics.alerts.map((alert, index) => (
                  <div key={`${alert.title}-${index}`} className={cn('rounded-2xl border p-4', alert.type === 'danger' ? 'border-rose-100 bg-rose-50' : alert.type === 'success' ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50')}>
                    <div className={cn('flex items-center gap-2 font-black', alert.type === 'danger' ? 'text-rose-700' : alert.type === 'success' ? 'text-emerald-800' : 'text-amber-800')}>
                      {alert.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}{alert.title}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{alert.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-purple-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-purple-800">Ações rápidas</h2>
              <div className="mt-4 grid gap-3">
                {!isPhysioMode && <button onClick={() => navigate('/diario')} className="flex items-center justify-between rounded-2xl bg-purple-700 px-4 py-3 font-black text-white hover:bg-purple-800 transition-all">Registrar evolução <ArrowRight size={18} /></button>}
                <Link to={isPhysioMode ? `/patients/${targetPatientId}` : '/treinos'} className="flex items-center justify-between rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3 font-black text-purple-800 hover:bg-purple-100 transition-all">
                  {isPhysioMode ? 'Ver dados do paciente' : 'Ver exercícios'} <Activity size={18} />
                </Link>
                <Link to="/chat" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-950 hover:border-purple-200 transition-all">Mensagens <MessageCircle size={18} /></Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-purple-100 bg-purple-700 p-5 text-white shadow-sm">
              <div className="flex items-center gap-3"><Users size={24} /><div><h2 className="text-lg font-black">Modo família</h2><p className="text-sm font-semibold text-purple-100">Preparado para uma próxima fase com convite seguro para cuidador/familiar.</p></div></div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
