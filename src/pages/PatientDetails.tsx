import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  ArrowLeft, 
  Calendar, 
  Phone, 
  Mail, 
  FileText, 
  Plus, 
  Upload, 
  Activity, 
  Trash2, 
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Dna,
  X,
  Send,
  Stethoscope,
  FileSignature
} from 'lucide-react';
import { formatDate, cn, resolveStorageUrl } from '../lib/utils';
import { formatDateBR, formatHourBR, formatOnlyDateBR } from '../utils/date';
import { toast } from 'sonner';
import { uploadPatientDocument } from '../services/supabaseStorage';
import ProGuard from '../components/ProGuard';

const getSupabaseErrorMessage = (err: unknown, fallback: string) => {
  if (!err) return fallback;

  if (err instanceof Error && err.message) {
    return err.message;
  }

  if (typeof err === 'object') {
    const anyErr = err as {
      message?: string;
      error_description?: string;
      details?: string;
      hint?: string;
      code?: string;
      statusCode?: string | number;
      name?: string;
    };

    const parts = [
      anyErr.message,
      anyErr.error_description,
      anyErr.details,
      anyErr.hint,
      anyErr.code ? `Código: ${anyErr.code}` : undefined,
      anyErr.statusCode ? `Status: ${anyErr.statusCode}` : undefined,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(' | ');
    }
  }

  if (typeof err === 'string') return err;

  return fallback;
};


