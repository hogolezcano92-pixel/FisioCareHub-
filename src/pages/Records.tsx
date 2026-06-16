import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Activity,
  AlertCircle,
  ChevronRight,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  HeartPulse,
  Loader2,
  Paperclip,
  Search,
  Stethoscope,
  User,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatDate, resolveStorageUrl } from '../lib/utils';
import { getLinkedClinicalPatients, getPatientVisibleIds } from '../services/patientLinkService';
import { downloadAvaliacaoPremiumPdf, downloadEvolucaoPremiumPdf, downloadFichaClinicaPremiumPdf } from '../services/premiumPdfService';

type SectionKey = 'resumo' | 'avaliacoes' | 'evolucoes' | 'documentos' | 'dor';

type ClinicalPatient = {
  id: string;
  nome?: string | null;
  nome_completo?: string | null;
  email?: string | null;
  telefone?: string | null;
  data_nascimento?: string | null;
  diagnostico?: string | null;
  observacoes?: string | null;
  fisioterapeuta_id?: string | null;
  perfil_id?: string | null;
  tipo_paciente?: string | null;
  origem?: string | null;
  foto_url?: string | null;
  avatar_url?: string | null;
};

const safeText = (value: any, fallback = 'Não informado') => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const firstFilled = (...values: any[]) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    return value;
  }
  return null;
};

