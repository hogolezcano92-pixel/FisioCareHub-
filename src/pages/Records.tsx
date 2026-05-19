import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Activity,
  AlertCircle,
  Calendar,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  HeartPulse,
  Loader2,
  Paperclip,
  Stethoscope,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatDate } from '../lib/utils';
import { getLinkedClinicalPatients } from '../services/patientLinkService';
import { downloadAvaliacaoPremiumPdf, downloadEvolucaoPremiumPdf, downloadFichaClinicaPremiumPdf } from '../services/premiumPdfService';

type SectionKey = 'resumo' | 'avaliacoes' | 'evolucoes' | 'documentos' | 'dor';

type ClinicalPatient = {
  id: string;
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
};

const safeText = (value: any, fallback = 'Não informado') => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
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

  const primaryPatient = clinicalPatients[0] || null;
  const visiblePatientIds = useMemo(
    () => Array.from(new Set([user?.id, ...clinicalPatients.map((p) => p.id)].filter(Boolean))) as string[],
    [user?.id, clinicalPatients]
  );

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
        const linked = await getLinkedClinicalPatients(user.id, profile?.email || user.email);
        const linkedPatients = linked as ClinicalPatient[];
        setClinicalPatients(linkedPatients);

        const patientIds = Array.from(new Set([user.id, ...linkedPatients.map((p) => p.id)].filter(Boolean)));
        const clinicalIds = linkedPatients.map((p) => p.id).filter(Boolean);

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

          const { data: painData, error: painError } = await supabase
            .from('registros_paciente')
            .select('*')
            .in('paciente_id', patientIds)
            .order('created_at', { ascending: false });
          if (!painError) setPainRecords(painData || []);
        }

        const { data: oldRecords, error: oldError } = await supabase
          .from('prontuarios')
          .select('*')
          .in('paciente_id', patientIds)
          .order('data_registro', { ascending: false });
        if (!oldError) setLegacyRecords(oldRecords || []);
      } catch (error: any) {
        console.error('Erro ao carregar prontuário do paciente:', error);
        warnings.push(error?.message || 'Erro inesperado ao carregar prontuário.');
      } finally {
        setLoadWarnings(warnings);
        setLoading(false);
      }
    };

    load();
  }, [authLoading, user, profile?.email, navigate]);

  const totalRecords = evaluations.length + evolutions.length + files.length + painRecords.length + legacyRecords.length + clinicalPatients.length;

  if (loading) {
    return (
      <div className="flex justify-center pt-20">
        <Loader2 className="animate-spin text-sky-500" size={44} />
      </div>
    );
  }

  const sections = [
    { id: 'resumo', label: 'Ficha clínica', icon: User, count: clinicalPatients.length },
    { id: 'avaliacoes', label: 'Avaliações', icon: ClipboardList, count: evaluations.length },
    { id: 'evolucoes', label: 'Evoluções', icon: Activity, count: evolutions.length },
    { id: 'documentos', label: 'Exames e documentos', icon: Paperclip, count: files.length + legacyRecords.length },
    { id: 'dor', label: 'Diário de dor', icon: HeartPulse, count: painRecords.length },
  ] as Array<{ id: SectionKey; label: string; icon: any; count: number }>;

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

      {loadWarnings.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-2xl text-sm font-bold flex gap-3">
          <AlertCircle size={20} className="shrink-0" />
          <div>
            <p>Algumas informações não puderam ser carregadas.</p>
            <ul className="mt-1 list-disc list-inside text-amber-200/80 font-medium">
              {loadWarnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="flex gap-2 p-2 bg-slate-900/50 backdrop-blur-xl rounded-[2rem] border border-white/10 overflow-x-auto no-scrollbar shadow-lg">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
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

      {totalRecords === 0 && (
        <div className="bg-slate-900/50 backdrop-blur-xl p-16 rounded-[2.5rem] border border-white/10 text-center shadow-2xl">
          <FolderOpen size={48} className="text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-black text-white">Nenhum prontuário encontrado</h3>
          <p className="text-slate-400 mt-2 font-medium">Quando o fisioterapeuta registrar avaliações, evoluções ou documentos, eles aparecerão aqui.</p>
        </div>
      )}

      {activeSection === 'resumo' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {clinicalPatients.length === 0 ? (
            <EmptyCard icon={User} text="Nenhuma ficha clínica vinculada à sua conta." />
          ) : clinicalPatients.map((patient) => (
            <motion.div key={patient.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-sky-400 mb-1">Ficha clínica</p>
                  <h3 className="text-2xl font-black text-white">{safeText(patient.nome_completo || profile?.nome_completo || user?.email)}</h3>
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
      )}

      {activeSection === 'avaliacoes' && (
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
      )}

      {activeSection === 'evolucoes' && (
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
      )}

      {activeSection === 'documentos' && (
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
      )}

      {activeSection === 'dor' && (
        <div className="space-y-5">
          {painRecords.length === 0 ? <EmptyCard icon={HeartPulse} text="Nenhum registro de diário de dor encontrado." /> : painRecords.map((item) => (
            <ClinicalCard key={item.id} icon={HeartPulse} title="Registro de dor" date={item.created_at || item.data_registro} badge={item.dor_escala ? `Dor ${item.dor_escala}/10` : 'Diário'}>
              <InfoGrid rows={[
                ['Dor', item.dor_escala ? `${item.dor_escala}/10` : null],
                ['Local', item.local_dor || item.regiao],
                ['Descrição', item.descricao || item.observacoes],
                ['Fatores de melhora/piora', item.fatores],
              ]} />
            </ClinicalCard>
          ))}
        </div>
      )}
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
