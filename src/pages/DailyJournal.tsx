import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  ClipboardList, 
  MessageSquare, 
  Save, 
  History, 
  TrendingUp, 
  CheckCircle2, 
  Calendar,
  AlertCircle,
  Loader2,
  ChevronRight,
  Smile,
  Meh,
  Frown,
  Skull,
  Zap,
  BarChart3
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

interface ExerciseItem {
  id: string;
  name: string;
  completed: boolean;
}

interface JournalEntry {
  id: string;
  nivel_dor: number;
  exercicios_concluidos: ExerciseItem[];
  total_exercicios: number;
  concluidos_count: number;
  notas: string;
  visualizado_por_fisio: boolean;
  visualizado_em: string;
  data_registro: string;
}

const PAIN_LEVELS = [
  { value: 1, label: 'Sem dor', emoji: '😊', color: 'bg-emerald-500' },
  { value: 2, label: 'Muito leve', emoji: '🙂', color: 'bg-emerald-400' },
  { value: 3, label: 'Leve', emoji: '😐', color: 'bg-green-400' },
  { value: 4, label: 'Moderada', emoji: '😕', color: 'bg-yellow-400' },
  { value: 5, label: 'Incomoda', emoji: '😟', color: 'bg-yellow-500' },
  { value: 6, label: 'Destaque', emoji: '😣', color: 'bg-orange-400' },
  { value: 7, label: 'Forte', emoji: '😫', color: 'bg-orange-500' },
  { value: 8, label: 'Muito forte', emoji: '😰', color: 'bg-red-500' },
  { value: 9, label: 'Insuportável', emoji: '😱', color: 'bg-red-600' },
  { value: 10, label: 'Cruel', emoji: '💀', color: 'bg-slate-900' },
];

