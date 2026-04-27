import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Plus, 
  User, 
  Calendar, 
  Paperclip, 
  X, 
  Loader2,
  Download,
  BrainCircuit,
  Send,
  AlertCircle,
  Crown
} from 'lucide-react';
import { formatDate, cn, resolveStorageUrl } from '../lib/utils';
import { generateMedicalRecord } from '../lib/groq';
import ReactMarkdown from 'react-markdown';
import { getUserName } from '../lib/user';
import { uploadDocument } from '../services/supabaseStorage';
import ProGuard from '../components/ProGuard';

export default function Records() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [triages, setTriages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  
  // New Record Form
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // AI Generation States
  const [aiNotes, setAiNotes] = useState('');
  const [aiType, setAiType] = useState('Avaliação Físico-Funcional');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/login');
      return;
    }

    const fetchRecords = async () => {
      if (!profile) {
        setLoading(false);
        return;
      }

      try {
        const isPhysio = profile.tipo_usuario === 'fisioterapeuta';
        const userIdField = isPhysio ? 'fisio_id' : 'paciente_id';

        const { data: recordsData, error: recordsError } = await supabase
          .from('prontuarios')
          .select('*')
          .eq(userIdField, user.id)
          .order('data_registro', { ascending: false });

        if (recordsError) throw recordsError;

        setRecords(recordsData || []);
        
        // Resolve names in bulk
        const otherRoleField = isPhysio ? 'paciente_id' : 'fisio_id';
        const uidsToResolve = Array.from(new Set((recordsData || []).map((rec: any) => rec[otherRoleField])));
        
        if (uidsToResolve.length > 0) {
          const newNameMap = { ...nameMap };

          // Try perfis first
          const { data: profilesData } = await supabase
            .from('perfis')
            .select('id, nome_completo')
            .in('id', uidsToResolve);
          
          if (profilesData) {
            profilesData.forEach(p => {
              newNameMap[p.id] = p.nome_completo;
            });
          }

          // Then try pacientes
          const { data: pacientesData } = await supabase
            .from('pacientes')
            .select('id, nome')
            .in('id', uidsToResolve);
          
          if (pacientesData) {
            pacientesData.forEach(p => {
              newNameMap[p.id] = p.nome;
            });
          }

          setNameMap(newNameMap);
        }

        // Fetch physio's patients for the dropdown
        if (isPhysio) {
          const { data: physioPatients } = await supabase
            .from('pacientes')
            .select('id, nome')
            .eq('fisioterapeuta_id', user.id)
            .order('nome');
          
          if (physioPatients) setPatients(physioPatients);
        }

        // Fetch triages
        if (isPhysio && (recordsData || []).length > 0) {
          const patientIds = Array.from(new Set((recordsData || []).map((r: any) => r.paciente_id)));
          const { data: triagesData } = await supabase
            .from('triagens')
            .select('*')
            .in('paciente_id', patientIds)
            .order('data_triagem', { ascending: false });
          
          if (triagesData) setTriages(triagesData);
        } else if (!isPhysio) {
          const { data: triagesData } = await supabase
            .from('triagens')
            .select('*')
            .eq('paciente_id', user.id)
            .order('data_triagem', { ascending: false });
          
          if (triagesData) setTriages(triagesData);
        }
      } catch (err) {
        console.error("Erro ao carregar prontuários:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();

    // Real-time subscription
    const subscription = supabase
      .channel(`prontuarios_changes_${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prontuarios' }, () => {
        fetchRecords();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user, profile, authLoading, navigate]);

  const handleAiGenerate = async () => {
    if (!aiNotes.trim() || generatingAi) return;
    setGeneratingAi(true);
    setError('');
    try {
      const result = await generateMedicalRecord(aiType, aiNotes);
      setContent(prev => prev ? `${prev}\n\n${result}` : result);
      setShowAiPanel(false);
      setAiNotes('');
      const { toast } = await import('sonner');
      toast.success("Documentação gerada com sucesso!");
    } catch (err: any) {
      setError("Erro ao gerar documentação com IA.");
      const { toast } = await import('sonner');
      toast.error("Erro ao gerar documentação com IA.");
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting || !user || !selectedPatientId) return;

    setSubmitting(true);
    setError('');
    try {
      const attachmentUrls = [];

      // Upload files to Supabase
      for (const file of files) {
        try {
          const url = await uploadDocument(user.id, file);
          attachmentUrls.push(url);
        } catch (uploadErr: any) {
          console.error("Erro no upload de anexo:", uploadErr);
          const { toast } = await import('sonner');
          toast.error(`Erro ao enviar arquivo ${file.name}: ${uploadErr.message}`);
        }
      }

      const { error: insertError } = await supabase
        .from('prontuarios')
        .insert({
          paciente_id: selectedPatientId,
          fisio_id: user.id,
          conteudo: {
            text: content,
            attachments: attachmentUrls
          },
          data_registro: new Date().toISOString()
        });

      if (insertError) throw insertError;

      setShowNewModal(false);
      setContent('');
      setSelectedPatientId('');
      setFiles([]);
      const { toast } = await import('sonner');
      toast.success("Prontuário salvo com sucesso!");
      // Refresh records
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setError("Erro ao criar prontuário.");
      const { toast } = await import('sonner');
      toast.error("Erro ao salvar prontuário.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center pt-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  const isPhysio = profile?.tipo_usuario === 'fisioterapeuta';

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 tracking-tight">Prontuários</h1>
          <p className="text-slate-400 font-medium">Histórico completo de atendimentos e evoluções.</p>
        </div>
        {isPhysio && (
          <ProGuard variant="inline" requiredPlan="basic">
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-sky-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-sky-600 transition-all shadow-lg shadow-sky-900/20"
            >
              <Plus size={20} /> Novo Registro
            </button>
          </ProGuard>
        )}
      </header>

      {triages.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-black flex items-center gap-2 text-indigo-400 tracking-tight">
            <BrainCircuit size={24} />
            Triagens Recentes
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {triages.slice(0, 4).map((triage) => (
              <div key={triage.id} className="bg-indigo-500/5 backdrop-blur-xl p-6 rounded-3xl border border-indigo-500/20 shadow-xl shadow-indigo-900/10">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                    {formatDate(triage.data_triagem)}
                  </div>
                  {(profile?.tipo_usuario === 'fisioterapeuta') && (
                    <div className="text-[8px] bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-full font-black uppercase tracking-widest border border-indigo-500/30">
                      PACIENTE: {nameMap[triage.paciente_id] || triage.paciente_id.slice(0, 6)}
                    </div>
                  )}
                </div>
                <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1.5">Sintomas:</div>
                <p className="text-sm text-slate-300 font-medium line-clamp-2 mb-3 leading-relaxed">{triage.sintomas}</p>
                {triage.relatorio && (
                  <div className="text-xs text-slate-400 bg-white/5 p-3 rounded-xl border border-white/5 italic prose prose-invert prose-sm max-w-none line-clamp-3">
                    <ReactMarkdown>{triage.relatorio}</ReactMarkdown>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6">
        {records.length === 0 ? (
          <div className="bg-slate-900/50 backdrop-blur-xl p-20 rounded-[2.5rem] border border-white/10 text-center shadow-2xl">
            <div className="w-20 h-20 bg-white/5 text-slate-700 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
              <FileText size={40} />
            </div>
            <h3 className="text-xl font-black text-white">Nenhum prontuário encontrado</h3>
            <p className="text-slate-400 mt-2 font-medium">Os registros de atendimento aparecerão aqui.</p>
          </div>
        ) : (
          records.map((record) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl hover:border-sky-500/30 transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-sky-500/10 text-sky-400 rounded-2xl flex items-center justify-center border border-sky-500/20 shadow-lg shadow-sky-900/20">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      {formatDate(record.data_registro)}
                    </div>
                    <div className="text-lg font-black text-white group-hover:text-sky-400 transition-colors tracking-tight">
                      Atendimento Realizado
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                  <User size={14} className="text-sky-400" />
                  {isPhysio ? 'Paciente: ' : 'Fisioterapeuta: '}
                  {nameMap[isPhysio ? record.paciente_id : record.fisio_id] || 'Carregando...'}
                </div>
              </div>

              <div className="prose prose-invert prose-sm sm:prose-base max-w-none text-slate-300 mb-6 whitespace-pre-wrap leading-relaxed font-medium">
                <ReactMarkdown>{record.conteudo?.text || record.conteudo}</ReactMarkdown>
              </div>

              {record.conteudo?.attachments?.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-6 border-t border-white/10">
                  {record.conteudo.attachments.map((url: string, i: number) => (
                    <a
                      key={i}
                      href={resolveStorageUrl(url)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
                    >
                      <Paperclip size={14} className="text-sky-400" /> Anexo {i + 1} <Download size={12} />
                    </a>
                  ))}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* New Record Modal */}
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                <h2 className="text-2xl font-black text-white tracking-tight">Novo Registro de Atendimento</h2>
                <button onClick={() => setShowNewModal(false)} className="p-2 hover:bg-white/5 text-slate-400 rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleCreateRecord} className="p-8 space-y-6 overflow-y-auto">
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-3 text-xs font-bold">
                    <AlertCircle size={20} />
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Paciente</label>
                  <select
                    required
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-sky-600 outline-none text-sm text-white"
                  >
                    <option value="" className="bg-slate-900">Selecione um paciente...</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id} className="bg-slate-900">{p.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Evolução / Conduta</label>
                    <ProGuard variant="inline">
                      <button
                        type="button"
                        onClick={() => setShowAiPanel(!showAiPanel)}
                        className="flex items-center gap-1 text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 transition-all"
                      >
                        <BrainCircuit size={14} />
                        {showAiPanel ? 'Fechar Assistente IA' : 'Gerar com IA'}
                      </button>
                    </ProGuard>
                  </div>

                  <AnimatePresence>
                    {showAiPanel && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mb-4"
                      >
                        <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl space-y-4">
                          <div className="grid grid-cols-3 gap-2">
                            {['Avaliação Físico-Funcional', 'Tratamento', 'Evolução'].map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setAiType(type)}
                                className={cn(
                                  "px-2 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all",
                                  aiType === type 
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-900/20" 
                                    : "bg-white/5 text-indigo-400 border-indigo-500/20 hover:bg-white/10"
                                )}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                          <div className="relative">
                            <textarea
                              value={aiNotes}
                              onChange={(e) => setAiNotes(e.target.value)}
                              placeholder="Dê algumas notas rápidas (ex: dor lombar L4-L5, piora ao sentar, teste de Lasègue positivo...)"
                              className="w-full p-3 bg-white/5 border border-indigo-500/20 rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-600 outline-none h-24 resize-none"
                            />
                            <button
                              type="button"
                              onClick={handleAiGenerate}
                              disabled={generatingAi || !aiNotes.trim()}
                              className="absolute bottom-2 right-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-900/40"
                            >
                              {generatingAi ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                            </button>
                          </div>
                          <p className="text-[10px] text-indigo-400/60 italic font-medium">
                            A IA gerará um texto estruturado baseado nas suas notas. Você poderá editar o resultado abaixo.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <textarea
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full h-48 p-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-sky-600 outline-none resize-none text-sm text-white"
                    placeholder="Descreva o atendimento, exercícios realizados e evolução do paciente..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Anexos (Fotos, Vídeos, Documentos)</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                    className="w-full p-4 bg-white/5 border border-white/10 border-dashed rounded-xl cursor-pointer text-xs text-slate-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-sky-500 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-sky-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-sky-900/20"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : 'Salvar Prontuário'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
