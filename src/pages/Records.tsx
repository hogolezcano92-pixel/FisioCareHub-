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
import { formatDate, cn } from '../lib/utils';
import { generateMedicalRecord } from '../lib/gemini';
import { getUserName } from '../lib/user';
import { uploadDocument } from '../services/supabaseStorage';
import ProGuard from '../components/ProGuard';

export default function Records() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [triages, setTriages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  
  // New Record Form
  const [patientEmail, setPatientEmail] = useState('');
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
    const init = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from('perfis')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserData(profile);

          const isPhysio = profile.tipo_usuario === 'fisioterapeuta';
          const userIdField = isPhysio ? 'fisio_id' : 'paciente_id';

          const fetchRecords = async () => {
            const { data: recordsData, error: recordsError } = await supabase
              .from('prontuarios')
              .select('*')
              .eq(userIdField, user.id)
              .order('data_registro', { ascending: false });

            if (recordsError) {
              console.error(recordsError);
              return;
            }

            setRecords(recordsData);
            
            // Resolve names
            const otherRoleField = isPhysio ? 'paciente_id' : 'fisio_id';
            const uidsToResolve = new Set<string>();
            recordsData.forEach((rec: any) => uidsToResolve.add(rec[otherRoleField]));
            
            const resolvedNames: Record<string, string> = { ...nameMap };
            await Promise.all(Array.from(uidsToResolve).map(async (uid) => {
              if (!resolvedNames[uid]) {
                resolvedNames[uid] = await getUserName(uid);
              }
            }));
            setNameMap(resolvedNames);
            setLoading(false);

            // Fetch triages
            if (isPhysio && recordsData.length > 0) {
              const patientIds = Array.from(new Set(recordsData.map((r: any) => r.paciente_id)));
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
          };

          fetchRecords();

          // Real-time subscription
          const subscription = supabase
            .channel('prontuarios_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'prontuarios' }, () => {
              fetchRecords();
            })
            .subscribe();

          return () => {
            supabase.removeChannel(subscription);
          };
        }
      }
    };

    if (!authLoading) {
      init();
    }
  }, [user, authLoading, navigate]);

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
    if (!content.trim() || submitting || !user) return;

    setSubmitting(true);
    setError('');
    try {
      // Find patient by email
      const { data: patientData, error: patientError } = await supabase
        .from('perfis')
        .select('id')
        .eq('email', patientEmail.trim().toLowerCase())
        .eq('tipo_usuario', 'paciente')
        .single();
      
      if (patientError || !patientData) {
        setError("Paciente não encontrado com este e-mail.");
        const { toast } = await import('sonner');
        toast.error("Paciente não encontrado.");
        setSubmitting(false);
        return;
      }

      const patientId = patientData.id;
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
          paciente_id: patientId,
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
      setPatientEmail('');
      setFiles([]);
      const { toast } = await import('sonner');
      toast.success("Prontuário salvo com sucesso!");
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

  const isPhysio = userData?.tipo_usuario === 'fisioterapeuta';

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Prontuários</h1>
          <p className="text-slate-500">Histórico completo de atendimentos e evoluções.</p>
        </div>
        {isPhysio && (
          <ProGuard variant="inline">
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
            >
              <Plus size={20} /> Novo Registro
            </button>
          </ProGuard>
        )}
      </header>

      {triages.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-purple-600">
            <BrainCircuit size={24} />
            Triagens Recentes
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {triages.slice(0, 4).map((triage) => (
              <div key={triage.id} className="bg-purple-50 p-6 rounded-3xl border border-purple-100">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                    {formatDate(triage.data_triagem)}
                  </div>
                  {userData?.tipo_usuario === 'fisioterapeuta' && (
                    <div className="text-[10px] bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                      PACIENTE: {nameMap[triage.paciente_id] || triage.paciente_id.slice(0, 6)}
                    </div>
                  )}
                </div>
                <div className="text-sm font-bold text-purple-900 mb-1">Sintomas:</div>
                <p className="text-sm text-purple-800 line-clamp-2 mb-3">{triage.sintomas}</p>
                {triage.aiAnalysis && (
                  <div className="text-xs text-purple-600 bg-white/50 p-3 rounded-xl border border-purple-100 italic">
                    {triage.aiAnalysis.slice(0, 100)}...
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6">
        {records.length === 0 ? (
          <div className="bg-white p-20 rounded-[2.5rem] border border-slate-100 text-center">
            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Nenhum prontuário encontrado</h3>
            <p className="text-slate-500 mt-2">Os registros de atendimento aparecerão aqui.</p>
          </div>
        ) : (
          records.map((record) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                      {formatDate(record.data_registro)}
                    </div>
                    <div className="text-lg font-bold text-slate-900">
                      Atendimento Realizado
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-4 py-2 rounded-full">
                  <User size={16} />
                  {isPhysio ? 'Paciente: ' : 'Fisioterapeuta: '}
                  {nameMap[isPhysio ? record.paciente_id : record.fisio_id] || 'Carregando...'}
                </div>
              </div>

              <div className="prose prose-slate max-w-none text-slate-700 mb-6 whitespace-pre-wrap">
                {record.conteudo?.text || record.conteudo}
              </div>

              {record.conteudo?.attachments?.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-6 border-t border-slate-50">
                  {record.conteudo.attachments.map((url: string, i: number) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-sm font-bold transition-colors"
                    >
                      <Paperclip size={16} /> Anexo {i + 1} <Download size={14} />
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between flex-shrink-0">
                <h2 className="text-2xl font-bold">Novo Registro de Atendimento</h2>
                <button onClick={() => setShowNewModal(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleCreateRecord} className="p-8 space-y-6 overflow-y-auto">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3 text-sm">
                    <AlertCircle size={20} />
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">E-mail do Paciente</label>
                  <input
                    type="email"
                    required
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                    placeholder="paciente@email.com"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-slate-700">Evolução / Conduta</label>
                    <ProGuard variant="inline">
                      <button
                        type="button"
                        onClick={() => setShowAiPanel(!showAiPanel)}
                        className="flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100 transition-all"
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
                        <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl space-y-4">
                          <div className="grid grid-cols-3 gap-2">
                            {['Avaliação Físico-Funcional', 'Tratamento', 'Evolução'].map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setAiType(type)}
                                className={cn(
                                  "px-2 py-2 text-[10px] font-bold rounded-lg border transition-all",
                                  aiType === type 
                                    ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-100" 
                                    : "bg-white text-purple-600 border-purple-100 hover:bg-purple-50"
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
                              className="w-full p-3 bg-white border border-purple-100 rounded-xl text-sm focus:ring-2 focus:ring-purple-600 outline-none h-24 resize-none"
                            />
                            <button
                              type="button"
                              onClick={handleAiGenerate}
                              disabled={generatingAi || !aiNotes.trim()}
                              className="absolute bottom-2 right-2 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              {generatingAi ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                            </button>
                          </div>
                          <p className="text-[10px] text-purple-400 italic">
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
                    className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none resize-none"
                    placeholder="Descreva o atendimento, exercícios realizados e evolução do paciente..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Anexos (Fotos, Vídeos, Documentos)</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                    className="w-full p-4 bg-slate-50 border border-slate-200 border-dashed rounded-xl cursor-pointer"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