export default function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ficha');
  
  // Data States
  const [evolucoes, setEvolucoes] = useState<any[]>([]);
  const [arquivos, setArquivos] = useState<any[]>([]);
  const [prescricoes, setPrescricoes] = useState<any[]>([]);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [dailyJournals, setDailyJournals] = useState<any[]>([]);

  // Modal States
  const [showEvolucaoModal, setShowEvolucaoModal] = useState(false);
  const [showArquivoModal, setShowArquivoModal] = useState(false);
  const [showPrescricaoModal, setShowPrescricaoModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [evolucaoForm, setEvolucaoForm] = useState({
    atendimento_id: '',
    dor_escala: 0,
    descricao: '',
    exercicios_realizados: '',
    observacoes: '',
    plano: ''
  });

  const [arquivoForm, setArquivoForm] = useState({
    tipo: 'Exame',
    file: null as File | null
  });

  const [prescricaoForm, setPrescricaoForm] = useState({
    exercicio_id: '',
    observacoes: ''
  });

  const [bibliotecaExercicios, setBibliotecaExercicios] = useState<any[]>([]);

  useEffect(() => {
    if (profile && profile.tipo_usuario !== 'fisioterapeuta') {
      navigate('/dashboard');
      return;
    }
    if (id && user) {
      fetchPatientData();
    }
  }, [id, user, profile]);

  const fetchPatientData = async () => {
    try {
      // Fetch Patient
      const { data: patientData, error: pError } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', id)
        .single();
      if (pError) throw pError;
      setPatient(patientData);

      // Fetch Evoluções
      const { data: evData } = await supabase
        .from('evolucoes')
        .select('*')
        .eq('paciente_id', id)
        .order('created_at', { ascending: false });
      setEvolucoes(evData || []);

      // Fetch Arquivos
      const { data: arData } = await supabase
        .from('arquivos_paciente')
        .select('*')
        .eq('paciente_id', id)
        .order('created_at', { ascending: false });
      setArquivos(arData || []);

      // Fetch Agendamentos (for linking evolutions)
      const { data: atData } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('paciente_id', id)
        .eq('status', 'realizado')
        .order('data', { ascending: false });
      setAgendamentos(atData || []);

      // Fetch Prescrições
      // Busca em 2 etapas para não depender de foreign key/cache do Supabase.
      // Sem isso, o insert pode dar sucesso, mas a lista continuar vazia quando o join falha.
      const { data: preData, error: preError } = await supabase
        .from('exercicios_paciente')
        .select('*')
        .eq('paciente_id', id)
        .order('created_at', { ascending: false });

      if (preError) {
        console.error('Erro ao buscar prescrições:', preError);
        setPrescricoes([]);
      } else {
        const exercicioIds = Array.from(
          new Set((preData || []).map((pres: any) => pres.exercicio_id).filter(Boolean))
        );

        let exerciciosMap: Record<string, any> = {};

        if (exercicioIds.length > 0) {
          const { data: exerciciosData, error: exerciciosError } = await supabase
            .from('exercicios')
            .select('*')
            .in('id', exercicioIds);

          if (exerciciosError) {
            console.error('Erro ao buscar dados dos exercícios:', exerciciosError);
          } else {
            exerciciosMap = (exerciciosData || []).reduce((acc: Record<string, any>, exercicio: any) => {
              acc[exercicio.id] = exercicio;
              return acc;
            }, {});
          }
        }

        setPrescricoes((preData || []).map((pres: any) => ({
          ...pres,
          exercicio: exerciciosMap[pres.exercicio_id] || null
        })));
      }

      // Fetch Avaliações
      const { data: avaData } = await supabase
        .from('fichas_avaliacao')
        .select('*')
        .eq('paciente_id', id)
        .order('created_at', { ascending: false });
      setAvaliacoes(avaData || []);

      // Fetch Daily Journals
      const { data: journalData } = await supabase
        .from('registros_paciente')
        .select('*')
        .eq('paciente_id', id)
        .order('data_registro', { ascending: false });
      setDailyJournals(journalData || []);

      // Fetch Biblioteca de Exercícios
      const { data: bibData } = await supabase
        .from('exercicios')
        .select('*')
        .order('nome');
      setBibliotecaExercicios(bibData || []);

    } catch (err) {
      console.error('Erro ao buscar dados do paciente:', err);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleExportProntuario = async () => {
    if (!patient) return;

    try {
      toast.info('Gerando prontuário em PDF...');

      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      let y = 16;

      const safeText = (value: unknown, fallback = 'Não informado') => {
        if (value === null || value === undefined || value === '') return fallback;
        return String(value);
      };

      const addSectionTitle = (title: string) => {
        if (y > 260) {
          doc.addPage();
          y = 16;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(title, margin, y);
        y += 7;
      };

      const addParagraph = (text: string) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(text || 'Não informado', pageWidth - margin * 2);
        if (y + lines.length * 5 > 280) {
          doc.addPage();
          y = 16;
        }
        doc.text(lines, margin, y);
        y += lines.length * 5 + 4;
      };

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Prontuário Fisioterapêutico', margin, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, y);
      y += 10;

      addSectionTitle('Dados do paciente');
      autoTable(doc, {
        startY: y,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        head: [['Campo', 'Informação']],
        body: [
          ['Nome', safeText(patient.nome_completo)],
          ['Data de nascimento', patient.data_nascimento ? formatOnlyDateBR(patient.data_nascimento) : 'Não informado'],
          ['Telefone', safeText(patient.telefone)],
          ['E-mail', safeText(patient.email)],
          ['Diagnóstico clínico', safeText(patient.diagnostico)],
          ['Observações', safeText(patient.observacoes)],
        ],
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      addSectionTitle('Avaliações');
      if (avaliacoes.length === 0) {
        addParagraph('Nenhuma avaliação registrada.');
      } else {
        autoTable(doc, {
          startY: y,
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 2 },
          head: [['Data', 'Diagnóstico fisioterapêutico', 'Objetivos']],
          body: avaliacoes.map((ava) => [
            ava.created_at ? formatDateBR(ava.created_at) : '-',
            safeText(ava.diagnostico_fisio, '-'),
            safeText(ava.objetivos_terapeuticos, '-'),
          ]),
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      addSectionTitle('Evoluções');
      if (evolucoes.length === 0) {
        addParagraph('Nenhuma evolução registrada.');
      } else {
        autoTable(doc, {
          startY: y,
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 2 },
          head: [['Data', 'Dor', 'Descrição', 'Exercícios', 'Plano']],
          body: evolucoes.map((ev) => [
            ev.created_at ? formatDateBR(ev.created_at) : '-',
            safeText(ev.dor_escala, '0'),
            safeText(ev.descricao, '-'),
            safeText(ev.exercicios_realizados, '-'),
            safeText(ev.plano, '-'),
          ]),
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      addSectionTitle('Prescrições de exercícios');
      if (prescricoes.length === 0) {
        addParagraph('Nenhum exercício prescrito.');
      } else {
        autoTable(doc, {
          startY: y,
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 2 },
          head: [['Data', 'Exercício', 'Categoria', 'Dificuldade', 'Observações']],
          body: prescricoes.map((pres) => [
            pres.created_at ? formatDateBR(pres.created_at) : '-',
            safeText(pres.exercicio?.nome, 'Exercício não encontrado'),
            safeText(pres.exercicio?.categoria || pres.exercicio?.categoria_principal, '-'),
            safeText(pres.exercicio?.dificuldade || pres.exercicio?.nivel, '-'),
            safeText(pres.observacoes, '-'),
          ]),
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      addSectionTitle('Arquivos anexados');
      if (arquivos.length === 0) {
        addParagraph('Nenhum arquivo anexado.');
      } else {
        autoTable(doc, {
          startY: y,
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 2 },
          head: [['Data', 'Tipo', 'Arquivo']],
          body: arquivos.map((arq) => [
            arq.created_at ? formatDateBR(arq.created_at) : '-',
            safeText(arq.tipo, '-'),
            safeText(arq.nome_arquivo || arq.file_path || arq.arquivo_url, '-'),
          ]),
        });
      }

      const filename = `prontuario_${safeText(patient.nome_completo, 'paciente')}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .toLowerCase();

      doc.save(`${filename}.pdf`);
      toast.success('Prontuário gerado em PDF!');
    } catch (err) {
      console.error('Erro ao gerar prontuário:', err);
      toast.error(getSupabaseErrorMessage(err, 'Erro ao gerar prontuário em PDF'));
    }
  };

  const handleCreateEvolucao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || submitting) return;

    setSubmitting(true);
    try {
      const payload = {
        ...evolucaoForm,
        atendimento_id: evolucaoForm.atendimento_id || null,
        paciente_id: id
      };

      const { error } = await supabase
        .from('evolucoes')
        .insert(payload);

      if (error) throw error;

      toast.success('Evolução registrada!');
      setShowEvolucaoModal(false);
      setEvolucaoForm({
        atendimento_id: '',
        dor_escala: 0,
        descricao: '',
        exercicios_realizados: '',
        observacoes: '',
        plano: ''
      });
      fetchPatientData();
    } catch (err) {
      console.error('Erro ao salvar evolução:', err);
      toast.error(getSupabaseErrorMessage(err, 'Erro ao salvar evolução'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadArquivo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || submitting) return;
    if (!user) {
      toast.error('Usuário não autenticado. Faça login novamente.');
      return;
    }
    if (!arquivoForm.file) {
      toast.error('Selecione um arquivo antes de iniciar o upload.');
      return;
    }

    setSubmitting(true);
    try {
      const url = await uploadPatientDocument(user.id, id, arquivoForm.file);
      
      const { error } = await supabase
        .from('arquivos_paciente')
        .insert({
          paciente_id: id,
          arquivo_url: url,
          tipo: arquivoForm.tipo
        });

      if (error) throw error;

      toast.success('Arquivo enviado com sucesso!');
      setShowArquivoModal(false);
      setArquivoForm({ tipo: 'Exame', file: null });
      fetchPatientData();
    } catch (err) {
      console.error('Erro ao enviar arquivo:', err);
      toast.error(getSupabaseErrorMessage(err, 'Erro ao enviar arquivo'));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrescreverExercicio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || submitting) return;

    setSubmitting(true);
    try {
      const { data: insertedData, error } = await supabase
        .from('exercicios_paciente')
        .insert({
          ...prescricaoForm,
          paciente_id: id
        })
        .select('*')
        .single();

      if (error) throw error;

      const selectedExercise = bibliotecaExercicios.find((ex) => ex.id === prescricaoForm.exercicio_id) || null;

      if (insertedData) {
        setPrescricoes((current) => [
          {
            ...insertedData,
            exercicio: selectedExercise
          },
          ...current
        ]);
      }

      toast.success('Exercício prescrito!');
      setShowPrescricaoModal(false);
      setPrescricaoForm({ exercicio_id: '', observacoes: '' });
      fetchPatientData();
    } catch (err) {
      console.error('Erro ao prescrever exercício:', err);
      toast.error(getSupabaseErrorMessage(err, 'Erro ao prescrever exercício'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-sky-500" size={48} /></div>;
  if (!patient) return <div className="text-center py-20 font-black text-2xl">Paciente não encontrado</div>;

  return (
    <div className="space-y-8">
      <button 
        onClick={() => navigate('/patients')}
        className="flex items-center gap-2 text-slate-500 font-black hover:text-sky-600 transition-all"
      >
        <ArrowLeft size={20} /> Voltar para lista
      </button>

      <header className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl flex flex-col md:flex-row items-center gap-8">
        <div className="w-32 h-32 bg-white/5 rounded-[2rem] flex items-center justify-center text-blue-400 border-4 border-white/5 shadow-xl overflow-hidden">
          {patient.foto_url ? (
            <img src={resolveStorageUrl(patient.foto_url)} alt={patient.nome_completo} className="w-full h-full object-cover" />
          ) : (
            <User size={64} />
          )}
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">{patient.nome_completo}</h1>
          <div className="flex flex-wrap justify-center md:justify-start gap-4 text-slate-400 font-medium">
            <span className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <Calendar size={16} className="text-blue-400" />
              {patient.data_nascimento ? formatOnlyDateBR(patient.data_nascimento) : 'Sem data'}
            </span>
            <span className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <Phone size={16} className="text-blue-400" />
              {patient.telefone || 'Sem telefone'}
            </span>
            <span className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <Mail size={16} className="text-blue-400" />
              {patient.email || 'Sem e-mail'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <ProGuard variant="inline">
            <button 
              onClick={() => toast.info("Funcionalidade de Convite enviada!", { description: `Um convite foi enviado para ${patient.email}` })}
              className="px-6 py-2 bg-emerald-600/20 text-emerald-400 rounded-2xl hover:bg-emerald-600/30 transition-all border border-emerald-600/20 font-black text-xs uppercase tracking-widest flex items-center gap-2"
            >
              <Send size={18} /> Liberar Acesso
            </button>
          </ProGuard>
          <button className="p-4 bg-white/5 text-slate-500 rounded-2xl hover:bg-white/10 transition-all border border-white/5">
            <Trash2 size={24} />
          </button>
          <ProGuard variant="inline">
            <button 
              onClick={handleExportProntuario}
              className="p-4 bg-blue-600/20 text-blue-400 rounded-2xl hover:bg-blue-600/30 transition-all border border-blue-600/20"
              title="Exportar prontuário em PDF"
            >
              <FileText size={24} />
            </button>
          </ProGuard>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 p-2 bg-slate-900/50 backdrop-blur-xl rounded-[2rem] border border-white/10 overflow-x-auto no-scrollbar shadow-lg">
        {[
          { id: 'ficha', label: 'Ficha Clínica', icon: User },
          { id: 'avaliacoes', label: 'Avaliações', icon: Stethoscope },
          { id: 'evolucoes', label: 'Evoluções', icon: Activity },
          { id: 'diario', label: 'Diário de Dor', icon: Activity },
          { id: 'arquivos', label: 'Exames e Fotos', icon: Paperclip },
          { id: 'prescricoes', label: 'Prescrições', icon: Dna },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-full font-black text-sm whitespace-nowrap transition-all",
              activeTab === tab.id 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                : "text-slate-500 hover:text-slate-400 hover:bg-white/5"
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'ficha' && (
            <motion.div
              key="ficha"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid md:grid-cols-2 gap-8"
            >
              <div className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl space-y-6">
                <h3 className="text-2xl font-black text-white flex items-center gap-3">
                  <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl"><FileText size={20} /></div>
                  Diagnóstico e Notas
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Diagnóstico Clínico</label>
                    <p className="text-lg font-bold text-slate-300 mt-1">{patient.diagnostico || 'Não informado'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Observações Gerais</label>
                    <p className="text-slate-400 font-medium leading-relaxed mt-1">{patient.observacoes || 'Nenhuma observação registrada.'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl space-y-6">
                <h3 className="text-2xl font-black text-white flex items-center gap-3">
                  <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-xl"><CheckCircle2 size={20} /></div>
                  Status do Tratamento
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-white/5 rounded-3xl text-center border border-white/5">
                    <span className="text-3xl font-black text-white">{agendamentos.length}</span>
                    <p className="text-xs font-bold text-slate-500 uppercase mt-1">Sessões Realizadas</p>
                  </div>
                  <div className="p-6 bg-white/5 rounded-3xl text-center border border-white/5">
                    <span className="text-3xl font-black text-white">{evolucoes.length}</span>
                    <p className="text-xs font-bold text-slate-500 uppercase mt-1">Evoluções</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'avaliacoes' && (
            <motion.div
              key="avaliacoes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-white">Fichas de Avaliação</h3>
                <button 
                  onClick={() => navigate(`/physio/evaluation?pacienteId=${id}`)}
                  className="flex items-center gap-2 px-6 py-3 bg-sky-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-sky-600 transition-all shadow-lg shadow-sky-900/20"
                >
                  <Plus size={20} /> Nova Avaliação
                </button>
              </div>

              {avaliacoes.length === 0 ? (
                <div className="bg-slate-900/50 backdrop-blur-xl p-20 rounded-[3rem] border border-white/10 text-center shadow-2xl">
                  <Stethoscope size={48} className="text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold">Nenhuma avaliação clínica realizada ainda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {avaliacoes.map((ava) => (
                    <div key={ava.id} className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col gap-4 hover:border-sky-500/30 transition-all group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-sky-600/20 text-sky-400 rounded-2xl">
                            <FileText size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Avaliação Realizada</p>
                            <p className="text-sm font-bold text-white">{formatDateBR(ava.created_at)}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => navigate(`/physio/evaluation/${ava.id}`)}
                          className="p-2 bg-white/5 text-slate-400 rounded-xl hover:bg-sky-500 hover:text-white transition-all border border-white/5"
                        >
                          <FileSignature size={18} />
                        </button>
                      </div>
                      
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 line-clamp-1">Diagnóstico Fisio.</h4>
                        <p className="text-xs font-medium text-slate-300 line-clamp-2">{ava.diagnostico_fisio || 'Não preenchido'}</p>
                      </div>

                      <div className="flex gap-2">
                         <button 
                            onClick={() => navigate(`/physio/evaluation/${ava.id}`)}
                            className="flex-1 py-3 bg-white/5 text-sky-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5"
                          >
                            Ver / Editar
                          </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'evolucoes' && (
            <motion.div
              key="evolucoes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-white">Histórico de Evoluções</h3>
                <button 
                  onClick={() => setShowEvolucaoModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20"
                >
                  <Plus size={20} /> Nova Evolução
                </button>
              </div>

              {evolucoes.length === 0 ? (
                <div className="bg-slate-900/50 backdrop-blur-xl p-20 rounded-[3rem] border border-white/10 text-center shadow-2xl">
                  <Activity size={48} className="text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold">Nenhuma evolução registrada ainda.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {evolucoes.map((ev) => (
                    <div key={ev.id} className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl hover:border-blue-500/30 transition-all">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center font-black">
                            {ev.dor_escala}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Escala de Dor</p>
                            <p className="text-sm font-bold text-white">{formatDateBR(ev.created_at)}</p>
                          </div>
                        </div>
                        <div className="px-4 py-2 bg-white/5 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5">
                          Sessão #{evolucoes.length - evolucoes.indexOf(ev)}
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Descrição</h4>
                            <p className="text-slate-300 font-medium leading-relaxed">{ev.descricao}</p>
                          </div>
                          <div>
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Exercícios Realizados</h4>
                            <p className="text-slate-300 font-medium leading-relaxed">{ev.exercicios_realizados}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Observações</h4>
                            <p className="text-slate-300 font-medium leading-relaxed">{ev.observacoes}</p>
                          </div>
                          <div>
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Plano Terapêutico</h4>
                            <p className="text-blue-400 font-bold leading-relaxed">{ev.plano}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'diario' && (
            <motion.div
              key="diario"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <h3 className="text-2xl font-black text-white">Diário de Dor e Adesão</h3>
              
              {dailyJournals.length === 0 ? (
                <div className="bg-slate-900/50 backdrop-blur-xl p-20 rounded-[3rem] border border-white/10 text-center shadow-2xl">
                  <Activity size={48} className="text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold">O paciente ainda não registrou nada no diário.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dailyJournals.map((journal) => (
                    <div 
                      key={journal.id} 
                      className={cn(
                        "bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border shadow-2xl transition-all relative overflow-hidden group",
                        journal.visualizado_por_fisio ? "border-white/5" : "border-blue-500/30 ring-2 ring-blue-500/10"
                      )}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg transition-colors",
                            journal.nivel_dor > 7 ? "bg-rose-500 text-white" : journal.nivel_dor > 4 ? "bg-yellow-500 text-slate-950" : "bg-emerald-500 text-white"
                          )}>
                            {journal.nivel_dor}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nível de Dor</p>
                            <p className="text-sm font-bold text-white">{formatOnlyDateBR(journal.data_registro)}</p>
                          </div>
                        </div>
                        {!journal.visualizado_por_fisio && (
                          <button 
                            onClick={async () => {
                              const { error } = await supabase
                                .from('registros_paciente')
                                .update({ 
                                  visualizado_por_fisio: true, 
                                  visualizado_em: new Date().toISOString() 
                                })
                                .eq('id', journal.id);
                              if (!error) fetchPatientData();
                            }}
                            className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20"
                            title="Marcar como Visualizado"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                           <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Adesão Prescrita</p>
                           <span className="text-sm font-black text-emerald-400">
                             {journal.concluidos_count}/{journal.total_exercicios}
                           </span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-emerald-500" 
                             style={{ width: `${(journal.concluidos_count / (journal.total_exercicios || 1)) * 100}%` }} 
                           />
                        </div>

                        {journal.notas && (
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Notas do Dia</p>
                            <p className="text-xs font-medium text-slate-300 italic">"{journal.notas}"</p>
                          </div>
                        )}
                        
                        {journal.visualizado_por_fisio && (
                           <p className="text-[9px] font-black text-emerald-500/50 uppercase tracking-widest flex items-center gap-1">
                              <CheckCircle2 size={10} />
                              Visualizado em {formatDateBR(journal.visualizado_em)}
                           </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'arquivos' && (
            <motion.div
              key="arquivos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-white">Exames e Documentos</h3>
                <button 
                  onClick={() => setShowArquivoModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20"
                >
                  <Upload size={20} /> Upload Arquivo
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {arquivos.length === 0 ? (
                  <div className="col-span-full bg-slate-900/50 backdrop-blur-xl p-20 rounded-[3rem] border border-white/10 text-center shadow-2xl">
                    <Paperclip size={48} className="text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 font-bold">Nenhum arquivo anexado.</p>
                  </div>
                ) : (
                  arquivos.map((arq) => (
                    <div key={arq.id} className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl hover:border-blue-500/30 transition-all group">
                      <div className="w-full aspect-square bg-white/5 rounded-2xl flex items-center justify-center text-slate-600 mb-4 group-hover:bg-blue-600/10 transition-colors border border-white/5">
                        <FileText size={40} />
                      </div>
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">{arq.tipo}</p>
                      <p className="text-sm font-bold text-white truncate mb-4">{formatDateBR(arq.created_at)}</p>
                      <a 
                        href={resolveStorageUrl(arq.arquivo_url)} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all border border-white/5"
                      >
                        <Download size={14} /> Baixar
                      </a>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
          {activeTab === 'prescricoes' && (
            <motion.div
              key="prescricoes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-white">Exercícios Prescritos</h3>
                <button 
                  onClick={() => setShowPrescricaoModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20"
                >
                  <Plus size={20} /> Prescrever Exercício
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prescricoes.length === 0 ? (
                  <div className="col-span-full bg-slate-900/50 backdrop-blur-xl p-20 rounded-[3rem] border border-white/10 text-center shadow-2xl">
                    <Dna size={48} className="text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 font-bold">Nenhum exercício prescrito para este paciente.</p>
                  </div>
                ) : (
                  prescricoes.map((pres) => (
                    <div key={pres.id} className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl flex items-center gap-6 hover:border-blue-500/30 transition-all">
                      <div className="w-20 h-20 bg-blue-600/20 text-blue-400 rounded-3xl flex items-center justify-center border border-blue-600/20">
                        <Activity size={32} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-black text-white">{pres.exercicio?.nome || 'Exercício prescrito'}</h4>
                        <p className="text-sm text-slate-400 font-medium line-clamp-1">{pres.observacoes || 'Sem observações adicionais'}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-[9px] font-black bg-white/5 text-slate-500 px-2 py-1 rounded-md uppercase tracking-widest border border-white/5">
                            {pres.exercicio?.categoria || pres.exercicio?.categoria_principal || 'Sem categoria'}
                          </span>
                          <span className="text-[9px] font-black bg-white/5 text-slate-500 px-2 py-1 rounded-md uppercase tracking-widest border border-white/5">
                            {pres.exercicio?.dificuldade || pres.exercicio?.nivel || 'Sem nível'}
                          </span>
                        </div>
                      </div>
                      <button className="p-2 text-slate-600 hover:text-red-500 transition-colors">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modais */}
      <AnimatePresence>
        {showPrescricaoModal && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPrescricaoModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-slate-900 rounded-[3rem] shadow-2xl p-8 overflow-hidden flex flex-col border border-white/10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-white tracking-tight">Prescrever Exercício</h2>
                <button onClick={() => setShowPrescricaoModal(false)} className="p-2 hover:bg-white/5 text-slate-400 rounded-full transition-all"><X size={24} /></button>
              </div>

              <form onSubmit={handlePrescreverExercicio} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Selecionar Exercício</label>
                  <select
                    required
                    value={prescricaoForm.exercicio_id}
                    onChange={(e) => setPrescricaoForm({...prescricaoForm, exercicio_id: e.target.value})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                  >
                    <option value="" className="bg-slate-900">Selecione da biblioteca...</option>
                    {bibliotecaExercicios.map(ex => (
                      <option key={ex.id} value={ex.id} className="bg-slate-900">{ex.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Observações Específicas</label>
                  <textarea
                    value={prescricaoForm.observacoes}
                    onChange={(e) => setPrescricaoForm({...prescricaoForm, observacoes: e.target.value})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all h-32 resize-none text-white"
                    placeholder="Ex: Realizar com carga leve, manter postura ereta..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : 'Prescrever'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
        {showEvolucaoModal && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEvolucaoModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-2xl bg-slate-900 rounded-[3rem] shadow-2xl p-8 overflow-hidden flex flex-col max-h-[90vh] border border-white/10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-white tracking-tight">Registrar Evolução Clínica</h2>
                <button onClick={() => setShowEvolucaoModal(false)} className="p-2 hover:bg-white/5 text-slate-400 rounded-full transition-all"><X size={24} /></button>
              </div>

              <form onSubmit={handleCreateEvolucao} className="space-y-6 overflow-y-auto pr-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Vincular ao Paciente</label>
                  <select
                    value={id || ''}
                    disabled
                    className="w-full min-h-[56px] p-4 bg-white/5 border border-white/10 rounded-2xl outline-none transition-all text-white opacity-90 cursor-not-allowed"
                  >
                    <option value={id || ''} className="bg-slate-900">
                      {patient?.nome_completo || patient?.nome || 'Paciente cadastrado'}
                    </option>
                  </select>
                  <p className="text-[11px] font-bold text-slate-500 ml-1">A evolução será salva no prontuário deste paciente cadastrado.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Vincular ao Atendimento Realizado <span className="text-slate-600 normal-case tracking-normal">(opcional)</span></label>
                  <select
                    value={evolucaoForm.atendimento_id}
                    onChange={(e) => setEvolucaoForm({...evolucaoForm, atendimento_id: e.target.value})}
                    className="w-full min-h-[56px] p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white appearance-none"
                  >
                    <option value="" className="bg-slate-900">Sem vínculo com atendimento</option>
                    {agendamentos.map(at => (
                      <option key={at.id} value={at.id} className="bg-slate-900">{formatOnlyDateBR(at.data)} - {at.hora.slice(0, 5)}</option>
                    ))}
                  </select>
                  {agendamentos.length === 0 && (
                    <p className="text-[11px] font-bold text-slate-500 ml-1">Nenhum atendimento realizado foi encontrado. O vínculo com o paciente acima continua ativo.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Escala de Dor (0 a 10)</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={evolucaoForm.dor_escala}
                      onChange={(e) => setEvolucaoForm({...evolucaoForm, dor_escala: parseInt(e.target.value)})}
                      className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <span className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-900/20">
                      {evolucaoForm.dor_escala}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Descrição da Sessão</label>
                  <textarea
                    required
                    value={evolucaoForm.descricao}
                    onChange={(e) => setEvolucaoForm({...evolucaoForm, descricao: e.target.value})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none text-white"
                    placeholder="Como o paciente chegou? Quais as queixas?"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Exercícios Realizados</label>
                  <textarea
                    value={evolucaoForm.exercicios_realizados}
                    onChange={(e) => setEvolucaoForm({...evolucaoForm, exercicios_realizados: e.target.value})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none text-white"
                    placeholder="Liste os exercícios e condutas aplicadas..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Plano Terapêutico / Próximos Passos</label>
                  <input
                    type="text"
                    value={evolucaoForm.plano}
                    onChange={(e) => setEvolucaoForm({...evolucaoForm, plano: e.target.value})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                    placeholder="O que será feito na próxima sessão?"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : 'Salvar Evolução'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showArquivoModal && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowArquivoModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-slate-900 rounded-[3rem] shadow-2xl p-8 overflow-hidden flex flex-col border border-white/10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-white tracking-tight">Upload de Documento</h2>
                <button onClick={() => setShowArquivoModal(false)} className="p-2 hover:bg-white/5 text-slate-400 rounded-full transition-all"><X size={24} /></button>
              </div>

              <form onSubmit={handleUploadArquivo} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Arquivo</label>
                  <select
                    value={arquivoForm.tipo}
                    onChange={(e) => setArquivoForm({...arquivoForm, tipo: e.target.value})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                  >
                    <option value="Exame" className="bg-slate-900">Exame (PDF/Imagem)</option>
                    <option value="Ressonância" className="bg-slate-900">Ressonância</option>
                    <option value="Raio-X" className="bg-slate-900">Raio-X</option>
                    <option value="Foto" className="bg-slate-900">Foto do Paciente</option>
                    <option value="Documento" className="bg-slate-900">Documento Geral</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Selecionar Arquivo</label>
                  <input
                    id="arquivo-paciente-upload"
                    type="file"
                    required
                    accept=".pdf,image/*"
                    onChange={(e) => setArquivoForm({...arquivoForm, file: e.target.files?.[0] || null})}
                    className="sr-only"
                  />
                  <label
                    htmlFor="arquivo-paciente-upload"
                    className="flex min-h-[118px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/10 bg-white/5 px-4 py-6 text-center transition-all hover:border-blue-500 hover:bg-white/10"
                  >
                    <Upload size={32} className="mb-3 text-slate-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clique para escolher arquivo</span>
                    <span className="mt-2 max-w-full truncate text-sm font-bold text-white">
                      {arquivoForm.file ? arquivoForm.file.name : 'Nenhum arquivo selecionado'}
                    </span>
                  </label>
                  {arquivoForm.file && (
                    <p className="text-[10px] font-bold text-blue-400 mt-2 text-center break-all">Arquivo selecionado: {arquivoForm.file.name}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || !arquivoForm.file}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : 'Iniciar Upload'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
