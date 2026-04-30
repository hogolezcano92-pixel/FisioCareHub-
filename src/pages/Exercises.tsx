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
  X, 
  Loader2, 
  Trash2, 
  Dumbbell,
  Send,
  User,
  Filter,
  Check,
  ChevronRight,
  Info,
  ShoppingCart,
  Layers,
  HeartPulse,
  Brain,
  Wind,
  Zap,
  Accessibility,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { 
  OBJETIVOS_TERAPEUTICOS, 
  CONTEXTOS_FUNCIONAIS, 
  DIFICULDADES,
  type ObjetivoTerapeutico,
  type ContextoFuncional,
  type Dificuldade
} from '../constants/exerciseCategories';

interface Exercise {
  id: number;
  nome: string;
  descricao: string;
  objetivo_principal: string;
  objetivos_secundarios: string[];
  categoria_principal: string;
  subcategoria: string;
  contexto_funcional: string[];
  precaucoes: string;
  dificuldade: Dificuldade;
  indicacao_clinica: string;
  imagem_url: string;
  video_url?: string;
  series?: string;
  repeticoes?: string;
}

interface PrescriptionItem extends Exercise {
  customSeries?: string;
  customReps?: string;
  customWeight?: string;
  customFreq?: string;
  customObs?: string;
}

