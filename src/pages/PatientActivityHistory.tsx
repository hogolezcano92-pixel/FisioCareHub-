import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft,
  Activity,
  Calendar,
  FileText,
  HeartPulse,
  Loader2,
  Search,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import ActivityTimeline from '../components/FisioCare/ActivityTimeline';

type ActivityDetailField = {
  label: string;
  value?: any;
};

type ActivityDetailSection = {
  title: string;
  fields: ActivityDetailField[];
};

type ActivityItem = {
  id: string;
  tipo_acao: string;
  descricao: string;
  created_at: string;
  referencia_id?: string;
  paciente_id?: string;
  atendimento_id?: string;
  source_table?: string;
  raw_details?: Record<string, any> | null;
  detail_sections?: ActivityDetailSection[];
};

type PatientInfo = {
  id: string;
  perfil_id?: string | null;
  nome_completo?: string | null;
  nome?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  foto_url?: string | null;
};

const normalizeText = (value = '') =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const getPatientName = (patient?: PatientInfo | null) =>
  patient?.nome_completo || patient?.nome || 'Paciente';

const getPatientAvatar = (patient?: PatientInfo | null) =>
  patient?.avatar_url || patient?.foto_url || null;

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'P';

const getTriageRegion = (triage: any) =>
  triage?.area_corpo ||
  triage?.regiao ||
  triage?.local_dor ||
  triage?.queixa_principal ||
  'Triagem';

const getTriageCreatedAt = (triage: any) =>
  triage?.created_at || triage?.data_triagem || triage?.updated_at || new Date().toISOString();

const getAppointmentCreatedAt = (appointment: any) =>
  appointment?.updated_at ||
  appointment?.created_at ||
  appointment?.data_servico ||
  appointment?.data ||
  appointment?.data_horario ||
  new Date().toISOString();

const defaultChecklistExercises: Record<string, any> = {
  '1': {
    nome: 'Alongamento de Isquiotibiais',
    descricao: 'Mantenha a perna esticada por 30 segundos.',
    duracao: '30 segundos',
  },
  '2': {
    nome: 'Fortalecimento de Quadríceps',
    descricao: 'Extensão de joelho com caneleira.',
    series: '3',
    repeticoes: '15',
  },
  '3': {
    nome: 'Exercício de Equilíbrio',
    descricao: 'Ficar em um pé só por 1 minuto.',
    duracao: '1 minuto',
  },
};

const getFirstValue = (source: any, keys: string[]) => {
  if (!source) return undefined;
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
};

const isUuidLike = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const makeSection = (title: string, fields: ActivityDetailField[]): ActivityDetailSection | null => {
  const cleanFields = fields.filter((field) => field.value !== undefined && field.value !== null && field.value !== '');
  return cleanFields.length > 0 ? { title, fields: cleanFields } : null;
};

const mergeExerciseDetails = (item: any, exercise?: any) => ({
  ...exercise,
  ...item,
  exercicio_nome:
    item?.exercicio_nome ||
    item?.nome ||
    item?.exercicio?.nome ||
    exercise?.nome ||
    exercise?.titulo ||
    exercise?.title,
  descricao_exercicio:
    item?.descricao_exercicio ||
    item?.descricao ||
    item?.description ||
    exercise?.descricao ||
    exercise?.description,
  instrucoes:
    item?.instrucoes ||
    item?.orientacoes ||
    item?.observacoes ||
    item?.observacoes_especificas ||
    exercise?.instrucoes ||
    exercise?.orientacoes,
});

