import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import ProGuard from '../components/ProGuard';
import { 
  Activity, 
  Plus, 
  Search, 
  Video, 
  Image as ImageIcon, 
  X, 
  Loader2, 
  Trash2, 
  Edit2,
  Play,
  Dumbbell,
  Send,
  User,
  Check,
  ChevronRight,
  Info,
  ChevronLeft
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export default function Exercises() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPrescribeModal, setShowPrescribeModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    series: '',
    repeticoes: '',
    video_url: '',
    imagem_url: ''
  });

  useEffect(() => {
    if (authLoading) return;
    
    if (profile && profile.tipo_usuario !== 'fisioterapeuta') {
      navigate('/dashboard');
      return;
    }
    fetchExercises();
    fetchPatients();
  }, [profile, authLoading]);

  const fetchPatients = async () => {
    try {
      if (!user) return;
      // Tentamos buscar da tabela pacientes que vincula físo ao paciente
      const { data, error } = await supabase
        .from('pacientes')
        .select('id, nome, email')
        .eq('fisioterapeuta_id', user.id)
        .order('nome');
      
      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      console.error('Erro ao buscar pacientes:', err);
    }
  };

  const fetchExercises = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('exercicios')
        .select('*')
        .or(`fisio_id.is.null,fisio_id.eq.${user?.id}`)
        .order('nome');

      if (supabaseError) throw supabaseError;
      setExercises(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar exercícios:', err);
      setExercises([]);
      setError(err.message || 'Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('exercicios')
        .insert({
          ...formData,
          fisio_id: user?.id
        });

      if (error) throw error;

      toast.success('Exercício adicionado à biblioteca!');
      setShowModal(false);
      setFormData({
        nome: '',
        descricao: '',
        series: '',
        repeticoes: '',
        video_url: '',
        imagem_url: ''
      });
      fetchExercises();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar exercício');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrescribeExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedExercise) return;
    setSubmitting(true);
    try {
      // Corrected to use the 'exercicios_paciente' table as per schema
      const { error } = await supabase
        .from('exercicios_paciente')
        .insert({
          paciente_id: selectedPatientId,
          exercicio_id: selectedExercise.id,
          observacoes: `Séries: ${selectedExercise.series || 'N/A'}, Repetições: ${selectedExercise.repeticoes || 'N/A'}. ${selectedExercise.descricao || ''}`,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Exercício prescrito com sucesso!');
      setShowPrescribeModal(false);
      setSelectedPatientId('');
      setSelectedExercise(null);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao prescrever exercício. Verifique a tabela exercicios_paciente.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredExercises = exercises.filter(ex => 
    ex.nome.toLowerCase().includes(search.toLowerCase()) ||
    ex.descricao?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-12 h-12 text-sky-500 animate-spin" />
        <p className="text-slate-500 font-bold animate-pulse">Carregando biblioteca...</p>
      </div>
    );
  }

  return (
    <ProGuard>
      <div className="space-y-8 w-full box-border overflow-wrap-break-word">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Biblioteca de Exercícios</h1>
          <p className="text-slate-400 font-medium">Crie e gerencie sua base de exercícios terapêuticos.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-sky-500 text-white rounded-2xl font-black hover:bg-sky-600 transition-all shadow-lg shadow-sky-900/20"
        >
          <Plus size={20} />
          Novo Exercício
        </button>
      </header>

      <div className="relative w-full">
        <Search 
          className="absolute pointer-events-none z-20" 
          style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#94a3b8' }}
        />
        <input
          type="text"
          placeholder="Buscar exercício por nome ou descrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all shadow-sm text-white !pl-[60px]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
        {filteredExercises.length === 0 ? (
          <div className="col-span-full bg-slate-900/50 backdrop-blur-xl p-20 rounded-[3rem] border border-white/10 text-center w-full">
            <Dumbbell size={48} className="text-slate-700 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-white">Nenhum exercício encontrado</h3>
            <p className="text-slate-400 mt-2 font-medium">Sua biblioteca está vazia.</p>
          </div>
        ) : (
          filteredExercises.map((ex) => (
            <motion.div
              key={ex.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-sm overflow-hidden group hover:shadow-xl transition-all"
            >
              <div className="aspect-video bg-white/5 relative overflow-hidden">
                {ex.imagem_url ? (
                  <img src={ex.imagem_url} alt={ex.nome} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-700">
                    <Activity size={48} />
                  </div>
                )}
                {ex.video_url && (
                  <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-sky-500 shadow-lg">
                      <Play size={24} fill="currentColor" />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6">
                <h3 className="text-lg font-black text-white mb-2 line-clamp-1">{ex.nome}</h3>
                <p className="text-sm text-slate-400 line-clamp-2 mb-4 font-medium">{ex.descricao}</p>
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex gap-2">
                    <span className="text-[10px] font-black bg-sky-500/10 text-sky-400 px-2 py-1 rounded-md uppercase tracking-widest border border-sky-500/20">
                      {ex.series || '0'} Séries
                    </span>
                    <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md uppercase tracking-widest border border-emerald-500/20">
                      {ex.repeticoes || '0'} Reps
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedExercise(ex);
                        setShowPrescribeModal(true);
                      }}
                      className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-sky-900/20"
                      title="Atribuir a um paciente"
                    >
                      <Send size={14} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Atribuir</span>
                    </button>
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm('Deseja realmente excluir este exercício?')) {
                          const { error } = await supabase.from('exercicios').delete().eq('id', ex.id);
                          if (error) toast.error('Erro ao excluir');
                          else {
                            toast.success('Excluído');
                            fetchExercises();
                          }
                        }
                      }}
                      className="p-1.5 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal de Cadastro */}
      {showModal && createPortal(
        <AnimatePresence mode="wait">
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-slate-900 rounded-[3rem] shadow-2xl p-8 overflow-hidden flex flex-col max-h-[85vh] border border-white/10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-white tracking-tight">Novo Exercício</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-all text-slate-400"><X size={24} /></button>
              </div>

              <form onSubmit={handleCreateExercise} className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase tracking-widest ml-1">Nome do Exercício</label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all text-white"
                    placeholder="Ex: Agachamento Livre"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase tracking-widest ml-1">Descrição / Instruções</label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all h-24 resize-none text-white"
                    placeholder="Como realizar o exercício corretamente..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-widest ml-1">Séries</label>
                    <input
                      type="text"
                      value={formData.series}
                      onChange={(e) => setFormData({...formData, series: e.target.value})}
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all text-white"
                      placeholder="Ex: 3"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-widest ml-1">Repetições</label>
                    <input
                      type="text"
                      value={formData.repeticoes}
                      onChange={(e) => setFormData({...formData, repeticoes: e.target.value})}
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all text-white"
                      placeholder="Ex: 12 a 15"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase tracking-widest ml-1">URL da Imagem (Opcional)</label>
                  <input
                    type="url"
                    value={formData.imagem_url}
                    onChange={(e) => setFormData({...formData, imagem_url: e.target.value})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all text-white"
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase tracking-widest ml-1">URL do Vídeo (YouTube/Vimeo)</label>
                  <input
                    type="url"
                    value={formData.video_url}
                    onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all text-white"
                    placeholder="https://youtube.com/..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-5 bg-sky-500 text-white rounded-2xl font-black text-lg hover:bg-sky-600 transition-all shadow-xl shadow-sky-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : 'Salvar Exercício'}
                </button>
              </form>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}

      {/* Modal de Prescrição */}
      {showPrescribeModal && createPortal(
        <AnimatePresence mode="wait">
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPrescribeModal(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-slate-900 rounded-[3rem] shadow-2xl p-8 overflow-hidden flex flex-col max-h-[85vh] border border-white/10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Prescrever Exercício</h2>
                  <p className="text-slate-400 text-sm font-medium">Atribuir "{selectedExercise?.nome}" a um paciente.</p>
                </div>
                <button onClick={() => setShowPrescribeModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-all text-slate-400"><X size={24} /></button>
              </div>

              <form onSubmit={handlePrescribeExercise} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase tracking-widest ml-1">Selecionar Paciente</label>
                  <div className="relative">
                    <User className="absolute pointer-events-none z-20" style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#94a3b8' }} />
                    <select
                      required
                      value={selectedPatientId}
                      onChange={(e) => setSelectedPatientId(e.target.value)}
                      className="w-full pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all appearance-none text-white !pl-[60px]"
                    >
                      <option value="" className="bg-slate-900">Selecione um paciente...</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id} className="bg-slate-900">{p.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-sky-500/10 p-6 rounded-2xl border border-sky-500/20">
                  <div className="flex items-center gap-3 mb-2">
                    <Activity className="text-sky-400" size={20} />
                    <span className="font-black text-white">{selectedExercise?.nome}</span>
                  </div>
                  <div className="flex gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <span>{selectedExercise?.series || '0'} Séries</span>
                    <span>{selectedExercise?.repeticoes || '0'} Reps</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedPatientId}
                  className="w-full py-5 bg-sky-500 text-white rounded-2xl font-black text-lg hover:bg-sky-600 transition-all shadow-xl shadow-sky-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : (
                    <>
                      <Send size={20} />
                      Confirmar Prescrição
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
    </div>
    </ProGuard>
  );
}