export default function Exercises() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // Data States
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI States
  const [search, setSearch] = useState('');
  const [selectedObjective, setSelectedObjective] = useState<string>('');
  const [selectedContext, setSelectedContext] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedExerciseDetail, setSelectedExerciseDetail] = useState<Exercise | null>(null);
  
  // Prescription Mode States
  const [isPrescriptionMode, setIsPrescriptionMode] = useState(false);
  const [prescriptionCart, setPrescriptionCart] = useState<PrescriptionItem[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [showPrescriptionReview, setShowPrescriptionReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (profile && profile.tipo_usuario !== 'fisioterapeuta') {
      navigate('/dashboard');
      return;
    }
    fetchExercises();
    fetchPatients();
  }, [profile, authLoading]);

  const fetchExercises = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('exercicios')
        .select('*')
        .or(`fisio_id.is.null,fisio_id.eq.${user?.id}`)
        .order('nome');

      if (error) throw error;
      setExercises(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar exercícios:', err);
      toast.error('Erro ao carregar biblioteca');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      if (!user) return;
      const { data, error } = await supabase
        .from('pacientes')
        .select('id, nome')
        .eq('fisioterapeuta_id', user.id)
        .order('nome');
      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      console.error('Erro ao buscar pacientes:', err);
    }
  };

  const toggleExerciseInPrescription = (ex: Exercise) => {
    setPrescriptionCart(prev => {
      const exists = prev.find(item => item.id === ex.id);
      if (exists) {
        return prev.filter(item => item.id !== ex.id);
      } else {
        return [...prev, { ...ex, customSeries: ex.series || '3', customReps: ex.repeticoes || '12', customFreq: '1x ao dia' }];
      }
    });
  };

  const handleSendPrescription = async () => {
    if (!selectedPatientId) {
      toast.error('Selecione um paciente');
      return;
    }
    if (prescriptionCart.length === 0) {
      toast.error('Adicione exercícios à prescrição');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Criar o Protocolo
      const { data: protocol, error: pError } = await supabase
        .from('protocolos_prescricao')
        .insert({
          fisioterapeuta_id: user?.id,
          paciente_id: selectedPatientId,
          titulo: `Protocolo - ${new Date().toLocaleDateString()}`,
        })
        .select()
        .single();

      if (pError) throw pError;

      // 2. Criar os Itens do Protocolo
      const items = prescriptionCart.map((item, index) => ({
        protocolo_id: protocol.id,
        exercicio_id: item.id,
        series: item.customSeries,
        repeticoes: item.customReps,
        carga: item.customWeight,
        frequencia: item.customFreq,
        observacoes_especificas: item.customObs,
        ordem: index
      }));

      const { error: iError } = await supabase
        .from('protocolo_itens')
        .insert(items);

      if (iError) throw iError;

      // 3. (Opcional) Também salvar na tabela legado exercicios_paciente para garantir retrocompatibilidade se houver outras telas usando
      const legacyItems = prescriptionCart.map(item => ({
        paciente_id: selectedPatientId,
        exercicio_id: item.id,
        observacoes: `Séries: ${item.customSeries}, Repetições: ${item.customReps}. ${item.customObs || ''}`
      }));
      await supabase.from('exercicios_paciente').insert(legacyItems);

      toast.success('Protocolo enviado com sucesso!');
      setPrescriptionCart([]);
      setIsPrescriptionMode(false);
      setShowPrescriptionReview(false);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao enviar protocolo. Verifique se as tabelas foram criadas via SQL.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.nome.toLowerCase().includes(search.toLowerCase()) || 
                         ex.objetivo_principal?.toLowerCase().includes(search.toLowerCase());
    const matchesObjective = !selectedObjective || ex.objetivo_principal === selectedObjective;
    const matchesContext = !selectedContext || ex.contexto_funcional?.includes(selectedContext);
    const matchesDifficulty = !selectedDifficulty || ex.dificuldade === selectedDifficulty;
    
    return matchesSearch && matchesObjective && matchesContext && matchesDifficulty;
  });

  return (
    <ProGuard>
      <div className="space-y-6 max-w-[1600px] mx-auto pb-20">
        
        {/* Header Section */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <Dumbbell className="text-sky-500" size={36} />
              Biblioteca Clínica
            </h1>
            <p className="text-slate-400 font-medium">Prescreva protocolos estruturados com evidência e clareza visual.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPrescriptionMode(!isPrescriptionMode)}
              className={cn(
                "flex items-center gap-2 px-6 py-4 rounded-2xl font-black transition-all shadow-lg",
                isPrescriptionMode 
                  ? "bg-amber-500 text-white shadow-amber-900/20" 
                  : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
              )}
            >
              <ShoppingCart size={20} />
              {isPrescriptionMode ? "Modo Prescrição Ativo" : "Iniciar Prescrição"}
              {prescriptionCart.length > 0 && (
                <span className="ml-2 bg-white text-amber-600 px-2 py-0.5 rounded-full text-xs">
                  {prescriptionCart.length}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-4 bg-sky-500 text-white rounded-2xl font-black hover:bg-sky-600 transition-all shadow-lg shadow-sky-900/20"
            >
              <Plus size={20} />
              Novo Exercício
            </button>
          </div>
        </header>

        {/* Filters and Search */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou objetivo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all"
            />
          </div>

          <select
            value={selectedObjective}
            onChange={(e) => setSelectedObjective(e.target.value)}
            className="w-full px-4 py-4 bg-slate-900/50 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="">Todos Objetivos</option>
            {OBJETIVOS_TERAPEUTICOS.map(obj => (
              <option key={obj} value={obj}>{obj}</option>
            ))}
          </select>

          <select
            value={selectedContext}
            onChange={(e) => setSelectedContext(e.target.value)}
            className="w-full px-4 py-4 bg-slate-900/50 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="">Todos Contextos</option>
            {CONTEXTOS_FUNCIONAIS.map(ctx => (
              <option key={ctx} value={ctx}>{ctx}</option>
            ))}
          </select>

          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="w-full px-4 py-4 bg-slate-900/50 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="">Todas Dificuldades</option>
            {DIFICULDADES.map(diff => (
              <option key={diff.value} value={diff.value}>{diff.label}</option>
            ))}
          </select>
        </div>

        {/* Exercises Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[400px] bg-slate-900/50 animate-pulse rounded-[2.5rem] border border-white/10" />
            ))
          ) : filteredExercises.length === 0 ? (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-white/10">
                <Dumbbell size={40} className="text-slate-700" />
              </div>
              <p className="text-slate-500 font-bold">Nenhum exercício encontrado com esses filtros.</p>

              {exercises.length === 0 && (
                <div className="pt-4 max-w-sm mx-auto space-y-4">
                  <p className="text-slate-400 text-sm">Sua biblioteca está vazia. Deseja importar uma base de exercícios clínicos padrão para começar?</p>
                  <button
                    onClick={async () => {
                      const { seedExerciseLibrary } = await import('../utils/exerciseSeeder');
                      const success = await seedExerciseLibrary(user?.id);
                      if (success) fetchExercises();
                    }}
                    className="flex items-center justify-center gap-2 w-full py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <Plus size={20} />
                    Importar Biblioteca Base
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredExercises.map((ex) => {
              const isInCart = prescriptionCart.find(item => item.id === ex.id);
              return (
                <motion.div
                  layout
                  key={ex.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "group relative bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border transition-all overflow-hidden hover:border-sky-500/50 hover:shadow-2xl hover:shadow-sky-500/10",
                    isInCart ? "border-amber-500 bg-amber-500/5 shadow-lg shadow-amber-900/10" : "border-white/10"
                  )}
                >
                  {/* Image Container */}
                  <div className="aspect-[4/3] relative bg-white/5 overflow-hidden">
                    {ex.imagem_url ? (
                      <img 
                        src={ex.imagem_url} 
                        alt={ex.nome} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-800">
                        <Activity size={64} />
                      </div>
                    )}
                    
                    {/* Badges */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      <span className={cn(
                        "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border backdrop-blur-md",
                        DIFICULDADES.find(d => d.value === ex.dificuldade)?.color || "text-slate-400 bg-slate-400/10 border-slate-400/20"
                      )}>
                        {ex.dificuldade || 'Iniciante'}
                      </span>
                    </div>

                    {/* Objective Badge */}
                    <div className="absolute bottom-4 left-4">
                      <span className="bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-xl border border-white/10 uppercase tracking-tight">
                        {ex.objetivo_principal || 'Geral'}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="text-xl font-black text-white leading-tight group-hover:text-sky-400 transition-colors">{ex.nome}</h3>
                      <p className="text-sm text-slate-500 font-medium line-clamp-2 mt-1">{ex.descricao}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                       {ex.contexto_funcional?.slice(0, 2).map(ctx => (
                         <span key={ctx} className="text-[9px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                           {ctx}
                         </span>
                       ))}
                    </div>

                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                      <button
                        onClick={() => setSelectedExerciseDetail(ex)}
                        className="flex items-center gap-2 text-sky-400 hover:text-sky-300 font-black text-xs uppercase tracking-widest"
                      >
                        <Info size={16} />
                        Detalhes
                      </button>

                      {isPrescriptionMode && (
                        <button
                          onClick={() => toggleExerciseInPrescription(ex)}
                          className={cn(
                            "p-3 rounded-2xl transition-all flex items-center gap-2",
                            isInCart 
                              ? "bg-amber-500 text-white" 
                              : "bg-white/5 text-slate-400 border border-white/10 hover:bg-sky-500 hover:text-white hover:border-sky-500"
                          )}
                        >
                          {isInCart ? <Check size={20} /> : <Plus size={20} />}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Floating Prescription Bar */}
        <AnimatePresence>
          {isPrescriptionMode && prescriptionCart.length > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-[5000]"
            >
              <div className="bg-slate-900 border border-amber-500/50 shadow-2xl shadow-amber-500/20 p-4 rounded-[2rem] backdrop-blur-2xl flex items-center justify-between">
                <div className="flex items-center gap-4 ml-2">
                  <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white font-black">
                    {prescriptionCart.length}
                  </div>
                  <div>
                    <p className="text-white font-black">Sua Prescrição</p>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                      {prescriptionCart.length === 1 ? '1 exercício selecionado' : `${prescriptionCart.length} exercícios selecionados`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPrescriptionReview(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-black flex items-center gap-2 transition-all"
                >
                  Revisar e Enviar
                  <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Detail Modal */}
        {selectedExerciseDetail && createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setSelectedExerciseDetail(null)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="relative w-full max-w-4xl bg-slate-900 rounded-[3rem] border border-white/10 overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
            >
              <div className="md:w-1/2 bg-slate-950 relative overflow-hidden">
                {selectedExerciseDetail.imagem_url ? (
                  <img src={selectedExerciseDetail.imagem_url} alt={selectedExerciseDetail.nome} className="w-full h-full object-contain p-4" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-800">
                    <Activity size={120} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />
              </div>

              <div className="md:w-1/2 p-8 md:p-12 overflow-y-auto space-y-8 custom-scrollbar bg-slate-900">
                <button 
                  onClick={() => setSelectedExerciseDetail(null)}
                  className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-all border border-white/10"
                >
                  <X size={24} />
                </button>

                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-sky-500/10 text-sky-400 text-[10px] font-black px-3 py-1 rounded-full border border-sky-500/20 uppercase tracking-widest leading-none">
                      {selectedExerciseDetail.categoria_principal || 'Geral'}
                    </span>
                    <span className={cn(
                      "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border",
                      DIFICULDADES.find(d => d.value === selectedExerciseDetail.dificuldade)?.color || "text-slate-400 bg-slate-400/10 border-slate-400/20"
                    )}>
                      {selectedExerciseDetail.dificuldade}
                    </span>
                  </div>
                  <h2 className="text-4xl font-black text-white leading-tight">{selectedExerciseDetail.nome}</h2>
                </div>

                <div className="space-y-6">
                  <section className="space-y-2">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Target className="text-sky-500" size={14} />
                      Objetivo Principal
                    </h4>
                    <p className="text-white font-medium bg-white/5 p-4 rounded-2xl border border-white/5">
                      {selectedExerciseDetail.objetivo_principal}
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Descrição e Passo a Passo</h4>
                    <p className="text-slate-300 font-medium leading-relaxed">
                      {selectedExerciseDetail.descricao}
                    </p>
                  </section>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Indicação Clínica</h4>
                      <p className="text-xs text-slate-300 font-bold">{selectedExerciseDetail.indicacao_clinica || 'N/A'}</p>
                    </div>
                    <div className="bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10">
                      <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Precauções</h4>
                      <p className="text-xs text-rose-400 font-bold">{selectedExerciseDetail.precaucoes || 'Nenhuma informada'}</p>
                    </div>
                  </div>

                  <div className="pt-8 flex gap-4">
                    <button
                      onClick={() => {
                        toggleExerciseInPrescription(selectedExerciseDetail);
                        setSelectedExerciseDetail(null);
                        setIsPrescriptionMode(true);
                      }}
                      className="flex-1 py-4 bg-sky-500 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-sky-600 transition-all shadow-xl shadow-sky-900/20"
                    >
                      <Plus size={20} />
                      Adicionar à Prescrição
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>,
          document.body
        )}

        {/* Prescription Review Modal */}
        {showPrescriptionReview && createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowPrescriptionReview(false)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" />
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="relative w-full max-w-4xl bg-slate-900 rounded-[3rem] border border-white/10 p-8 flex flex-col max-h-[90vh] shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                 <div>
                   <h2 className="text-3xl font-black text-white tracking-tight">Finalizar Protocolo</h2>
                   <p className="text-slate-400 font-medium">Revise a prescrição antes de enviar ao paciente.</p>
                 </div>
                 <button onClick={() => setShowPrescriptionReview(false)} className="p-2 hover:bg-white/5 rounded-full transition-all text-slate-400"><X size={24} /></button>
              </div>

              <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-8">
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Paciente Destinatário</label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black focus:ring-2 focus:ring-sky-500 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-slate-900">Selecione o paciente...</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id} className="bg-slate-900">{p.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Configurações de Exercício</label>
                  {prescriptionCart.map((item, idx) => (
                    <div key={item.id} className="bg-slate-950/50 p-6 rounded-[2rem] border border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 bg-sky-500/20 text-sky-400 rounded-lg flex items-center justify-center font-black text-sm border border-sky-500/30 font-mono">
                            {idx + 1}
                          </span>
                          <h4 className="font-black text-white text-lg">{item.nome}</h4>
                        </div>
                        <button 
                          onClick={() => setPrescriptionCart(prev => prev.filter(p => p.id !== item.id))}
                          className="text-slate-600 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Séries</label>
                          <input 
                            value={item.customSeries} 
                            onChange={(e) => {
                              const newVal = e.target.value;
                              setPrescriptionCart(prev => prev.map(p => p.id === item.id ? { ...p, customSeries: newVal } : p));
                            }}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Repetições</label>
                          <input 
                            value={item.customReps}
                            onChange={(e) => {
                              const newVal = e.target.value;
                              setPrescriptionCart(prev => prev.map(p => p.id === item.id ? { ...p, customReps: newVal } : p));
                            }}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Carga (kg)</label>
                          <input 
                            placeholder="S/ carga"
                            value={item.customWeight}
                            onChange={(e) => {
                              const newVal = e.target.value;
                              setPrescriptionCart(prev => prev.map(p => p.id === item.id ? { ...p, customWeight: newVal } : p));
                            }}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Frequência</label>
                          <input 
                            value={item.customFreq}
                            onChange={(e) => {
                              const newVal = e.target.value;
                              setPrescriptionCart(prev => prev.map(p => p.id === item.id ? { ...p, customFreq: newVal } : p));
                            }}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm" 
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8 border-t border-white/10 flex gap-4">
                <button
                  disabled={submitting}
                  onClick={handleSendPrescription}
                  className="flex-1 py-5 bg-emerald-500 text-white rounded-2xl font-black text-lg hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-900/20 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : (
                    <>
                      <Send size={24} />
                      Enviar para o Paciente
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}

        {/* Add Modal */}
        {showAddModal && <AddExerciseModal onClose={() => { setShowAddModal(false); fetchExercises(); }} user={user} />}
      </div>
    </ProGuard>
  );
}

// Subcomponent for adding new exercises
function AddExerciseModal({ onClose, user }: { onClose: () => void, user: any }) {
  const [formData, setFormData] = useState({
    nome: '',
    objetivo_principal: OBJETIVOS_TERAPEUTICOS[0] as string,
    categoria_principal: 'Musculoesquelético',
    subcategoria: '',
    descricao: '',
    indicacao_clinica: '',
    precaucoes: '',
    dificuldade: 'iniciante' as Dificuldade,
    imagem_url: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('exercicios')
        .insert({
          ...formData,
          fisio_id: user?.id,
          objetivos_secundarios: [],
          contexto_funcional: []
        });

      if (error) {
        console.error('Erro ao salvar exercício:', error);
        throw new Error(error.message);
      }
      toast.success('Exercício salvo com sucesso!');
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao salvar: ' + (err.message || 'Verifique se as colunas SQL foram criadas.'));
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-2xl bg-slate-900 rounded-[3rem] p-10 border border-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <h2 className="text-3xl font-black text-white mb-8 tracking-tight">Expandir Biblioteca</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Nome</label>
              <input required value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-700" placeholder="Ex: Prancha Abdominal" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Dificuldade</label>
              <select value={formData.dificuldade} onChange={e => setFormData({...formData, dificuldade: e.target.value as Dificuldade})} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-sky-500 appearance-none">
                {DIFICULDADES.map(d => <option key={d.value} value={d.value} className="bg-slate-900">{d.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Objetivo Terapêutico</label>
              <select value={formData.objetivo_principal} onChange={e => setFormData({...formData, objetivo_principal: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-sky-500 appearance-none">
                {OBJETIVOS_TERAPEUTICOS.map(o => <option key={o} value={o} className="bg-slate-900">{o}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Subcategoria / Região</label>
              <input value={formData.subcategoria} onChange={e => setFormData({...formData, subcategoria: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-700" placeholder="Ex: Ombro / Isometria" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Descrição do Movimento</label>
            <textarea required value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-sky-500 h-32 resize-none placeholder:text-slate-700" placeholder="Descreva o passo a passo da execução perfeita..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Indicação Clínica</label>
               <input value={formData.indicacao_clinica} onChange={e => setFormData({...formData, indicacao_clinica: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-700" placeholder="Ex: Reabilitação ACL" />
             </div>
             <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">URL da Imagem </label>
               <input value={formData.imagem_url} onChange={e => setFormData({...formData, imagem_url: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-700" placeholder="https://..." />
             </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-sky-500 text-white rounded-2xl font-black text-lg hover:bg-sky-600 transition-all shadow-xl shadow-sky-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Salvar na Biblioteca'}
          </button>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}

function Target(props: any) {
  return (
    <svg 
      {...props} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