const buildTriageSections = (triage: any): ActivityDetailSection[] => {
  const sections = [
    makeSection('Relatório da triagem', [
      { label: 'Região avaliada', value: getFirstValue(triage, ['area_corpo', 'regiao', 'local_dor', 'regiao_dor', 'parte_corpo', 'queixa_principal']) },
      { label: 'Classificação/risco', value: getFirstValue(triage, ['gravidade', 'risco', 'nivel_risco', 'classificacao', 'urgencia', 'cor_risco']) },
      { label: 'Queixa principal', value: getFirstValue(triage, ['queixa_principal', 'queixa', 'motivo', 'sintomas']) },
      { label: 'Dor informada', value: getFirstValue(triage, ['nivel_dor', 'dor', 'intensidade_dor', 'escala_dor']) },
      { label: 'Tempo de sintomas', value: getFirstValue(triage, ['tempo_sintomas', 'duracao', 'inicio_sintomas']) },
      { label: 'Sinais de alerta', value: getFirstValue(triage, ['sinais_alerta', 'red_flags', 'alertas']) },
      { label: 'Recomendação da IA', value: getFirstValue(triage, ['recomendacao_ia', 'recomendacao', 'orientacao_ia', 'orientacoes']) },
      { label: 'Resumo/relatório', value: getFirstValue(triage, ['relatorio', 'resultado', 'resumo', 'analise', 'observacoes', 'observacao']) },
    ]),
    makeSection('Respostas registradas', [
      { label: 'Perguntas e respostas', value: getFirstValue(triage, ['respostas', 'answers', 'questionario', 'metadata']) },
    ]),
  ];
  return sections.filter(Boolean) as ActivityDetailSection[];
};

const buildExerciseSections = (item: any, completed = false): ActivityDetailSection[] => {
  const sections = [
    makeSection(completed ? 'Exercício realizado pelo paciente' : 'Exercício prescrito', [
      { label: 'Exercício', value: getFirstValue(item, ['exercicio_nome', 'nome_exercicio', 'nome', 'titulo', 'title']) },
      { label: 'Status', value: completed ? 'Realizado pelo paciente' : getFirstValue(item, ['status']) },
      { label: 'Séries', value: getFirstValue(item, ['series', 'serie']) },
      { label: 'Repetições', value: getFirstValue(item, ['repeticoes', 'repetições', 'reps']) },
      { label: 'Duração/tempo', value: getFirstValue(item, ['duracao', 'duration', 'tempo']) },
      { label: 'Frequência', value: getFirstValue(item, ['frequencia', 'frequência']) },
      { label: 'Carga', value: getFirstValue(item, ['carga', 'peso']) },
      { label: 'Descrição do exercício', value: getFirstValue(item, ['descricao_exercicio', 'descricao', 'description']) },
      { label: 'Instruções/observações', value: getFirstValue(item, ['instrucoes', 'instruções', 'orientacoes', 'observacoes', 'observacoes_especificas']) },
      { label: 'Data de conclusão', value: getFirstValue(item, ['data_conclusao', 'concluido_em']) },
    ]),
  ];
  return sections.filter(Boolean) as ActivityDetailSection[];
};