export default function DailyJournal() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [painLevel, setPainLevel] = useState<number | null>(null);
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [notes, setNotes] = useState('');
  const [history, setHistory] = useState<JournalEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'journal' | 'progress'>('journal');
  const [physioName, setPhysioName] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchExercises(),
        fetchHistory(),
        fetchPhysioInfo()
      ]);
    } catch (err) {
      console.error('Erro ao carregar diário:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPhysioInfo = async () => {
    try {
      const { data: pacienteData } = await supabase
        .from('pacientes')
        .select(`
          fisioterapeuta_id,
          fisioterapeutas:fisioterapeuta_id (nome_completo)
        `)
        .eq('email', user?.email)
        .single();
      
      if (pacienteData?.fisioterapeutas) {
        setPhysioName((pacienteData.fisioterapeutas as any).nome_completo);
      }
    } catch (err) {
      console.log('Fisioterapeuta não encontrado ou não vinculado');
    }
  }

  const fetchExercises = async () => {
    try {
      const { data: protocols } = await supabase
        .from('protocolos_prescricao')
        .select('id')
        .eq('paciente_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (protocols && protocols.length > 0) {
        const { data: items } = await supabase
          .from('protocolo_itens')
          .select(`
            id,
            exercicio:exercicios (nome)
          `)
          .eq('protocolo_id', protocols[0].id)
          .order('ordem');

        if (items) {
          setExercises(items.map(item => ({
            id: item.id,
            name: (item.exercicio as any).nome,
            completed: false
          })));
        }
      }
    } catch (err) {
      console.error('Erro ao buscar exercícios:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('registros_paciente')
        .select('*')
        .eq('paciente_id', user?.id)
        .order('data_registro', { ascending: false });

      if (error) throw error;
      setHistory(data || []);

      // Se houver registro hoje, preencher os campos (opcional, para edição)
      const today = new Date().toISOString().split('T')[0];
      const todayEntry = data?.find(e => e.data_registro === today);
      if (todayEntry) {
        setPainLevel(todayEntry.nivel_dor);
        setExercises(todayEntry.exercicios_concluidos);
        setNotes(todayEntry.notas || '');
      }
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
    }
  };

  const toggleExercise = (id: string) => {
    setExercises(prev => prev.map(ex => 
      ex.id === id ? { ...ex, completed: !ex.completed } : ex
    ));
  };

  const completedCount = useMemo(() => 
    exercises.filter(ex => ex.completed).length
  , [exercises]);

  const handleSave = async () => {
    if (painLevel === null) {
      toast.error('Por favor, selecione seu nível de dor.');
      return;
    }

    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const entryData = {
        paciente_id: user?.id,
        nivel_dor: painLevel,
        exercicios_concluidos: exercises,
        total_exercicios: exercises.length,
        concluidos_count: completedCount,
        notas: notes,
        data_registro: today
      };

      // Tenta Upsert (se já existir hoje, atualiza)
      const { error } = await supabase
        .from('registros_paciente')
        .upsert(entryData, { onConflict: 'paciente_id,data_registro' });

      if (error) throw error;

      toast.success("Dados salvos e compartilhados com o fisioterapeuta em tempo real");
      fetchHistory();
    } catch (err) {
      console.error('Erro ao salvar diário:', err);
      toast.error('Erro ao salvar o diário. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const chartData = useMemo(() => {
    return [...history].reverse().slice(-30).map(entry => ({
      data: new Date(entry.data_registro).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      dor: entry.nivel_dor,
      adesao: (entry.concluidos_count / (entry.total_exercicios || 1)) * 100
    }));
  }, [history]);

  const weeklyAdherence = useMemo(() => {
    const last7Days = history.slice(0, 7).reverse();
    return last7Days.map(entry => ({
      day: new Date(entry.data_registro).toLocaleDateString('pt-BR', { weekday: 'short' }),
      completed: entry.concluidos_count,
      total: entry.total_exercicios
    }));
  }, [history]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-12 h-12 text-sky-500 animate-spin" />
        <p className="text-slate-500 font-bold animate-pulse">Carregando seu diário...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-sky-500/10 rounded-2xl flex items-center justify-center border border-sky-500/20">
                <Activity className="text-sky-500" size={24} />
             </div>
             <div>
                <h1 className="text-4xl font-black text-white tracking-tight">Diário de Dor</h1>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Acompanhamento Diário da sua Evolução</p>
             </div>
          </div>
        </div>

        <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 backdrop-blur-xl">
           <button 
             onClick={() => setActiveTab('journal')}
             className={cn(
               "px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
               activeTab === 'journal' ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" : "text-slate-500 hover:text-white"
             )}
           >
             Registro
           </button>
           <button 
             onClick={() => setActiveTab('progress')}
             className={cn(
               "px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
               activeTab === 'progress' ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" : "text-slate-500 hover:text-white"
             )}
           >
             Progresso
           </button>
        </div>
      </header>

      {activeTab === 'journal' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Pain Scale */}
            <section className="bg-slate-900/50 backdrop-blur-xl rounded-[3rem] border border-white/5 p-8 md:p-10 space-y-8 shadow-2xl">
              <div className="flex items-center justify-between">
                 <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    <Zap className="text-yellow-400" size={24} />
                    Qual seu nível de dor hoje?
                 </h2>
                 {painLevel !== null && (
                    <span className="text-sky-400 font-black text-sm uppercase tracking-widest px-4 py-1.5 bg-sky-500/10 rounded-full border border-sky-500/20">
                       Dor: {painLevel} {PAIN_LEVELS.find(l => l.value === painLevel)?.emoji}
                    </span>
                 )}
              </div>

              <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
                {PAIN_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setPainLevel(level.value)}
                    className={cn(
                      "group flex flex-col items-center gap-3 p-4 rounded-[1.5rem] transition-all border-2",
                      painLevel === level.value 
                        ? `${level.color} border-white/20 scale-105 shadow-xl` 
                        : "bg-white/5 border-transparent hover:bg-white/10"
                    )}
                  >
                    <span className="text-2xl transition-transform group-hover:scale-125">{level.emoji}</span>
                    <span className={cn(
                      "text-xs font-black",
                      painLevel === level.value ? "text-white" : "text-slate-500"
                    )}>
                      {level.value}
                    </span>
                  </button>
                ))}
              </div>

              {painLevel !== null && (
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-slate-400 font-bold bg-white/5 py-4 rounded-2xl border border-white/5"
                >
                  "Sua pontuação média de hoje: <span className="text-white font-black">{painLevel} - {PAIN_LEVELS.find(l => l.value === painLevel)?.label}</span>"
                </motion.p>
              )}
            </section>

            {/* Exercises Checklist */}
            <section className="bg-slate-900/50 backdrop-blur-xl rounded-[3rem] border border-white/5 p-8 md:p-10 space-y-8 shadow-2xl">
               <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-white flex items-center gap-3">
                     <ClipboardList className="text-sky-500" size={24} />
                     Checklist de Exercícios
                  </h2>
                  <div className="flex items-center gap-2">
                     <div className="h-2 w-32 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-emerald-500"
                          initial={{ width: 0 }}
                          animate={{ width: exercises.length > 0 ? `${(completedCount / exercises.length) * 100}%` : 0 }}
                        />
                     </div>
                     <span className="text-xs font-black text-slate-400 uppercase tracking-widest min-w-[50px]">
                        {completedCount}/{exercises.length} Concluídos
                     </span>
                  </div>
               </div>

               {exercises.length === 0 ? (
                 <div className="p-10 border-2 border-dashed border-white/5 rounded-[2rem] text-center space-y-4">
                    <AlertCircle className="text-slate-700 mx-auto" size={48} />
                    <p className="text-slate-500 font-medium">Nenhum exercício prescrito para hoje.</p>
                 </div>
               ) : (
                 <div className="grid gap-4">
                    {exercises.map((ex) => (
                      <button
                        key={ex.id}
                        onClick={() => toggleExercise(ex.id)}
                        className={cn(
                          "w-full flex items-center justify-between p-6 rounded-[1.5rem] border transition-all text-left group",
                          ex.completed 
                            ? "bg-emerald-500/10 border-emerald-500/30" 
                            : "bg-white/5 border-transparent hover:border-white/10"
                        )}
                      >
                        <div className="flex items-center gap-4">
                           <div className={cn(
                             "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                             ex.completed ? "bg-emerald-500 text-white" : "bg-white/10 text-slate-600 group-hover:bg-white/20"
                           )}>
                              <CheckCircle2 size={20} />
                           </div>
                           <span className={cn(
                             "font-black tracking-tight transition-all",
                             ex.completed ? "text-emerald-400" : "text-slate-300"
                           )}>
                             {ex.name}
                           </span>
                        </div>
                        {ex.completed && (
                          <motion.span 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
                          >
                            Concluído
                          </motion.span>
                        )}
                      </button>
                    ))}
                 </div>
               )}
            </section>

            {/* Notes */}
            <section className="bg-slate-900/50 backdrop-blur-xl rounded-[3rem] border border-white/5 p-8 md:p-10 space-y-6 shadow-2xl">
               <h2 className="text-2xl font-black text-white flex items-center gap-3">
                  <MessageSquare className="text-purple-400" size={24} />
                  Notas para o Fisioterapeuta
               </h2>
               <textarea
                 value={notes}
                 onChange={(e) => setNotes(e.target.value)}
                 placeholder="Descreva como você se sentiu hoje, dificuldades ou observações..."
                 className="w-full h-40 bg-white/5 border border-white/10 rounded-[2rem] p-6 text-white font-medium outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all lg:text-lg"
               />
               
               <button
                 onClick={handleSave}
                 disabled={saving}
                 className="w-full py-6 bg-sky-500 text-white rounded-[2rem] font-black text-xl hover:bg-sky-600 transition-all flex items-center justify-center gap-4 shadow-2xl shadow-sky-900/40 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
               >
                 {saving ? (
                   <>
                     <Loader2 className="animate-spin" size={24} />
                     SINCRONIZANDO...
                   </>
                 ) : (
                   <>
                     <Save size={24} />
                     SALVAR E SINCRONIZAR DIÁRIO
                   </>
                 )}
               </button>
            </section>
          </div>

          {/* History Sidebar */}
          <div className="space-y-8">
            <section className="bg-slate-950/50 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-8 space-y-6 flex flex-col h-full max-h-[800px]">
               <h2 className="text-xl font-black text-white flex items-center gap-3 sticky top-0 bg-transparent pb-4 border-b border-white/5">
                  <History className="text-sky-500" size={20} />
                  Seu Histórico (Compartilhado)
               </h2>
               
               <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                 {history.length === 0 ? (
                   <div className="text-center py-10 opacity-30 font-bold uppercase tracking-widest text-xs">
                      Nada registrado ainda
                   </div>
                 ) : (
                   history.map((entry) => (
                     <div 
                       key={entry.id}
                       className="p-5 bg-white/5 border border-white/5 rounded-2xl hover:border-white/10 transition-all group"
                     >
                        <div className="flex items-center justify-between mb-3">
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              {new Date(entry.data_registro).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                           </span>
                           <span className="text-lg">{PAIN_LEVELS.find(l => l.value === entry.nivel_dor)?.emoji || '❓'}</span>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                           <div className="flex items-center justify-between">
                              <p className="text-sm font-black text-white tracking-tight">Dor Nível {entry.nivel_dor}</p>
                              <div className="flex items-center gap-1.5">
                                 <CheckCircle2 size={12} className="text-emerald-500" />
                                 <span className="text-[11px] font-black text-slate-400">
                                    {entry.concluidos_count}/{entry.total_exercicios}
                                 </span>
                              </div>
                           </div>
                           
                           {entry.notas && (
                             <p className="text-[11px] text-slate-500 font-medium italic line-clamp-1">"{entry.notas}"</p>
                           )}

                           <div className="pt-2 mt-2 border-t border-white/5 flex items-center gap-2">
                              {entry.visualizado_por_fisio ? (
                                <div className="flex items-center gap-1.5 text-emerald-500">
                                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                   <span className="text-[10px] font-black uppercase tracking-tighter">
                                      Visualizado {physioName ? `por ${physioName}` : ''} em {new Date(entry.visualizado_em).toLocaleDateString()}
                                   </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-slate-500">
                                   <div className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
                                   <span className="text-[10px] font-black uppercase tracking-tighter">Aguardando visualização</span>
                                </div>
                              )}
                           </div>
                        </div>
                     </div>
                   )).slice(0, 15) // Limit sidebar entries
                 )}
               </div>
            </section>
          </div>
        </div>
      ) : (
        /* Progress Dashboard */
        <div className="space-y-8">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Pain Evolution Line Chart */}
              <section className="bg-slate-900/50 backdrop-blur-xl rounded-[3rem] border border-white/5 p-8 md:p-10 space-y-8 shadow-2xl">
                 <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                       <TrendingUp className="text-sky-500" size={24} />
                       Evolução da Dor (Últimos 30 dias)
                    </h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Tendência de alívio e picos de desconforto</p>
                 </div>
                 
                 <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis 
                            dataKey="data" 
                            stroke="rgba(255,255,255,0.3)" 
                            fontSize={10} 
                            fontWeight="bold"
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis 
                            stroke="rgba(255,255,255,0.3)" 
                            fontSize={10} 
                            fontWeight="bold"
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 10]}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#0f172a', 
                              border: '1px solid rgba(255,255,255,0.1)', 
                              borderRadius: '1rem',
                              fontWeight: '900'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="dor" 
                            stroke="#3b82f6" 
                            strokeWidth={4} 
                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6, stroke: '#1e293b' }}
                            activeDot={{ r: 8, strokeWidth: 0 }}
                            animationDuration={2000}
                          />
                       </LineChart>
                    </ResponsiveContainer>
                 </div>
              </section>

              {/* Adherence Bar Chart */}
              <section className="bg-slate-900/50 backdrop-blur-xl rounded-[3rem] border border-white/5 p-8 md:p-10 space-y-8 shadow-2xl">
                 <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                       <BarChart3 className="text-emerald-500" size={24} />
                       Adesão ao Tratamento (Na Semana)
                    </h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Concluídos vs Total de exercícios</p>
                 </div>

                 <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={weeklyAdherence}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis 
                            dataKey="day" 
                            stroke="rgba(255,255,255,0.3)" 
                            fontSize={10} 
                            fontWeight="bold"
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis 
                            stroke="rgba(255,255,255,0.3)" 
                            fontSize={10} 
                            fontWeight="bold"
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip 
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            contentStyle={{ 
                              backgroundColor: '#0f172a', 
                              border: '1px solid rgba(255,255,255,0.1)', 
                              borderRadius: '1rem',
                              fontWeight: '900'
                            }}
                          />
                          <Bar 
                            dataKey="completed" 
                            radius={[8, 8, 0, 0]} 
                            animationDuration={1500}
                          >
                            {weeklyAdherence.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill="#10b981" />
                            ))}
                          </Bar>
                          <Bar 
                            dataKey="total" 
                            radius={[8, 8, 0, 0]} 
                            opacity={0.1}
                          >
                             {weeklyAdherence.map((entry, index) => (
                              <Cell key={`cell-total-${index}`} fill="#ffffff" />
                            ))}
                          </Bar>
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </section>
           </div>

           {/* Summary Cards */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5 space-y-4">
                 <div className="w-10 h-10 bg-sky-500/10 text-sky-500 rounded-xl flex items-center justify-center">
                    <Calendar size={20} />
                 </div>
                 <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Total de Registros</p>
                 <p className="text-4xl font-black text-white">{history.length}</p>
              </div>
              <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5 space-y-4">
                 <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
                    <CheckCircle2 size={20} />
                 </div>
                 <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Méda de Adesão</p>
                 <p className="text-4xl font-black text-white">
                   {history.length > 0 ? (history.reduce((acc, h) => acc + (h.concluidos_count / (h.total_exercicios || 1)), 0) / history.length * 100).toFixed(0) : 0}%
                 </p>
              </div>
              <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5 space-y-4">
                 <div className="w-10 h-10 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center">
                    <TrendingUp size={20} />
                 </div>
                 <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Alerta de Recaída</p>
                 <p className="text-lg font-black text-white">Estável</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
