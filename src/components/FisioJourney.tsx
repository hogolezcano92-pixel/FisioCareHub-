import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { formatDateBR, formatHourBR, todayDateKeyBR } from '../utils/date';
import { getLinkedClinicalPatients, getPatientVisibleIds } from '../services/patientLinkService';
import { toast } from 'sonner';

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
const uniqueByKey = (items: any[], getKey: (item: any) => string) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
const safeDate = (value: any) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();

  // Aceita formato brasileiro usado em alguns fluxos antigos: 26/05/2026 ou 26/05/2026 21:00
  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[,\s]+(\d{2}):(\d{2}))?/);
  if (brMatch) {
    const [, day, month, year, hour = '12', minute = '00'] = brMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(raw);
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

const normalizeStatus = (value: any) => String(value || '').trim().toLowerCase();
const normalizeTextKey = (value: any) => String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');

const APPOINTMENT_STATUS_PRIORITY: Record<string, number> = {
  realizado: 70,
  concluido: 70,
  concluído: 70,
  confirmado: 60,
  confirmada: 60,
  paid: 60,
  pago: 60,
  agendado: 50,
  agendada: 50,
  marcado: 50,
  marcada: 50,
  remarcado: 45,
  remarcada: 45,
  cancelado: 20,
  cancelada: 20,
  faltou: 15,
  ausente: 15,
  pendente_pagamento: 0,
  pending_payment: 0,
  aguardando_pagamento: 0,
  pendente: 0,
  pending: 0,
};

const isUsefulAppointmentStatus = (appointment: any) => {
  const status = normalizeStatus(appointment?.status || appointment?.payment_status);
  if (!status) return true;
  return (APPOINTMENT_STATUS_PRIORITY[status] ?? 30) > 0;
};

const appointmentPriority = (appointment: any) => {
  const status = normalizeStatus(appointment?.status || appointment?.payment_status);
  return APPOINTMENT_STATUS_PRIORITY[status] ?? 30;
};

const appointmentTimelineKey = (appointment: any) => {
  const date = appointmentDate(appointment);
  const dayMinute = date
    ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`
    : String(appointment?.data_servico || appointment?.data || appointment?.created_at || appointment?.criado_em || 'sem-data');
  const service = normalizeTextKey(appointment?.servico || appointment?.tipo || appointment?.titulo || appointment?.title || 'sessao');
  const patientKey = String(appointment?.paciente_id || appointment?.patient_id || 'paciente');
  return `${patientKey}|${dayMinute}|${service}`;
};

const cleanAppointmentsForTimeline = (appointments: any[]) => {
  const byKey = new Map<string, any>();

  appointments
    .filter(isUsefulAppointmentStatus)
    .forEach((appointment) => {
      const key = appointmentTimelineKey(appointment);
      const current = byKey.get(key);
      if (!current || appointmentPriority(appointment) > appointmentPriority(current) || latestDate(appointment) > latestDate(current)) {
        byKey.set(key, appointment);
      }
    });

  return Array.from(byKey.values()).sort((a, b) => (appointmentDate(b)?.getTime() || latestDate(b)) - (appointmentDate(a)?.getTime() || latestDate(a)));
};

const timelineEventKey = (item: any) => {
  const day = item.date ? new Date(item.date).toISOString().slice(0, 16) : 'sem-data';
  return `${normalizeTextKey(item.type)}|${normalizeTextKey(item.title)}|${day}`;
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
    emails: uniqueStrings([patientEmail]),
  };
};

const getPatientModeVisibleIds = async (userId: string, email?: string | null) => {
  const linkedClinicalPatients = await getLinkedClinicalPatients(userId, email);
  const visiblePatientIds = await getPatientVisibleIds(userId, email);

  return {
    visiblePatientIds: uniqueStrings(visiblePatientIds),
    clinicalPatientIds: uniqueStrings(linkedClinicalPatients.map((linked) => linked.id)),
    emails: uniqueStrings([email, ...linkedClinicalPatients.map((linked) => linked.email)]).map((item) => normalizeEmail(item)),
  };
};

export default function FisioJourney({ patientId, patient, mode = 'patient', compact = false }: JourneyProps) {
  const { user, profile } = useAuth();
  const [data, setData] = useState<JourneyState>(initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinPain, setCheckinPain] = useState<number | null>(null);
  const [checkinExerciseStatus, setCheckinExerciseStatus] = useState<'todos' | 'parcial' | 'nao'>('todos');
  const [checkinMood, setCheckinMood] = useState<'melhor' | 'igual' | 'pior'>('igual');
  const [checkinNotes, setCheckinNotes] = useState('');
  const [savingCheckin, setSavingCheckin] = useState(false);
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

      const [journalsResult, appointmentsResult, protocolsResult, directPrescriptionsResult, evolutionsResult, evaluationsResult, docsByIdResult, clinicalFilesResult] = await Promise.all([
        // Diário/check-in pode ter sido salvo pelo ID da conta em perfis ou pelo ID clínico em pacientes.
        // A linha do tempo precisa buscar os dois para não esconder registros reais de dor.
        supabase.from('registros_paciente').select('*').in('paciente_id', allPatientIds).order('data_registro', { ascending: false }).limit(60),
        supabase.from('agendamentos').select('*').in('paciente_id', allPatientIds).order('data', { ascending: false }).limit(60),
        supabase.from('protocolos_prescricao').select('*').in('paciente_id', allPatientIds).order('created_at', { ascending: false }).limit(30),
        // Exercícios rápidos prescritos na aba Meus Pacientes podem estar ligados ao ID clínico
        // ou, em alguns fluxos antigos, ao ID da conta/perfil. Por isso buscamos em todos os IDs visíveis.
        supabase.from('exercicios_paciente').select('*').in('paciente_id', allPatientIds).order('created_at', { ascending: false }).limit(120),
        supabase.from('evolucoes').select('*').in('paciente_id', allPatientIds).order('created_at', { ascending: false }).limit(40),
        supabase.from('fichas_avaliacao').select('*').in('paciente_id', allPatientIds).order('created_at', { ascending: false }).limit(30),
        supabase.from('documentos_gerados').select('*').in('paciente_id', allPatientIds).order('criado_em', { ascending: false }).limit(60),
        supabase.from('arquivos_paciente').select('*').in('paciente_id', allPatientIds).order('created_at', { ascending: false }).limit(60),
      ]);

      const emailsForDocuments = uniqueStrings([patient?.email, profile?.email, user?.email, ...(((ids as any).emails) || [])]).map((email) => normalizeEmail(email));
      let generatedDocuments = docsByIdResult.data || [];

      // Documentos gerados às vezes ficam vinculados por patient_email em vez de paciente_id.
      // Juntamos os dois caminhos para a Jornada enxergar o mesmo que a aba Documentos.
      if (emailsForDocuments.length > 0) {
        const { data: docsByEmail, error: docsByEmailError } = await supabase
          .from('documentos_gerados')
          .select('*')
          .in('patient_email', emailsForDocuments)
          .order('criado_em', { ascending: false })
          .limit(60);

        if (!docsByEmailError && docsByEmail) {
          generatedDocuments = uniqueByKey([...generatedDocuments, ...docsByEmail], (doc) => `gerado-${doc.id || doc.source_id || doc.criado_em || doc.created_at}`);
        } else if (docsByEmailError) {
          console.warn('Jornada: fallback por e-mail em documentos falhou:', docsByEmailError);
        }
      }

      const clinicalFiles = (clinicalFilesResult.data || []).map((file: any) => {
        const fileName = file.nome_arquivo || file.nome || file.titulo || file.name || file.file_name || file.filename || 'Arquivo clínico';
        return {
          ...file,
          id: `arquivo-${file.id}`,
          source_id: file.id,
          title: fileName,
          titulo: fileName,
          type: file.tipo || file.categoria || 'Arquivo do prontuário',
          description: file.observacoes || file.descricao || 'Arquivo anexado ao prontuário do paciente.',
          descricao: file.observacoes || file.descricao || 'Arquivo anexado ao prontuário do paciente.',
          criado_em: file.created_at || file.criado_em,
          isClinicalFile: true,
        };
      });

      const documents = uniqueByKey([...generatedDocuments, ...clinicalFiles], (doc) => `${doc.isClinicalFile ? 'arquivo' : 'gerado'}-${doc.source_id || doc.id || doc.criado_em || doc.created_at}`)
        .sort((a, b) => latestDate(b) - latestDate(a));

      const protocols = protocolsResult.data || [];
      let directPrescriptions = directPrescriptionsResult.data || [];
      const directExerciseIds = uniqueStrings(directPrescriptions.map((item: any) => item.exercicio_id));

      if (directExerciseIds.length > 0) {
        const { data: directExercises, error: directExercisesError } = await supabase
          .from('exercicios')
          .select('id, nome, descricao, objetivo_principal, imagem_url, video_url')
          .in('id', directExerciseIds);

        if (directExercisesError) {
          console.warn('Jornada: não foi possível enriquecer exercícios diretos:', directExercisesError);
        } else {
          const exerciseMap = new Map((directExercises || []).map((exercise: any) => [String(exercise.id), exercise]));
          directPrescriptions = directPrescriptions.map((item: any) => ({
            ...item,
            exercicio: exerciseMap.get(String(item.exercicio_id)) || item.exercicio || null,
          }));
        }
      }

      const protocolIds = protocols.map((protocol: any) => protocol.id).filter(Boolean);
      let protocolItems: any[] = [];

      if (protocolIds.length > 0) {
        const itemsResult = await supabase
          .from('protocolo_itens')
          .select('*, exercicio:exercicios(nome, descricao, objetivo_principal, imagem_url, video_url)')
          .in('protocolo_id', protocolIds)
          .limit(200);

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
        clinicalFilesResult.error,
      ]
        .filter(Boolean)
        .forEach((softError) => console.warn('Jornada carregada parcialmente:', softError));

      setData({
        journals: journalsResult.data || [],
        appointments: appointmentsResult.data || [],
        protocols,
        protocolItems,
        directPrescriptions,
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

  const handleSaveCheckin = useCallback(async () => {
    if (isPhysioMode) return;

    if (!user?.id) {
      toast.error('Faça login novamente para registrar sua evolução.');
      return;
    }

    if (checkinPain === null) {
      toast.error('Selecione sua dor de hoje para salvar o check-in.');
      return;
    }

    setSavingCheckin(true);

    try {
      const linkedPatients = await getLinkedClinicalPatients(user.id, profile?.email || user.email);
      const linkedClinicalPatient = linkedPatients[0];
      const prescribedTotal = data.protocolItems.length + data.directPrescriptions.length;
      const totalExercises = prescribedTotal > 0 ? prescribedTotal : 1;
      const completedExercises = checkinExerciseStatus === 'todos'
        ? totalExercises
        : checkinExerciseStatus === 'parcial'
          ? Math.max(1, Math.floor(totalExercises / 2))
          : 0;

      const moodLabel = checkinMood === 'melhor' ? 'melhor que antes' : checkinMood === 'pior' ? 'pior que antes' : 'igual/estável';
      const exerciseLabel = checkinExerciseStatus === 'todos' ? 'fez todos os exercícios' : checkinExerciseStatus === 'parcial' ? 'fez parte dos exercícios' : 'não fez os exercícios';
      const notes = [
        `Check-in da Jornada: paciente se sente ${moodLabel} e ${exerciseLabel}.`,
        checkinNotes.trim(),
      ].filter(Boolean).join(' ');

      const entryData = {
        paciente_id: user.id,
        fisioterapeuta_id: linkedClinicalPatient?.fisioterapeuta_id || null,
        nivel_dor: checkinPain,
        exercicios_concluidos: [
          { id: 'fisiojourney-checkin', name: 'Check-in da Jornada', completed: checkinExerciseStatus === 'todos' },
        ],
        total_exercicios: totalExercises,
        concluidos_count: completedExercises,
        notas: notes,
        data_registro: todayDateKeyBR(),
      };

      const { error: saveError } = await supabase
        .from('registros_paciente')
        .upsert(entryData, { onConflict: 'paciente_id,data_registro' });

      if (saveError) throw saveError;

      toast.success('Evolução registrada na Jornada.');
      setCheckinOpen(false);
      setCheckinNotes('');
      await loadJourney();
    } catch (err) {
      console.error('Erro ao salvar check-in da Jornada:', err);
      toast.error('Não foi possível salvar o check-in agora.');
    } finally {
      setSavingCheckin(false);
    }
  }, [checkinExerciseStatus, checkinMood, checkinNotes, checkinPain, data.directPrescriptions.length, data.protocolItems.length, isPhysioMode, loadJourney, profile?.email, user]);

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

  const patientName = patient?.nome_completo || profile?.nome_completo || 'Paciente';
  const patientDetailsPath = isPhysioMode ? `/patients/${patient?.id || targetPatientId}` : '';
  const tabPath = (tab: string) => isPhysioMode ? `${patientDetailsPath}?tab=${tab}` : '';
  const getDocumentUrl = (item: any) => item?.public_url || item?.url || item?.file_url || item?.arquivo_url || item?.documento_url || item?.download_url || item?.signedUrl || item?.signed_url || '';

  const smartSummary = useMemo(() => {
    const hasPainData = metrics.currentPain !== null;
    const trend = metrics.painImprovement >= 25
      ? 'evolução positiva da dor'
      : metrics.painImprovement > 0
        ? 'melhora discreta da dor'
        : hasPainData
          ? 'dor ainda sem melhora mensurável'
          : 'poucos registros de dor';
    const adherenceStatus = metrics.exerciseAdherence >= 75
      ? 'boa adesão aos exercícios'
      : metrics.exerciseAdherence >= 40
        ? 'adesão parcial aos exercícios'
        : metrics.totalExercises > 0
          ? 'adesão baixa ou ainda pouco registrada'
          : 'sem exercícios vinculados encontrados';
    const priority = metrics.alerts.some((alert) => alert.type === 'danger')
      ? 'Revisar dor e sintomas antes de progredir carga.'
      : metrics.exerciseAdherence < 40 && metrics.totalExercises > 0
        ? 'Reforçar orientação e simplificar o plano para melhorar adesão.'
        : metrics.progress >= 60
          ? 'Manter progressão gradual e registrar novos objetivos funcionais.'
          : 'Coletar mais registros para deixar a leitura clínica mais precisa.';

    const mainText = hasPainData
      ? `Análise inteligente: ${patientName} apresenta ${trend}, com dor atual em ${metrics.currentPain}/10${metrics.initialPain !== null ? ` e dor inicial de ${metrics.initialPain}/10` : ''}. A Jornada encontrou ${metrics.completedAppointments} sessão(ões), ${metrics.totalExercises} exercício(s) vinculado(s), ${data.documents.length} documento(s) e ${adherenceStatus}. ${priority}`
      : `Análise inteligente: ainda não há registros suficientes de dor para uma leitura clínica completa. A Jornada já encontrou ${metrics.completedAppointments} sessão(ões), ${metrics.totalExercises} exercício(s) e ${data.documents.length} documento(s). ${priority}`;

    const insights = [
      metrics.currentPain !== null ? `Dor atual: ${metrics.currentPain}/10` : 'Registrar dor diariamente melhora a precisão da análise.',
      metrics.painImprovement > 0 ? `Melhora estimada da dor: ${metrics.painImprovement}%` : 'Sem melhora de dor mensurável ainda.',
      metrics.exerciseAdherence > 0 ? `Adesão registrada: ${metrics.exerciseAdherence}%` : 'Adesão ainda sem registros suficientes.',
      metrics.nextAppointment ? 'Há uma próxima sessão registrada.' : 'Nenhuma sessão futura encontrada na Jornada.',
    ];

    return { mainText, insights, priority };
  }, [data.documents.length, metrics, patientName]);

  const timeline = useMemo(() => {
    const usefulAppointments = cleanAppointmentsForTimeline(data.appointments);

    const rawEvents = [
      ...data.evaluations.map((item) => ({
        type: 'Avaliação',
        title: item.diagnostico_fisio || item.queixa_principal || 'Avaliação inicial',
        description: item.objetivos_terapeuticos || item.conduta || item.observacoes_finais || 'Ficha de avaliação registrada pelo fisioterapeuta.',
        date: latestDate(item),
        icon: ClipboardList,
        href: tabPath('avaliacoes'),
        actionLabel: 'Abrir avaliações',
        priority: 80,
      })),
      ...data.evolutions.map((item) => ({
        type: 'Evolução',
        title: 'Evolução clínica',
        description: item.descricao || item.observacoes || item.plano || 'Evolução registrada pelo fisioterapeuta.',
        date: latestDate(item),
        icon: Activity,
        href: tabPath('evolucoes'),
        actionLabel: 'Abrir evoluções',
        priority: 75,
      })),
      ...data.journals.map((item) => {
        const pain = getPainValue(item);
        const journalDate =
          safeDate(item?.data_registro)?.getTime() ||
          safeDate(item?.created_at)?.getTime() ||
          safeDate(item?.criado_em)?.getTime() ||
          safeDate(item?.updated_at)?.getTime() ||
          latestDate(item);

        const exerciseText =
          Number(item?.total_exercicios) > 0
            ? ` Exercícios: ${Number(item?.concluidos_count || 0)}/${Number(item?.total_exercicios)}.`
            : '';

        return {
          type: 'Diário',
          title: pain !== null ? `Dor ${pain}/10` : 'Registro de dor',
          description: `${item.notas || item.observacoes || item.descricao || item.sintomas || 'Registro rápido do paciente.'}${exerciseText}`,
          date: journalDate,
          icon: HeartPulse,
          href: tabPath('diario'),
          actionLabel: 'Abrir diário',
          priority: 60,
        };
      }),
      ...usefulAppointments.map((item) => ({
        type: 'Sessão',
        title: item.servico || item.tipo || `Sessão ${item.status || ''}`.trim(),
        description: item.observacoes || (item.status ? `Status: ${item.status}` : 'Sessão vinculada ao tratamento.'),
        date: appointmentDate(item)?.getTime() || latestDate(item),
        icon: Calendar,
        href: tabPath('historico'),
        actionLabel: 'Abrir histórico',
        priority: 50 + appointmentPriority(item),
      })),
      ...data.protocols.map((item) => ({
        type: 'Protocolo',
        title: item.titulo || 'Protocolo de exercícios',
        description: item.observacoes || 'Prescrição de exercícios vinculada ao tratamento.',
        date: latestDate(item),
        icon: Activity,
        href: tabPath('prescricoes'),
        actionLabel: 'Abrir prescrições',
        priority: 55,
      })),
      ...data.directPrescriptions.map((item) => ({
        type: 'Exercício',
        title: item.exercicio?.nome || item.nome || 'Exercício prescrito',
        description: item.observacoes || item.exercicio?.descricao || 'Exercício prescrito pelo fisioterapeuta.',
        date: latestDate(item),
        icon: Activity,
        href: tabPath('prescricoes'),
        actionLabel: 'Abrir prescrições',
        priority: 55,
      })),
      ...data.documents.map((item) => {
        const docUrl = getDocumentUrl(item);
        const externalUrl = typeof docUrl === 'string' && /^https?:\/\//i.test(docUrl) ? docUrl : '';
        return {
          type: 'Documento',
          title: item.title || item.titulo || item.type || item.tipo || item.filename || item.nome || 'Documento clínico',
          description: item.description || item.descricao || 'Documento gerado no tratamento.',
          date: latestDate(item),
          icon: FileText,
          href: externalUrl || tabPath(item.source === 'arquivo_paciente' || item.isClinicalFile ? 'arquivos' : 'documentos'),
          external: Boolean(externalUrl),
          actionLabel: externalUrl ? 'Abrir documento' : 'Abrir documentos',
          priority: 45,
        };
      }),
    ].filter((item) => item.date > 0);

    const dedupedEvents = uniqueByKey(
      rawEvents
        .sort((a, b) => (b.priority || 0) - (a.priority || 0) || b.date - a.date),
      timelineEventKey,
    );

    return dedupedEvents
      .sort((a, b) => b.date - a.date)
      .slice(0, compact ? 4 : 10);
  }, [data, compact, isPhysioMode, patientDetailsPath]);

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-violet-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-center gap-3 text-violet-700 font-black">
          <Loader2 className="animate-spin" size={22} /> Carregando Jornada de Recuperação...
        </div>
      </div>
    );
  }

  return (
    <section className="quick-action-register-evolution min-h-full">
      <div className={cn(compact ? 'p-0' : 'mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8', 'space-y-6')}>
        {checkinOpen && !isPhysioMode && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-4 sm:items-center">
            <div className="w-full max-w-xl rounded-[2rem] border border-violet-200 bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">Diário inteligente</p>
                  <h2 className="mt-1 text-2xl font-black text-violet-800">Registrar evolução de hoje</h2>
                  <p className="mt-1 text-sm font-bold text-slate-700">Esse check-in alimenta a Jornada, os alertas e o resumo inteligente.</p>
                </div>
                <button type="button" onClick={() => setCheckinOpen(false)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-700">Fechar</button>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-black text-slate-900">Dor hoje</label>
                    <span className="text-lg font-black text-violet-800">{checkinPain ?? '-'}/10</span>
                  </div>
                  <div className="grid grid-cols-11 gap-1">
                    {Array.from({ length: 11 }, (_, value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setCheckinPain(value)}
                        className={cn(
                          'rounded-xl border px-0 py-2 text-xs font-black transition-all',
                          checkinPain === value ? 'border-violet-700 bg-violet-700 text-white' : 'border-violet-100 bg-violet-50 text-violet-800 hover:bg-violet-100'
                        )}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-black text-slate-900">Exercícios de hoje</label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {[
                      { value: 'todos', label: 'Fiz todos' },
                      { value: 'parcial', label: 'Parcial' },
                      { value: 'nao', label: 'Não fiz' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setCheckinExerciseStatus(option.value as 'todos' | 'parcial' | 'nao')}
                        className={cn(
                          'rounded-2xl border px-3 py-3 text-sm font-black transition-all',
                          checkinExerciseStatus === option.value ? 'border-violet-700 bg-violet-700 text-white' : 'border-violet-100 bg-white text-slate-800 hover:bg-violet-50'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-black text-slate-900">Como você se sente em relação ao último registro?</label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {[
                      { value: 'melhor', label: 'Melhor' },
                      { value: 'igual', label: 'Igual' },
                      { value: 'pior', label: 'Pior' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setCheckinMood(option.value as 'melhor' | 'igual' | 'pior')}
                        className={cn(
                          'rounded-2xl border px-3 py-3 text-sm font-black transition-all',
                          checkinMood === option.value ? 'border-violet-700 bg-violet-700 text-white' : 'border-violet-100 bg-white text-slate-800 hover:bg-violet-50'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-black text-slate-900">Observações rápidas</label>
                  <textarea
                    value={checkinNotes}
                    onChange={(event) => setCheckinNotes(event.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-violet-100 bg-white p-3 text-sm font-semibold text-slate-900 outline-none ring-violet-200 placeholder:text-slate-400 focus:ring-4"
                    placeholder="Ex.: senti menos dor ao levantar, tive dificuldade no agachamento..."
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveCheckin}
                  disabled={savingCheckin}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-700 px-5 py-4 text-sm font-black text-white transition-all hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingCheckin && <Loader2 className="animate-spin" size={18} />}
                  Salvar check-in na Jornada
                </button>
              </div>
            </div>
          </div>
        )}

        {error && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">{error}</div>}

        <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] border border-violet-200 bg-white p-5 md:p-7 shadow-[0_20px_70px_rgba(88,28,135,0.10)]">
          <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-purple-100 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <img src={patient?.avatar_url || patient?.foto_url || profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetPatientId}`} alt={patientName} className="h-16 w-16 rounded-2xl border-4 border-violet-200 object-cover shadow-sm" />
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-violet-700"><Sparkles size={12} /> FisioJourney</div>
                <h1 className="text-2xl md:text-4xl font-black tracking-tight text-violet-800">Jornada de Recuperação</h1>
                <p className="mt-1 text-sm md:text-base font-bold text-slate-800">{isPhysioMode ? `Visão completa da evolução de ${patientName}.` : 'Acompanhe sua evolução de forma simples, visual e motivadora.'}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-[1.5rem] border border-violet-200 bg-violet-50/70 p-3 text-center">
              <div><p className="text-2xl font-black text-violet-800">{metrics.progress}%</p><p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Progresso</p></div>
              <div className="border-x border-violet-200 px-3"><p className="text-2xl font-black text-violet-800">{metrics.currentPain ?? '-'}/10</p><p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Dor atual</p></div>
              <div><p className="text-2xl font-black text-violet-800">{metrics.exerciseAdherence}%</p><p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Adesão</p></div>
            </div>
          </div>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Melhora da dor', value: `${metrics.painImprovement}%`, icon: HeartPulse, tone: 'text-rose-600 bg-rose-50 border-rose-100' },
                { label: 'Sessões', value: metrics.completedAppointments, icon: Calendar, tone: 'text-violet-700 bg-violet-50 border-violet-200' },
                { label: 'Exercícios', value: metrics.totalExercises, icon: Activity, tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
                { label: 'Documentos', value: data.documents.length, icon: FileText, tone: 'text-blue-700 bg-blue-50 border-blue-100' },
              ].map((item) => (
                <div key={item.label} className="rounded-[1.5rem] border border-violet-200 bg-white p-4 shadow-[0_14px_35px_rgba(15,23,42,0.10)]">
                  <div className={cn('mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border', item.tone)}><item.icon size={22} /></div>
                  <p className="text-2xl font-black text-slate-950">{item.value}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-700">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="w-full max-w-full min-w-0 overflow-hidden rounded-[2rem] border border-violet-200 bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.10)]">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-violet-800">Linha do tempo clínica</h2>
                  <p className="text-sm font-bold text-slate-700">Tudo importante da recuperação em ordem cronológica.</p>
                </div>
                <Target className="text-violet-700" />
              </div>
              {timeline.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-violet-300 bg-violet-50 p-6 text-center">
                  <p className="font-black text-violet-800">A jornada ainda está começando.</p>
                  <p className="mt-1 text-sm font-bold text-slate-700">Conforme houver diário, exercícios, documentos e evoluções, tudo aparecerá aqui.</p>
                </div>
              ) : (
                <div className="w-full max-w-full min-w-0 space-y-4 overflow-hidden">
                  {timeline.map((item, index) => {
                    const cardContent = (
                      <>
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-black text-violet-800">{item.type}</p>
                          <p className="text-xs font-extrabold text-slate-700">{formatDateBR(new Date(item.date).toISOString())}</p>
                        </div>
                        <h3 className="mt-1 text-base font-black text-slate-950">{item.title}</h3>
                        <p className="mt-1 max-w-full break-words text-sm font-bold leading-relaxed text-slate-800 [overflow-wrap:anywhere]">{item.description}</p>
                        {item.href && <p className="mt-3 inline-flex items-center gap-1 text-xs font-black text-violet-700">{item.actionLabel || 'Ver detalhes'} <ArrowRight size={14} /></p>}
                      </>
                    );

                    return (
                      <div key={`${item.type}-${item.date}-${index}`} className="relative grid w-full max-w-full min-w-0 grid-cols-[44px_minmax(0,1fr)] gap-4 overflow-hidden">
                        <div className="flex flex-col items-center">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-700 text-white shadow-sm"><item.icon size={20} /></div>
                          {index < timeline.length - 1 && <div className="mt-2 h-full min-h-8 w-px bg-purple-100" />}
                        </div>
                        {item.href ? (
                          item.external ? (
                            <a href={item.href} target="_blank" rel="noreferrer" className="w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-violet-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-md">
                              {cardContent}
                            </a>
                          ) : (
                            <Link to={item.href} className="w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-violet-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-md">
                              {cardContent}
                            </Link>
                          )
                        ) : (
                          <div className="w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                            {cardContent}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border border-violet-200 bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.10)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-700 text-white"><Sparkles size={22} /></div>
                <div>
                  <h2 className="text-xl font-black text-violet-800">Resumo inteligente</h2>
                  <p className="text-sm font-bold text-slate-700">Leitura rápida para orientar a próxima conduta.</p>
                </div>
              </div>
              <div className="rounded-2xl bg-violet-50 p-4">
                <p className="text-sm md:text-base font-semibold leading-relaxed text-slate-900">{smartSummary.mainText}</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {smartSummary.insights.map((insight) => (
                    <div key={insight} className="rounded-xl border border-violet-100 bg-white px-3 py-2 text-xs font-black text-slate-800">
                      {insight}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-[2rem] border border-violet-200 bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.10)]">
              <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-black text-violet-800">Próximo passo</h2><Trophy className="text-violet-700" size={22} /></div>
              {metrics.nextAppointment ? (
                <div className="rounded-2xl bg-violet-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-violet-700">Próxima sessão</p>
                  <p className="mt-2 text-xl font-black text-slate-950">{formatDateBR(metrics.nextAppointment.date.toISOString())}</p>
                  <p className="text-sm font-bold text-slate-700">{formatHourBR(metrics.nextAppointment.date.toISOString())}</p>
                </div>
              ) : (
                <div className="rounded-2xl bg-violet-50 p-4">
                  <p className="font-black text-slate-950">Sem sessão futura registrada.</p>
                  <p className="mt-1 text-sm font-bold text-slate-700">O próximo agendamento aparecerá aqui automaticamente.</p>
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border border-violet-200 bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.10)]">
              <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-black text-violet-800">Alertas inteligentes</h2><Zap className="text-violet-700" size={22} /></div>
              <div className="space-y-3">
                {metrics.alerts.length === 0 ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2 font-black text-emerald-800"><CheckCircle2 size={18} /> Tudo estável</div>
                    <p className="mt-1 text-sm font-bold text-slate-800">Nenhum alerta importante no momento.</p>
                  </div>
                ) : metrics.alerts.map((alert, index) => (
                  <div key={`${alert.title}-${index}`} className={cn('rounded-2xl border p-4', alert.type === 'danger' ? 'border-rose-100 bg-rose-50' : alert.type === 'success' ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50')}>
                    <div className={cn('flex items-center gap-2 font-black', alert.type === 'danger' ? 'text-rose-700' : alert.type === 'success' ? 'text-emerald-800' : 'text-amber-800')}>
                      {alert.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}{alert.title}
                    </div>
                    <p className="mt-1 text-sm font-bold text-slate-800">{alert.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-violet-200 bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.10)]">
              <h2 className="text-lg font-black text-violet-800">Ações rápidas</h2>
              <div className="mt-4 grid gap-3">
                {!isPhysioMode && <button onClick={() => setCheckinOpen(true)} className="flex items-center justify-between rounded-2xl bg-violet-700 px-4 py-3 font-black text-white hover:bg-violet-800 transition-all">Registrar evolução <ArrowRight size={18} /></button>}
                <Link to={isPhysioMode ? `${patientDetailsPath}?tab=ficha` : '/treinos'} className="flex items-center justify-between rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 font-black text-violet-800 hover:bg-purple-100 transition-all">
                  {isPhysioMode ? 'Ver dados do paciente' : 'Ver exercícios'} <Activity size={18} />
                </Link>
                <Link to="/chat" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-950 hover:border-violet-300 transition-all">Mensagens <MessageCircle size={18} /></Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-violet-200 bg-violet-700 p-5 text-white shadow-sm">
              <div className="flex items-center gap-3"><Users size={24} /><div><h2 className="text-lg font-black">Modo família</h2><p className="text-sm font-semibold text-violet-100">Preparado para uma próxima fase com convite seguro para cuidador/familiar.</p></div></div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