const buildPatientActivities = (
  historico: any[] = [],
  triagens: any[] = [],
  agendamentos: any[] = [],
  prontuarios: any[] = [],
  evolucoes: any[] = [],
  registrosPaciente: any[] = [],
  checklistExercicios: any[] = [],
  exerciciosPaciente: any[] = [],
  exerciseDetailsById: Record<string, any> = {},
  documentos: any[] = [],
): ActivityItem[] => {
  const syntheticTriages = (triagens || []).map((triage: any) => ({
    id: `triage-${triage.id}`,
    tipo_acao: 'triagem_realizada',
    descricao: `Triagem IA realizada: ${getTriageRegion(triage)}${triage?.gravidade ? ` • ${triage.gravidade}` : ''}`,
    created_at: getTriageCreatedAt(triage),
    referencia_id: triage.id,
    paciente_id: triage.paciente_id,
    source_table: 'triagens',
    raw_details: triage,
    detail_sections: buildTriageSections(triage),
  }));

  const syntheticAppointments = (agendamentos || []).map((appointment: any) => ({
    id: `appointment-${appointment.id}`,
    tipo_acao: appointment?.status === 'concluido' ? 'agendamento_concluido' : 'agendamento_criado',
    descricao:
      appointment?.status === 'concluido'
        ? 'Consulta concluída'
        : `Consulta ${appointment?.status || 'agendada'}`,
    created_at: getAppointmentCreatedAt(appointment),
    referencia_id: appointment.id,
    paciente_id: appointment.paciente_id,
    source_table: 'agendamentos',
    raw_details: appointment,
  }));

  const syntheticProntuarios = (prontuarios || []).map((item: any) => ({
    id: `prontuario-${item.id}`,
    tipo_acao: 'prontuario_criado',
    descricao: item?.tipo_atendimento
      ? `Prontuário ${item.tipo_atendimento} salvo`
      : 'Prontuário clínico salvo',
    created_at: item?.data_registro || item?.created_at || item?.updated_at || new Date().toISOString(),
    referencia_id: item.id,
    paciente_id: item.paciente_id,
    source_table: 'prontuarios',
    raw_details: item,
  }));

  const syntheticEvolucoes = (evolucoes || []).map((item: any) => ({
    id: `evolucao-${item.id}`,
    tipo_acao: 'evolucao_registrada',
    descricao: 'Evolução clínica registrada',
    created_at: item?.data_evolucao || item?.created_at || item?.updated_at || new Date().toISOString(),
    referencia_id: item.id,
    paciente_id: item.paciente_id,
    atendimento_id: item.atendimento_id,
    source_table: 'evolucoes',
    raw_details: item,
  }));

  const syntheticRegistros = (registrosPaciente || []).map((item: any) => ({
    id: `registro-paciente-${item.id || item.data_registro}`,
    tipo_acao: item?.nivel_dor !== undefined && item?.nivel_dor !== null
      ? 'diario_dor_registrado'
      : 'melhoria_registrada',
    descricao:
      item?.nivel_dor !== undefined && item?.nivel_dor !== null
        ? `Diário de dor registrado • Dor ${item.nivel_dor}/10${item?.notas ? ` • ${item.notas}` : ''}`
        : item?.notas || 'Melhoria registrada pelo paciente',
    created_at: item?.created_at || item?.data_registro || item?.updated_at || new Date().toISOString(),
    referencia_id: item.id || item.data_registro,
    paciente_id: item.paciente_id,
    source_table: 'registros_paciente',
    raw_details: item,
  }));

  const syntheticCompletedExercises = (checklistExercicios || [])
    .filter((item: any) => item?.concluido || item?.data_conclusao)
    .map((item: any) => {
      const exercise = exerciseDetailsById[String(item.exercicio_id)] || defaultChecklistExercises[String(item.exercicio_id)] || {};
      const details = mergeExerciseDetails(item, exercise);
      return {
        id: `exercicio-realizado-${item.id}`,
        tipo_acao: 'exercicio_realizado',
        descricao: details?.exercicio_nome
          ? `Exercício realizado: ${details.exercicio_nome}`
          : 'Exercício realizado pelo paciente',
        created_at: item?.data_conclusao || item?.updated_at || item?.created_at || new Date().toISOString(),
        referencia_id: item.id || item.exercicio_id,
        paciente_id: item.paciente_id,
        source_table: 'checklist_exercicios',
        raw_details: details,
        detail_sections: buildExerciseSections(details, true),
      };
    });

  const syntheticExercises = (exerciciosPaciente || []).map((item: any) => {
    const exercise = exerciseDetailsById[String(item.exercicio_id)] || item?.exercicio || {};
    const details = mergeExerciseDetails(item, exercise);
    return {
      id: `exercicio-${item.id}`,
      tipo_acao: 'exercicio_prescrito',
      descricao:
        details?.exercicio_nome
          ? `Exercício prescrito: ${details.exercicio_nome}`
          : 'Exercício prescrito para o paciente',
      created_at: item?.created_at || item?.updated_at || new Date().toISOString(),
      referencia_id: item.id,
      paciente_id: item.paciente_id,
      source_table: 'exercicios_paciente',
      raw_details: details,
      detail_sections: buildExerciseSections(details, false),
    };
  });

  const syntheticDocuments = (documentos || []).map((item: any) => ({
    id: `documento-${item.id}`,
    tipo_acao: 'documento_gerado',
    descricao:
      item?.tipo_documento || item?.tipo || item?.titulo
        ? `Documento gerado: ${item.tipo_documento || item.tipo || item.titulo}`
        : 'Documento clínico gerado',
    created_at: item?.created_at || item?.data_geracao || item?.updated_at || new Date().toISOString(),
    referencia_id: item.id,
    paciente_id: item.paciente_id,
    source_table: 'documentos_gerados',
    raw_details: item,
  }));

  const unique = new Map<string, ActivityItem>();
  [
    ...(historico || []),
    ...syntheticTriages,
    ...syntheticAppointments,
    ...syntheticProntuarios,
    ...syntheticEvolucoes,
    ...syntheticRegistros,
    ...syntheticCompletedExercises,
    ...syntheticExercises,
    ...syntheticDocuments,
  ]
    .filter(Boolean)
    .forEach((activity: any) => {
      const key = String(
        activity?.id || `${activity?.tipo_acao}-${activity?.referencia_id}-${activity?.created_at}`,
      );
      if (!unique.has(key)) unique.set(key, activity as ActivityItem);
    });

  return Array.from(unique.values()).sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
  );
};

