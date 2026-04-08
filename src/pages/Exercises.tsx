import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
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
  Dumbbell
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export default function Exercises() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
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
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercicios')
        .select('*')
        .order('nome');

      if (error) throw error;
      setExercises(data || []);
    } catch (err) {
      console.error('Erro ao buscar exercícios:', err);
      toast.error('Erro ao carregar biblioteca');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('exercicios')
        .insert(formData);

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

  const filteredExercises = exercises.filter(ex => 
    ex.nome.toLowerCase().includes(search.toLowerCase()) ||
    ex.descricao?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-sky-500" size={48} /></div>;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Biblioteca de Exercícios</h1>
          <p className="text-slate-500 font-medium">Crie e gerencie sua base de exercícios terapêuticos.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-sky-500 text-white rounded-2xl font-black hover:bg-sky-600 transition-all shadow-lg shadow-sky-100"
        >
          <Plus size={20} />
          Novo Exercício
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Buscar exercício por nome ou descrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredExercises.length === 0 ? (
          <div className="col-span-full bg-white p-20 rounded-[3rem] border border-slate-100 text-center">
            <Dumbbell size={48} className="text-slate-200 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-slate-900">Nenhum exercício encontrado</h3>
            <p className="text-slate-500 mt-2 font-medium">Sua biblioteca está vazia.</p>
          </div>
        ) : (
          filteredExercises.map((ex) => (
            <motion.div
              key={ex.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all"
            >
              <div className="aspect-video bg-slate-50 relative overflow-hidden">
                {ex.imagem_url ? (
                  <img src={ex.imagem_url} alt={ex.nome} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-200">
                    <Activity size={48} />
                  </div>
                )}
                {ex.video_url && (
                  <div className="absolute inset-0 bg-slate-900/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-sky-500 shadow-lg">
                      <Play size={24} fill="currentColor" />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6">
                <h3 className="text-lg font-black text-slate-900 mb-2 line-clamp-1">{ex.nome}</h3>
                <p className="text-sm text-slate-500 line-clamp-2 mb-4 font-medium">{ex.descricao}</p>
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex gap-2">
                    <span className="text-[10px] font-black bg-sky-50 text-sky-600 px-2 py-1 rounded-md uppercase tracking-widest">
                      {ex.series || '0'} Séries
                    </span>
                    <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md uppercase tracking-widest">
                      {ex.repeticoes || '0'} Reps
                    </span>
                  </div>
                  <button className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal de Cadastro */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl p-8 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Novo Exercício</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-50 rounded-full transition-all"><X size={24} /></button>
              </div>

              <form onSubmit={handleCreateExercise} className="space-y-6 overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Nome do Exercício</label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                    placeholder="Ex: Agachamento Livre"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Descrição / Instruções</label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all h-24 resize-none"
                    placeholder="Como realizar o exercício corretamente..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Séries</label>
                    <input
                      type="text"
                      value={formData.series}
                      onChange={(e) => setFormData({...formData, series: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                      placeholder="Ex: 3"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Repetições</label>
                    <input
                      type="text"
                      value={formData.repeticoes}
                      onChange={(e) => setFormData({...formData, repeticoes: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                      placeholder="Ex: 12 a 15"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">URL da Imagem (Opcional)</label>
                  <input
                    type="url"
                    value={formData.imagem_url}
                    onChange={(e) => setFormData({...formData, imagem_url: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">URL do Vídeo (YouTube/Vimeo)</label>
                  <input
                    type="url"
                    value={formData.video_url}
                    onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                    placeholder="https://youtube.com/..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-5 bg-sky-500 text-white rounded-2xl font-black text-lg hover:bg-sky-600 transition-all shadow-xl shadow-sky-100 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : 'Salvar Exercício'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