const getPainLevel = (record: any) => {
  const value = firstFilled(
    record?.nivel_dor,
    record?.dor_escala,
    record?.escala_dor,
    record?.pain_level,
    record?.dor,
    record?.intensidade_dor,
  );

  if (value === null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
};

const formatPainLevel = (record: any) => {
  const pain = getPainLevel(record);
  return pain === null ? null : `${pain}/10`;
};

const getPainLocation = (record: any) => {
  return firstFilled(
    record?.local_dor,
    record?.regiao_dor,
    record?.regiao,
    record?.local,
    record?.area_dor,
  );
};

const getPainDescription = (record: any) => {
  return firstFilled(
    record?.descricao,
    record?.observacoes,
    record?.notas,
    record?.relato,
    record?.comentario,
  );
};

const getExerciseSummary = (record: any) => {
  const completed = Number(record?.concluidos_count ?? 0);
  const total = Number(record?.total_exercicios ?? 0);

  if (total > 0) return `${completed} de ${total} exercícios concluídos`;

  const exercises = Array.isArray(record?.exercicios_concluidos)
    ? record.exercicios_concluidos
    : [];

  if (exercises.length === 0) return null;

  const done = exercises.filter((exercise: any) => Boolean(exercise?.completed)).length;
  return `${done} de ${exercises.length} exercícios concluídos`;
};

const getPainFactors = (record: any) => {
  return firstFilled(
    record?.fatores,
    record?.fatores_melhora_piora,
    record?.fatores_melhora,
    record?.fatores_piora,
    record?.gatilhos,
    getExerciseSummary(record),
  );
};

const getPatientName = (patient?: ClinicalPatient | null) => {
  return safeText(patient?.nome_completo || patient?.nome, 'Paciente sem nome');
};

const getPatientPhoto = (patient?: ClinicalPatient | null) => {
  const raw = patient?.foto_url || patient?.avatar_url || '';
  return raw ? resolveStorageUrl(raw) : '';
};

const getPatientReadableIds = (patient?: ClinicalPatient | null) => {
  return Array.from(
    new Set(
      [patient?.id, patient?.perfil_id]
        .filter(Boolean)
        .map(String),
    ),
  );
};

const recordBelongsToPatient = (record: any, patient?: ClinicalPatient | null) => {
  if (!patient) return false;
  const ids = getPatientReadableIds(patient);
  return ids.includes(String(record?.paciente_id || ''));
};

const mergeRowsById = (...groups: any[][]) => {
  const map = new Map<string, any>();
  groups.flat().forEach((row) => {
    if (!row?.id) return;
    map.set(String(row.id), { ...(map.get(String(row.id)) || {}), ...row });
  });
  return Array.from(map.values());
};

const formatDateOnly = (value?: string | null) => {
  if (!value) return 'Data não informada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
};

const getFileName = (file: any) => {
  if (file?.nome_arquivo) return file.nome_arquivo;
  const raw = file?.arquivo_url || file?.file_path || file?.url || '';
  if (!raw) return 'Documento clínico';
  const last = String(raw).split('/').pop() || 'Documento clínico';
  return decodeURIComponent(last).replace(/^\d+-/, '').replace(/_/g, ' ');
};

const getBucketPath = (file: any) => {
  const raw = file?.file_path || file?.arquivo_url || file?.url || '';
  if (!raw || String(raw).startsWith('http')) return '';
  let path = String(raw).replace(/^\/+/, '');
  path = path.replace(/^storage\/v1\/object\/public\/documents\//, '');
  path = path.replace(/^documents\//, '');
  return path;
};

const getPublicDocumentUrl = (file: any) => {
  const raw = file?.arquivo_url || file?.file_path || file?.url || '';
  if (!raw) return '';
  if (String(raw).startsWith('http')) return String(raw);
  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
  const path = getBucketPath(file);
  return base && path ? `${base}/storage/v1/object/public/documents/${path}` : String(raw);
};

const openClinicalFile = async (file: any) => {
  const path = getBucketPath(file);
  if (path) {
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, 60 * 10);
    if (!error && data?.signedUrl) {
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      return;
    }
  }

  const url = getPublicDocumentUrl(file);
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
  else toast.error('Não foi possível abrir este documento.');
};

const downloadClinicalFile = async (file: any) => {
  const name = getFileName(file);
  const path = getBucketPath(file);

  if (path) {
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, 60 * 10, {
      download: name,
    });
    if (!error && data?.signedUrl) {
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
  }

  const url = getPublicDocumentUrl(file);
  if (url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    toast.error('Não foi possível baixar este documento.');
  }
};

export default function Records() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionKey>('resumo');
  const [clinicalPatients, setClinicalPatients] = useState<ClinicalPatient[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [evolutions, setEvolutions] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [painRecords, setPainRecords] = useState<any[]>([]);
  const [legacyRecords, setLegacyRecords] = useState<any[]>([]);
  const [loadWarnings, setLoadWarnings] = useState<string[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  const isPhysio = profile?.tipo_usuario === 'fisioterapeuta';

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }

    const load = async () => {
      setLoading(true);
      const warnings: string[] = [];

      try {
        if (profile?.tipo_usuario === 'fisioterapeuta') {
          const { data: physioPatients, error: patientsError } = await supabase
            .from('pacientes')
            .select('*')
            .eq('fisioterapeuta_id', user.id)
            .order('nome_completo', { ascending: true });

          if (patientsError) warnings.push(`Pacientes: ${patientsError.message}`);

          let patients = (physioPatients || []) as ClinicalPatient[];

          const linkedProfileIds = patients
            .map((patient) => patient.perfil_id)
            .filter(Boolean) as string[];
          const patientEmails = Array.from(
            new Set(
              patients
                .map((patient) => String(patient.email || '').trim().toLowerCase())
                .filter(Boolean),
            ),
          );

          if (linkedProfileIds.length > 0 || patientEmails.length > 0) {
            const profileQueries = [] as any[];
            if (linkedProfileIds.length > 0) {
              profileQueries.push(
                supabase
                  .from('perfis')
                  .select('id, nome_completo, email, telefone, data_nascimento, avatar_url, foto_url')
                  .in('id', linkedProfileIds),
              );
            }
            if (patientEmails.length > 0) {
              profileQueries.push(
                supabase
                  .from('perfis')
                  .select('id, nome_completo, email, telefone, data_nascimento, avatar_url, foto_url')
                  .in('email', patientEmails),
              );
            }

            const profileResults = await Promise.allSettled(profileQueries);
            const linkedProfiles = profileResults.flatMap((result: any) =>
              result.status === 'fulfilled' && !result.value.error ? result.value.data || [] : [],
            );

            if (linkedProfiles.length > 0) {
              const profilesById = new Map(linkedProfiles.map((item: any) => [String(item.id), item]));
              const profilesByEmail = new Map(
                linkedProfiles
                  .filter((item: any) => item.email)
                  .map((item: any) => [String(item.email).trim().toLowerCase(), item]),
              );

              patients = patients.map((patient) => {
                const linkedProfile = patient.perfil_id
                  ? profilesById.get(String(patient.perfil_id))
                  : profilesByEmail.get(String(patient.email || '').trim().toLowerCase());

                return {
                  ...patient,
                  perfil_id: patient.perfil_id || linkedProfile?.id || null,
                  nome_completo: patient.nome_completo || patient.nome || linkedProfile?.nome_completo || null,
                  email: patient.email || linkedProfile?.email || null,
                  telefone: patient.telefone || linkedProfile?.telefone || null,
                  data_nascimento: patient.data_nascimento || linkedProfile?.data_nascimento || null,
                  avatar_url: patient.avatar_url || linkedProfile?.avatar_url || null,
                  foto_url: patient.foto_url || linkedProfile?.foto_url || null,
                };
              });
            }
          }

          setClinicalPatients(patients);

          const clinicalIds = Array.from(new Set(patients.flatMap((p) => getPatientReadableIds(p))));

          if (clinicalIds.length > 0) {
            const { data: evalData, error: evalError } = await supabase
              .from('fichas_avaliacao')
              .select('*')
              .in('paciente_id', clinicalIds)
              .order('created_at', { ascending: false });
            if (evalError) warnings.push(`Avaliações: ${evalError.message}`);
            setEvaluations(evalData || []);

            const { data: evoData, error: evoError } = await supabase
              .from('evolucoes')
              .select('*')
              .in('paciente_id', clinicalIds)
              .order('created_at', { ascending: false });
            if (evoError) warnings.push(`Evoluções: ${evoError.message}`);
            setEvolutions(evoData || []);

            const { data: fileData, error: fileError } = await supabase
              .from('arquivos_paciente')
              .select('*')
              .in('paciente_id', clinicalIds)
              .order('created_at', { ascending: false });
            if (fileError) warnings.push(`Documentos: ${fileError.message}`);
            setFiles(fileData || []);

            const [{ data: painData, error: painError }, { data: painByPhysioData, error: painByPhysioError }] = await Promise.all([
              supabase
                .from('registros_paciente')
                .select('*')
                .in('paciente_id', clinicalIds)
                .order('data_registro', { ascending: false }),
              supabase
                .from('registros_paciente')
                .select('*')
                .eq('fisioterapeuta_id', user.id)
                .order('data_registro', { ascending: false }),
            ]);
            if (painError) warnings.push(`Diário de dor: ${painError.message}`);
            if (painByPhysioError) warnings.push(`Diário de dor vinculado: ${painByPhysioError.message}`);
            setPainRecords(mergeRowsById(painData || [], painByPhysioData || []));

            const { data: oldRecords, error: oldError } = await supabase
              .from('prontuarios')
              .select('*')
              .in('paciente_id', clinicalIds)
              .order('data_registro', { ascending: false });
            if (!oldError) setLegacyRecords(oldRecords || []);
          } else {
            setEvaluations([]);
            setEvolutions([]);
            setFiles([]);
            setPainRecords([]);
            setLegacyRecords([]);
          }

          setSelectedPatientId((current) => patients.some((patient) => patient.id === current) ? current : '');
          return;
        }

        const linked = await getLinkedClinicalPatients(user.id, profile?.email || user.email);
        const linkedPatients = linked as ClinicalPatient[];
        setClinicalPatients(linkedPatients);

        const patientIds = await getPatientVisibleIds(user.id, profile?.email || user.email);
        const clinicalIds = linkedPatients.map((p) => p.id).filter(Boolean);
        const allReadablePatientIds = Array.from(new Set([...patientIds, ...clinicalIds].filter(Boolean)));

        if (allReadablePatientIds.length > 0) {
          const { data: evalData, error: evalError } = await supabase
            .from('fichas_avaliacao')
            .select('*')
            .in('paciente_id', allReadablePatientIds)
            .order('created_at', { ascending: false });
          if (evalError) warnings.push(`Avaliações: ${evalError.message}`);
          setEvaluations(evalData || []);

          const { data: evoData, error: evoError } = await supabase
            .from('evolucoes')
            .select('*')
            .in('paciente_id', allReadablePatientIds)
            .order('created_at', { ascending: false });
          if (evoError) warnings.push(`Evoluções: ${evoError.message}`);
          setEvolutions(evoData || []);

          const { data: fileData, error: fileError } = await supabase
            .from('arquivos_paciente')
            .select('*')
            .in('paciente_id', allReadablePatientIds)
            .order('created_at', { ascending: false });
          if (fileError) warnings.push(`Documentos: ${fileError.message}`);
          setFiles(fileData || []);

          const { data: painData, error: painError } = await supabase
            .from('registros_paciente')
            .select('*')
            .in('paciente_id', allReadablePatientIds)
            .order('data_registro', { ascending: false });
          if (!painError) setPainRecords(painData || []);
        }

        const { data: oldRecords, error: oldError } = await supabase
          .from('prontuarios')
          .select('*')
          .in('paciente_id', allReadablePatientIds)
          .order('data_registro', { ascending: false });
        if (!oldError) setLegacyRecords(oldRecords || []);
      } catch (error: any) {
        console.error('Erro ao carregar prontuário:', error);
        warnings.push(error?.message || 'Erro inesperado ao carregar prontuário.');
      } finally {
        setLoadWarnings(warnings);
        setLoading(false);
      }
    };

    load();
  }, [authLoading, user, profile?.email, profile?.tipo_usuario, navigate]);

  const patientStats = useMemo(() => {
    return clinicalPatients.map((patient) => ({
      patient,
      evaluations: evaluations.filter((item) => recordBelongsToPatient(item, patient)).length,
      evolutions: evolutions.filter((item) => recordBelongsToPatient(item, patient)).length,
      files: files.filter((item) => recordBelongsToPatient(item, patient)).length,
      pain: painRecords.filter((item) => recordBelongsToPatient(item, patient)).length,
      legacy: legacyRecords.filter((item) => recordBelongsToPatient(item, patient)).length,
    }));
  }, [clinicalPatients, evaluations, evolutions, files, painRecords, legacyRecords]);

  const filteredPatientStats = useMemo(() => {
    const term = patientSearch.trim().toLowerCase();
    if (!term) return patientStats;
    return patientStats.filter(({ patient }) => {
      return [patient.nome, patient.nome_completo, patient.email, patient.telefone, patient.diagnostico]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [patientSearch, patientStats]);

  const selectedPatient = useMemo(() => {
    return clinicalPatients.find((patient) => patient.id === selectedPatientId) || null;
  }, [clinicalPatients, selectedPatientId]);

  const scopedPatientId = isPhysio ? selectedPatient?.id : null;
  const visibleEvaluations = scopedPatientId ? evaluations.filter((item) => recordBelongsToPatient(item, selectedPatient)) : evaluations;
  const visibleEvolutions = scopedPatientId ? evolutions.filter((item) => recordBelongsToPatient(item, selectedPatient)) : evolutions;
  const visibleFiles = scopedPatientId ? files.filter((item) => recordBelongsToPatient(item, selectedPatient)) : files;
  const visiblePainRecords = scopedPatientId ? painRecords.filter((item) => recordBelongsToPatient(item, selectedPatient)) : painRecords;
  const visibleLegacyRecords = scopedPatientId ? legacyRecords.filter((item) => recordBelongsToPatient(item, selectedPatient)) : legacyRecords;
  const visibleClinicalPatients = scopedPatientId && selectedPatient ? [selectedPatient] : clinicalPatients;

  const totalRecords = visibleEvaluations.length + visibleEvolutions.length + visibleFiles.length + visiblePainRecords.length + visibleLegacyRecords.length + visibleClinicalPatients.length;
  const totalPhysioRecords = evaluations.length + evolutions.length + files.length + painRecords.length + legacyRecords.length;

  if (loading) {
    return (
      <div className="flex justify-center pt-20">
        <Loader2 className="animate-spin text-sky-500" size={44} />
      </div>
    );
  }

  const sections = [
    { id: 'resumo', label: 'Ficha clínica', icon: User, count: visibleClinicalPatients.length },
    { id: 'avaliacoes', label: 'Avaliações', icon: ClipboardList, count: visibleEvaluations.length },
    { id: 'evolucoes', label: 'Evoluções', icon: Activity, count: visibleEvolutions.length },
    { id: 'documentos', label: 'Exames e documentos', icon: Paperclip, count: visibleFiles.length + visibleLegacyRecords.length },
    { id: 'dor', label: 'Diário de dor', icon: HeartPulse, count: visiblePainRecords.length },
  ] as Array<{ id: SectionKey; label: string; icon: any; count: number }>;

  if (isPhysio) {
    return (
      <div className="space-y-8">
        <header className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Stethoscope size={24} />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-white tracking-tight">Prontuários dos Pacientes</h1>
                  <p className="text-slate-400 font-medium">Selecione um paciente para consultar ficha clínica, avaliações, evoluções, exames e registros.</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <p className="text-2xl font-black text-white">{clinicalPatients.length}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pacientes</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <p className="text-2xl font-black text-white">{totalPhysioRecords}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Registros</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <p className="text-2xl font-black text-white">{evaluations.length}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Avaliações</p>
              </div>
            </div>
          </div>
        </header>

        {loadWarnings.length > 0 && <Warnings warnings={loadWarnings} />}

        <section className="grid xl:grid-cols-[380px_1fr] gap-6">
          <aside className="bg-slate-900/50 backdrop-blur-xl p-5 rounded-[2.5rem] border border-white/10 shadow-2xl xl:sticky xl:top-6 h-fit">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Lista de pacientes</p>
                <h2 className="text-xl font-black text-white">Escolha o prontuário</h2>
              </div>
              <Users size={24} className="text-slate-600" />
            </div>

            <div className="relative mb-4">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={patientSearch}
                onChange={(event) => setPatientSearch(event.target.value)}
                placeholder="Buscar paciente..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>

            <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
              {filteredPatientStats.length === 0 ? (
                <div className="p-6 text-center border border-white/10 rounded-3xl bg-white/5">
                  <User size={34} className="mx-auto text-slate-700 mb-3" />
                  <p className="text-sm font-bold text-slate-400">Nenhum paciente encontrado.</p>
                </div>
              ) : filteredPatientStats.map(({ patient, evaluations: evalCount, evolutions: evoCount, files: fileCount, legacy }) => {
                const selected = selectedPatient?.id === patient.id;
                const total = evalCount + evoCount + fileCount + legacy;

                return (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => setSelectedPatientId(patient.id)}
                    className={cn(
                      'w-full text-left p-4 rounded-3xl border transition-all group',
                      selected
                        ? 'bg-sky-600/15 border-sky-500/40 shadow-lg shadow-sky-950/20'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-sky-500/20'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-11 h-11 rounded-2xl flex items-center justify-center border overflow-hidden',
                        selected ? 'bg-sky-500 text-white border-sky-400/40' : 'bg-slate-950/50 text-sky-400 border-white/10'
                      )}>
                        {getPatientPhoto(patient) ? (
                          <img src={getPatientPhoto(patient)} alt={getPatientName(patient)} className="w-full h-full object-cover" />
                        ) : (
                          <User size={20} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-black text-white truncate">{getPatientName(patient)}</h3>
                        <p className="text-[10px] font-bold text-slate-500 truncate">{safeText(patient.email, 'Sem e-mail')}</p>
                      </div>
                      <ChevronRight size={16} className={selected ? 'text-sky-300' : 'text-slate-600 group-hover:text-sky-400'} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <MiniStat label="Aval." value={evalCount} />
                      <MiniStat label="Evol." value={evoCount} />
                      <MiniStat label="Docs" value={fileCount + legacy} />
                    </div>
                    <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-500">{total > 0 ? `${total} registros clínicos` : 'Sem registros ainda'}</p>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="space-y-6 min-w-0">
            {!selectedPatient ? (
              <div className="bg-slate-900/50 backdrop-blur-xl p-16 rounded-[2.5rem] border border-white/10 text-center shadow-2xl">
                <FolderOpen size={54} className="text-slate-700 mx-auto mb-4" />
                <h3 className="text-2xl font-black text-white">Selecione um paciente</h3>
                <p className="text-slate-400 mt-2 font-medium">Clique em um paciente na lista para abrir ficha clínica, avaliações, evoluções, arquivos e registros.</p>
              </div>
            ) : (
              <>
                <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 overflow-hidden">
                        {getPatientPhoto(selectedPatient) ? (
                          <img src={getPatientPhoto(selectedPatient)} alt={getPatientName(selectedPatient)} className="w-full h-full object-cover" />
                        ) : (
                          <User size={28} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-sky-400">Prontuário selecionado</p>
                        <h2 className="text-2xl font-black text-white truncate">{getPatientName(selectedPatient)}</h2>
                        <p className="text-sm text-slate-400 font-medium truncate">{safeText(selectedPatient.diagnostico, 'Sem diagnóstico informado')}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <MiniMetric label="Avaliações" value={visibleEvaluations.length} />
                      <MiniMetric label="Evoluções" value={visibleEvolutions.length} />
                      <MiniMetric label="Arquivos" value={visibleFiles.length + visibleLegacyRecords.length} />
                    </div>
                  </div>
                </div>

                <RecordTabs sections={sections} activeSection={activeSection} onChange={setActiveSection} />

                {totalRecords === 0 && (
                  <div className="bg-slate-900/50 backdrop-blur-xl p-16 rounded-[2.5rem] border border-white/10 text-center shadow-2xl">
                    <FolderOpen size={48} className="text-slate-700 mx-auto mb-4" />
                    <h3 className="text-xl font-black text-white">Nenhum registro neste prontuário</h3>
                    <p className="text-slate-400 mt-2 font-medium">Avaliações, evoluções, anexos e documentos deste paciente aparecerão aqui.</p>
                  </div>
                )}

                <RecordsSection
                  activeSection={activeSection}
                  clinicalPatients={visibleClinicalPatients}
                  evaluations={visibleEvaluations}
                  evolutions={visibleEvolutions}
                  files={visibleFiles}
                  painRecords={visiblePainRecords}
                  legacyRecords={visibleLegacyRecords}
                  primaryPatient={selectedPatient}
                  userEmail={user.email}
                  profileName={profile?.nome_completo}
                />
              </>
            )}
          </div>
        </section>
      </div>
    );
  }

  const primaryPatient = clinicalPatients[0] || null;

  return (
    <div className="space-y-8">
      <header className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                <FileText size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Prontuário</h1>
                <p className="text-slate-400 font-medium">Ficha clínica, avaliações, evoluções, exames e documentos enviados pelo fisioterapeuta.</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <p className="text-2xl font-black text-white">{evaluations.length}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Avaliações</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <p className="text-2xl font-black text-white">{evolutions.length}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Evoluções</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <p className="text-2xl font-black text-white">{files.length}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Arquivos</p>
            </div>
          </div>
        </div>
      </header>

      {loadWarnings.length > 0 && <Warnings warnings={loadWarnings} />}

      <RecordTabs sections={sections} activeSection={activeSection} onChange={setActiveSection} />

      {totalRecords === 0 && (
        <div className="bg-slate-900/50 backdrop-blur-xl p-16 rounded-[2.5rem] border border-white/10 text-center shadow-2xl">
          <FolderOpen size={48} className="text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-black text-white">Nenhum prontuário encontrado</h3>
          <p className="text-slate-400 mt-2 font-medium">Quando o fisioterapeuta registrar avaliações, evoluções ou documentos, eles aparecerão aqui.</p>
        </div>
      )}

      <RecordsSection
        activeSection={activeSection}
        clinicalPatients={clinicalPatients}
        evaluations={evaluations}
        evolutions={evolutions}
        files={files}
        painRecords={painRecords}
        legacyRecords={legacyRecords}
        primaryPatient={primaryPatient}
        userEmail={user.email}
        profileName={profile?.nome_completo}
      />
    </div>
  );
}

function RecordsSection({
  activeSection,
  clinicalPatients,
  evaluations,
  evolutions,
  files,
  painRecords,
  legacyRecords,
  primaryPatient,
  userEmail,
  profileName,
}: {
  activeSection: SectionKey;
  clinicalPatients: ClinicalPatient[];
  evaluations: any[];
  evolutions: any[];
  files: any[];
  painRecords: any[];
  legacyRecords: any[];
  primaryPatient: ClinicalPatient | null;
  userEmail?: string | null;
  profileName?: string | null;
}) {
  if (activeSection === 'resumo') {
    return (
      <div className="grid lg:grid-cols-2 gap-6">
        {clinicalPatients.length === 0 ? (
          <EmptyCard icon={User} text="Nenhuma ficha clínica vinculada à sua conta." />
        ) : clinicalPatients.map((patient) => (
          <motion.div key={patient.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-sky-400 mb-1">Ficha clínica</p>
                <h3 className="text-2xl font-black text-white">{safeText(patient.nome_completo || patient.nome || profileName || userEmail)}</h3>
              </div>
              <button
                onClick={() => downloadFichaClinicaPremiumPdf(patient)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-[10px] font-black uppercase tracking-widest"
              >
                <Download size={14} /> PDF
              </button>
            </div>
            <InfoGrid rows={[
              ['E-mail', patient.email],
              ['Telefone', patient.telefone],
              ['Nascimento', formatDateOnly(patient.data_nascimento)],
              ['Tipo de paciente', patient.tipo_paciente],
              ['Diagnóstico', patient.diagnostico],
              ['Observações', patient.observacoes],
            ]} />
          </motion.div>
        ))}
      </div>
    );
  }

  if (activeSection === 'avaliacoes') {
    return (
      <div className="space-y-5">
        {evaluations.length === 0 ? <EmptyCard icon={ClipboardList} text="Nenhuma avaliação fisioterapêutica registrada." /> : evaluations.map((evaluation, index) => (
          <ClinicalCard
            key={evaluation.id}
            icon={ClipboardList}
            title={`Avaliação fisioterapêutica #${evaluations.length - index}`}
            date={evaluation.created_at || evaluation.updated_at}
            badge="Ficha de avaliação"
            onDownload={() => downloadAvaliacaoPremiumPdf(evaluation, primaryPatient)}
          >
            <InfoGrid rows={[
              ['Queixa principal', evaluation.queixa_principal],
              ['História atual', evaluation.historia_doenca_atual],
              ['Dor', evaluation.escala_dor ? `${evaluation.escala_dor}/10` : null],
              ['Diagnóstico fisioterapêutico', evaluation.diagnostico_fisio],
              ['Objetivos', evaluation.objetivos_terapeuticos],
              ['Conduta', evaluation.conduta],
              ['Prognóstico', evaluation.prognostico],
              ['Observações finais', evaluation.observacoes_finais],
            ]} />
          </ClinicalCard>
        ))}
      </div>
    );
  }

  if (activeSection === 'evolucoes') {
    return (
      <div className="space-y-5">
        {evolutions.length === 0 ? <EmptyCard icon={Activity} text="Nenhuma evolução clínica registrada." /> : evolutions.map((evolution, index) => (
          <ClinicalCard
            key={evolution.id}
            icon={Activity}
            title={`Evolução clínica #${evolutions.length - index}`}
            date={evolution.created_at}
            badge={evolution.dor_escala !== undefined && evolution.dor_escala !== null ? `Dor ${evolution.dor_escala}/10` : 'Evolução'}
            onDownload={() => downloadEvolucaoPremiumPdf(evolution, primaryPatient)}
          >
            <InfoGrid rows={[
              ['Escala de dor', evolution.dor_escala !== undefined && evolution.dor_escala !== null ? `${evolution.dor_escala}/10` : null],
              ['Descrição', evolution.descricao],
              ['Exercícios realizados', evolution.exercicios_realizados],
              ['Observações', evolution.observacoes],
              ['Plano terapêutico', evolution.plano],
            ]} />
          </ClinicalCard>
        ))}
      </div>
    );
  }

  if (activeSection === 'documentos') {
    return (
      <div className="space-y-5">
        {files.length === 0 && legacyRecords.length === 0 ? <EmptyCard icon={Paperclip} text="Nenhum exame, foto ou documento anexado." /> : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {files.map((file) => (
              <motion.div key={file.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl">
                <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20 mb-4">
                  <FileText size={28} />
                </div>
                <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">{safeText(file.tipo, 'Documento')}</p>
                <h3 className="text-lg font-black text-white line-clamp-2 mb-2">{getFileName(file)}</h3>
                <p className="text-xs text-slate-500 font-bold mb-5">{formatDate(file.created_at)}</p>
                <div className="flex gap-2">
                  <button onClick={() => openClinicalFile(file)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-sky-700 transition-all">
                    <ExternalLink size={14} /> Visualizar
                  </button>
                  <button onClick={() => downloadClinicalFile(file)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 text-slate-300 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 border border-white/10 transition-all">
                    <Download size={14} /> Baixar
                  </button>
                </div>
              </motion.div>
            ))}

            {legacyRecords.map((record) => (
              <motion.div key={record.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 mb-4">
                  <FileText size={28} />
                </div>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Registro antigo</p>
                <h3 className="text-lg font-black text-white mb-2">Registro de atendimento</h3>
                <p className="text-xs text-slate-500 font-bold mb-4">{formatDate(record.data_registro)}</p>
                <div className="text-sm text-slate-300 whitespace-pre-wrap line-clamp-5 mb-4">{typeof record.conteudo === 'string' ? record.conteudo : record.conteudo?.text}</div>
                {record.conteudo?.attachments?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {record.conteudo.attachments.map((url: string, index: number) => (
                      <button key={`${record.id}-${index}`} onClick={() => window.open(getPublicDocumentUrl({ arquivo_url: url }), '_blank')} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/10">
                        Anexo {index + 1}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {painRecords.length === 0 ? <EmptyCard icon={HeartPulse} text="Nenhum registro de diário de dor encontrado." /> : painRecords.map((item) => (
        <ClinicalCard key={item.id} icon={HeartPulse} title="Registro de dor" date={item.created_at || item.data_registro} badge={formatPainLevel(item) ? `Dor ${formatPainLevel(item)}` : 'Diário'}>
          <InfoGrid rows={[
            ['Dor', formatPainLevel(item)],
            ['Local', getPainLocation(item)],
            ['Descrição', getPainDescription(item)],
            ['Fatores de melhora/piora', getPainFactors(item)],
          ]} />
        </ClinicalCard>
      ))}
    </div>
  );
}

function Warnings({ warnings }: { warnings: string[] }) {
  return (
    <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-2xl text-sm font-bold flex gap-3">
      <AlertCircle size={20} className="shrink-0" />
      <div>
        <p>Algumas informações não puderam ser carregadas.</p>
        <ul className="mt-1 list-disc list-inside text-amber-200/80 font-medium">
          {warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      </div>
    </div>
  );
}

function RecordTabs({ sections, activeSection, onChange }: { sections: Array<{ id: SectionKey; label: string; icon: any; count: number }>; activeSection: SectionKey; onChange: (section: SectionKey) => void }) {
  return (
    <div className="flex gap-2 p-2 bg-slate-900/50 backdrop-blur-xl rounded-[2rem] border border-white/10 overflow-x-auto no-scrollbar shadow-lg">
      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <button
            key={section.id}
            onClick={() => onChange(section.id)}
            className={cn(
              'flex items-center gap-2 px-5 py-3 rounded-full font-black text-sm whitespace-nowrap transition-all',
              activeSection === section.id
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/20'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            )}
          >
            <Icon size={17} />
            {section.label}
            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full">{section.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-950/40 border border-white/10 py-2 text-center">
      <p className="text-sm font-black text-white">{value}</p>
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">{label}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
    </div>
  );
}

function EmptyCard({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="bg-slate-900/50 backdrop-blur-xl p-14 rounded-[2.5rem] border border-white/10 text-center shadow-2xl">
      <Icon size={44} className="text-slate-700 mx-auto mb-4" />
      <p className="text-slate-400 font-bold">{text}</p>
    </div>
  );
}

function ClinicalCard({ icon: Icon, title, date, badge, onDownload, children }: { icon: any; title: string; date?: string; badge?: string; onDownload?: () => void; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-sky-500/10 text-sky-400 rounded-2xl flex items-center justify-center border border-sky-500/20">
            <Icon size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{date ? formatDate(date) : 'Data não informada'}</p>
            <h3 className="text-xl font-black text-white tracking-tight">{title}</h3>
          </div>
        </div>
        <div className="flex gap-2">
          {badge && <span className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[10px] font-black uppercase tracking-widest">{badge}</span>}
          {onDownload && (
            <button onClick={onDownload} className="flex items-center gap-2 px-4 py-2 rounded-full bg-sky-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-sky-700 transition-all">
              <Download size={14} /> PDF
            </button>
          )}
        </div>
      </div>
      {children}
    </motion.div>
  );
}

function InfoGrid({ rows }: { rows: Array<[string, any]> }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {rows.map(([label, value]) => (
        <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-sm text-slate-200 font-medium leading-relaxed whitespace-pre-wrap">{safeText(value)}</p>
        </div>
      ))}
    </div>
  );
}