const filterOptions = [
  { key: 'todos', label: 'Todos' },
  { key: 'dor', label: 'Dor' },
  { key: 'triagem', label: 'Triagens' },
  { key: 'exercicio', label: 'Exercícios' },
  { key: 'melhoria', label: 'Melhorias' },
  { key: 'consulta', label: 'Consultas' },
  { key: 'documento', label: 'Documentos' },
];

export default function PatientActivityHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('todos');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      if (!id || !profile?.id) return;
      setLoading(true);

      try {
        const decodedId = decodeURIComponent(id);
        const patientIds = new Set<string>([decodedId]);
        let patientInfo: PatientInfo | null = null;

        const [internalById, internalByProfileId, profileResult] = await Promise.allSettled([
          supabase
            .from('pacientes')
            .select('id, perfil_id, nome_completo, nome, email, avatar_url, foto_url')
            .eq('id', decodedId)
            .maybeSingle(),
          supabase
            .from('pacientes')
            .select('id, perfil_id, nome_completo, nome, email, avatar_url, foto_url')
            .eq('perfil_id', decodedId)
            .maybeSingle(),
          supabase
            .from('perfis')
            .select('id, nome_completo, email, avatar_url, foto_url')
            .eq('id', decodedId)
            .maybeSingle(),
        ]);

        const addPatient = (value: any) => {
          if (!value) return;
          patientInfo = { ...(patientInfo || {}), ...value };
          if (value.id) patientIds.add(String(value.id));
          if (value.perfil_id) patientIds.add(String(value.perfil_id));
        };

        if (internalById.status === 'fulfilled' && !internalById.value.error) addPatient(internalById.value.data);
        if (internalByProfileId.status === 'fulfilled' && !internalByProfileId.value.error) addPatient(internalByProfileId.value.data);
        if (profileResult.status === 'fulfilled' && !profileResult.value.error) addPatient(profileResult.value.data);

        if (patientInfo?.email) {
          const { data: sameEmailProfile } = await supabase
            .from('perfis')
            .select('id, nome_completo, email, avatar_url, foto_url')
            .eq('email', patientInfo.email)
            .maybeSingle();
          if (sameEmailProfile) addPatient(sameEmailProfile);
        }

        const ids = Array.from(patientIds).filter(Boolean);

        const [
          historicoResult,
          triagesResult,
          appointmentsResult,
          prontuariosResult,
          evolucoesResult,
          registrosResult,
          checklistResult,
          exerciciosResult,
          documentosResult,
        ] = await Promise.allSettled([
          supabase
            .from('historico_atividades')
            .select('*')
            .in('usuario_id', ids)
            .order('created_at', { ascending: false })
            .limit(80),
          supabase
            .from('triagens')
            .select('*')
            .in('paciente_id', ids)
            .order('created_at', { ascending: false })
            .limit(80),
          supabase
            .from('agendamentos')
            .select('*')
            .in('paciente_id', ids)
            .eq('fisio_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(80),
          supabase
            .from('prontuarios')
            .select('*')
            .in('paciente_id', ids)
            .eq('fisio_id', profile.id)
            .order('data_registro', { ascending: false })
            .limit(80),
          supabase
            .from('evolucoes')
            .select('*')
            .in('paciente_id', ids)
            .order('created_at', { ascending: false })
            .limit(80),
          supabase
            .from('registros_paciente')
            .select('*')
            .in('paciente_id', ids)
            .order('data_registro', { ascending: false })
            .limit(120),
          supabase
            .from('checklist_exercicios')
            .select('*')
            .in('paciente_id', ids)
            .order('data_conclusao', { ascending: false })
            .limit(160),
          supabase
            .from('exercicios_paciente')
            .select('*')
            .in('paciente_id', ids)
            .order('created_at', { ascending: false })
            .limit(100),
          supabase
            .from('documentos_gerados')
            .select('*')
            .in('paciente_id', ids)
            .eq('fisio_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(80),
        ]);

        const read = (result: PromiseSettledResult<any>) =>
          result.status === 'fulfilled' && !result.value.error ? result.value.data || [] : [];

        const checklistRows = read(checklistResult);
        const prescriptionRows = read(exerciciosResult);
        const exerciseIds = Array.from(
          new Set(
            [...checklistRows, ...prescriptionRows]
              .map((item: any) => String(item?.exercicio_id || '').trim())
              .filter(Boolean),
          ),
        );

        let exerciseDetailsById: Record<string, any> = {};
        const exerciseTableIds = exerciseIds.filter(isUuidLike);
        if (exerciseTableIds.length > 0) {
          const { data: exerciseRows, error: exerciseError } = await supabase
            .from('exercicios')
            .select('*')
            .in('id', exerciseTableIds);

          if (!exerciseError && exerciseRows) {
            exerciseDetailsById = exerciseRows.reduce((acc: Record<string, any>, exercise: any) => {
              acc[String(exercise.id)] = exercise;
              return acc;
            }, {});
          }
        }

        const built = buildPatientActivities(
          read(historicoResult).map((item: any) => ({ ...item, raw_details: item })),
          read(triagesResult),
          read(appointmentsResult),
          read(prontuariosResult),
          read(evolucoesResult),
          read(registrosResult),
          checklistRows,
          prescriptionRows,
          exerciseDetailsById,
          read(documentosResult),
        );

        setPatient(patientInfo || { id: decodedId, nome_completo: 'Paciente' });
        setActivities(built);
      } catch (error) {
        console.error('Erro ao carregar histórico completo do paciente:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [id, profile?.id]);

  const patientName = getPatientName(patient);
  const patientAvatar = getPatientAvatar(patient);
  const lastActivity = activities[0];

  const filteredActivities = useMemo(() => {
    const normalizedSearch = normalizeText(search.trim());

    return activities.filter((activity) => {
      const text = normalizeText(`${activity.tipo_acao} ${activity.descricao} ${activity.source_table || ''}`);
      const matchesSearch = !normalizedSearch || text.includes(normalizedSearch);

      if (!matchesSearch) return false;
      if (selectedFilter === 'todos') return true;
      if (selectedFilter === 'dor') return text.includes('dor') || text.includes('diario');
      if (selectedFilter === 'consulta') return text.includes('agendamento') || text.includes('consulta');
      if (selectedFilter === 'melhoria') return text.includes('melhoria') || text.includes('melhora') || text.includes('evolucao');
      return text.includes(selectedFilter);
    });
  }, [activities, search, selectedFilter]);

  const summary = useMemo(() => {
    const painEvents = activities.filter((item) => normalizeText(item.tipo_acao + item.descricao).includes('dor')).length;
    const exerciseEvents = activities.filter((item) => normalizeText(item.tipo_acao + item.descricao).includes('exercicio')).length;
    const triageEvents = activities.filter((item) => normalizeText(item.tipo_acao + item.descricao).includes('triagem')).length;

    return { painEvents, exerciseEvents, triageEvents };
  }, [activities]);

  return (
    <div className="patient-activity-history-page min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/40 to-sky-50 px-4 pb-36 pt-5 text-slate-950 dark:from-slate-950 dark:via-slate-950 dark:to-cyan-950 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/85 text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:text-violet-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </button>

          <button
            type="button"
            onClick={() => navigate(`/patients/${encodeURIComponent(id || '')}`)}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-sky-500 px-4 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-lg shadow-violet-500/20 transition-all hover:-translate-y-0.5"
          >
            Abrir prontuário <FileText size={15} />
          </button>
        </div>

        <section className="patient-activity-hero relative overflow-hidden rounded-[2rem] border border-violet-100/80 bg-white/85 p-5 shadow-[0_24px_80px_rgba(124,58,237,0.14)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.06] sm:p-6">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-violet-600 via-blue-500 to-cyan-400" />
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-200/50 blur-3xl dark:bg-cyan-500/20" />
          <div className="pointer-events-none absolute -left-24 bottom-0 h-56 w-56 rounded-full bg-violet-200/60 blur-3xl dark:bg-violet-500/20" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              {patientAvatar ? (
                <img
                  src={patientAvatar}
                  alt={patientName}
                  className="h-16 w-16 shrink-0 rounded-3xl border border-white object-cover shadow-xl dark:border-white/10"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-600 to-sky-400 text-lg font-black text-white shadow-xl shadow-violet-500/20">
                  {getInitials(patientName)}
                </div>
              )}

              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-violet-700 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-violet-200">
                  <Sparkles size={11} /> Histórico de atividades
                </p>
                <h1 className="mt-2 truncate text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                  {patientName}
                </h1>
                <p className="mt-1 truncate text-sm font-semibold text-slate-500 dark:text-slate-300">
                  {patient?.email || 'Dor, triagens, exercícios, melhorias e consultas em uma tela.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:min-w-[280px]">
              <div className="rounded-2xl border border-white/70 bg-white/75 px-3 py-2 shadow-sm dark:border-white/10 dark:bg-black/20">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Eventos</p>
                <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{activities.length}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/75 px-3 py-2 shadow-sm dark:border-white/10 dark:bg-black/20">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Último</p>
                <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">
                  {lastActivity ? format(new Date(lastActivity.created_at), 'dd MMM', { locale: ptBR }) : '--'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="patient-activity-summary-grid grid grid-cols-3 gap-3">
          <div className="rounded-[1.5rem] border border-orange-100 bg-orange-50/90 p-4 shadow-sm dark:border-orange-300/10 dark:bg-orange-500/10">
            <HeartPulse className="mb-2 text-orange-500 dark:text-orange-300" size={20} />
            <p className="text-lg font-black">{summary.painEvents}</p>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Dor</p>
          </div>
          <div className="rounded-[1.5rem] border border-violet-100 bg-violet-50/90 p-4 shadow-sm dark:border-violet-300/10 dark:bg-violet-500/10">
            <Stethoscope className="mb-2 text-violet-500 dark:text-violet-300" size={20} />
            <p className="text-lg font-black">{summary.triageEvents}</p>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Triagens</p>
          </div>
          <div className="rounded-[1.5rem] border border-cyan-100 bg-cyan-50/90 p-4 shadow-sm dark:border-cyan-300/10 dark:bg-cyan-500/10">
            <Activity className="mb-2 text-cyan-500 dark:text-cyan-300" size={20} />
            <p className="text-lg font-black">{summary.exerciseEvents}</p>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Exercícios</p>
          </div>
        </div>

        <section className="patient-activity-filter-panel rounded-[2rem] border border-slate-200/80 bg-white/85 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950 dark:text-white">Linha do tempo completa</h2>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Registros organizados do mais recente para o mais antigo.
              </p>
            </div>

            <div className="relative sm:w-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar atividade..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:ring-violet-500/15"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filterOptions.map((option) => {
              const selected = selectedFilter === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSelectedFilter(option.key)}
                  className={cn(
                    'shrink-0 rounded-2xl border px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition-all',
                    selected
                      ? 'border-violet-300 bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                      : 'border-slate-200 bg-white/80 text-slate-500 hover:border-violet-200 hover:text-violet-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300',
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="patient-activity-timeline-shell rounded-[2rem] border border-violet-100/80 bg-gradient-to-br from-orange-50 via-white to-sky-50 p-4 shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-white/10 dark:from-white/[0.06] dark:via-white/[0.035] dark:to-cyan-500/10 sm:p-6">
          {loading ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
              <Loader2 className="mb-3 animate-spin text-violet-500" size={34} />
              <p className="font-black text-slate-700 dark:text-slate-200">Carregando histórico completo...</p>
            </div>
          ) : filteredActivities.length > 0 ? (
            <ActivityTimeline activities={filteredActivities} mode="patient" />
          ) : (
            <div className="rounded-[2rem] border border-dashed border-violet-200 bg-white/75 px-6 py-12 text-center dark:border-white/10 dark:bg-white/[0.04]">
              <Calendar size={42} className="mx-auto mb-3 text-violet-400 dark:text-violet-300" />
              <p className="font-black text-slate-700 dark:text-slate-200">Nenhuma atividade encontrada.</p>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                Tente outro filtro ou aguarde novos registros do paciente.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
