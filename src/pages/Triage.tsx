import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { analyzeSymptoms } from '../lib/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrainCircuit, 
  Send, 
  Loader2, 
  History, 
  ChevronDown, 
  ChevronUp, 
  ChevronRight, 
  ChevronLeft,
  Activity,
  MapPin,
  Clock,
  Thermometer,
  Stethoscope,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatDate, cn } from '../lib/utils';

const STEPS = [
  { id: 'location', title: 'Localização', icon: MapPin },
  { id: 'duration', title: 'Duração', icon: Clock },
  { id: 'intensity', title: 'Intensidade', icon: Thermometer },
  { id: 'type', title: 'Atendimento', icon: Stethoscope },
];

export default function Triage() {
  const { user, loading: authLoading } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [painLocation, setPainLocation] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [painDuration, setPainDuration] = useState('');
  const [painIntensity, setPainIntensity] = useState(5);
  const [serviceType, setServiceType] = useState<'domicilio' | 'online'>('online');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [displayedAnalysis, setDisplayedAnalysis] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (analysis) {
      let i = 0;
      setDisplayedAnalysis('');
      const interval = setInterval(() => {
        setDisplayedAnalysis(analysis.slice(0, i));
        i += 5; // Type 5 characters at a time for speed
        if (i > analysis.length) {
          setDisplayedAnalysis(analysis);
          clearInterval(interval);
        }
      }, 10);
      return () => clearInterval(interval);
    }
  }, [analysis]);
  const [showHistory, setShowHistory] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { from: '/triage' } });
      return;
    }

    const fetchUser = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from('perfis')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserData(profile);
          if (profile.tipo_usuario === 'fisioterapeuta') {
            navigate('/dashboard');
          }
        }

        const fetchHistory = async () => {
          const { data: triages } = await supabase
            .from('triagem')
            .select('*')
            .eq('paciente_id', user.id)
            .order('data_triagem', { ascending: false });
          
          if (triages) {
            setHistory(triages);
          }
        };
        fetchHistory();
      }
    };

    if (!authLoading) {
      fetchUser();
    }
  }, [user, authLoading, navigate]);

  const handleTriage = async () => {
    if (loading || !user) return;

    const finalLocation = painLocation === 'Outro' ? customLocation : painLocation;
    if (!finalLocation || !painDuration) {
      const { toast } = await import('sonner');
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);
    setAnalysis(null);

    try {
      const symptomsStr = `Local: ${finalLocation}, Tempo: ${painDuration}, Intensidade: ${painIntensity}, Tipo: ${serviceType}`;
      const result = await analyzeSymptoms(symptomsStr);
      setAnalysis(result);

      const { error } = await supabase
        .from('triagem')
        .insert({
          paciente_id: user.id,
          sintomas: symptomsStr,
          gravidade: painIntensity.toString(),
          status: 'concluido',
          data_triagem: new Date().toISOString(),
          aiAnalysis: result,
        });

      if (error) throw error;

      const newEntry = { 
        sintomas: symptomsStr, 
        gravidade: painIntensity.toString(), 
        data_triagem: new Date().toISOString(),
        aiAnalysis: result
      };
      setHistory([newEntry, ...history]);
      
      const { toast } = await import('sonner');
      toast.success("Triagem realizada com sucesso!");
      setCurrentStep(STEPS.length); // Move to results step
    } catch (err: any) {
      console.error(err);
      const { toast } = await import('sonner');
      toast.error(err.message || "Erro ao processar triagem. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const resetTriage = () => {
    setCurrentStep(0);
    setAnalysis(null);
    setDisplayedAnalysis('');
    setPainLocation('');
    setCustomLocation('');
    setPainDuration('');
    setPainIntensity(5);
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleTriage();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0: return painLocation === 'Outro' ? customLocation.length > 2 : painLocation.length > 2;
      case 1: return painDuration.length > 2;
      default: return true;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <header className="text-center space-y-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-indigo-200"
        >
          <BrainCircuit size={40} />
        </motion.div>
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Triagem Inteligente</h1>
          <p className="text-slate-500 font-medium">Nossa IA analisará seus sintomas para orientar seu tratamento.</p>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="flex items-center justify-between px-4 max-w-md mx-auto">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
              currentStep >= i ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-slate-100 text-slate-400"
            )}>
              <step.icon size={18} />
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                "w-12 h-1 mx-2 rounded-full transition-all duration-500",
                currentStep > i ? "bg-indigo-600" : "bg-slate-100"
              )} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 space-y-8"
            >
              <div className="relative">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full"
                />
                <div className="w-24 h-24 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center shadow-2xl relative z-10 animate-pulse">
                  <BrainCircuit size={48} />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-slate-900">Processando sua Triagem...</h3>
                <p className="text-slate-500 font-medium animate-pulse">Nossa IA está analisando seus sintomas com cuidado.</p>
              </div>
            </motion.div>
          ) : currentStep < STEPS.length ? (
            <motion.div
              key={currentStep}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-8"
            >
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-900">Onde você sente dor?</h2>
                    <p className="text-slate-500">Seja específico para uma melhor análise.</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {['Lombar', 'Pescoço', 'Joelho', 'Ombro', 'Tornozelo', 'Outro'].map((loc) => (
                      <button
                        key={loc}
                        onClick={() => setPainLocation(loc)}
                        className={cn(
                          "p-4 rounded-3xl border-2 font-bold transition-all text-sm",
                          painLocation === loc ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-slate-50 bg-slate-50 text-slate-500 hover:border-slate-200"
                        )}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                  {painLocation === 'Outro' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <input
                        type="text"
                        placeholder="Especifique o local (ex: Punho, Quadril...)"
                        value={customLocation}
                        className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-medium"
                        onChange={(e) => setCustomLocation(e.target.value)}
                        autoFocus
                      />
                    </motion.div>
                  )}
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-900">Há quanto tempo sente isso?</h2>
                    <p className="text-slate-500">Isso ajuda a identificar se a dor é aguda ou crônica.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {['Hoje', 'Alguns dias', '1 a 2 semanas', 'Mais de um mês'].map((dur) => (
                      <button
                        key={dur}
                        onClick={() => setPainDuration(dur)}
                        className={cn(
                          "p-5 rounded-3xl border-2 font-bold transition-all text-left flex items-center justify-between",
                          painDuration === dur ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-slate-50 bg-slate-50 text-slate-500 hover:border-slate-200"
                        )}
                      >
                        {dur}
                        {painDuration === dur && <CheckCircle2 size={20} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-900">Qual a intensidade da dor?</h2>
                    <p className="text-slate-500">De 0 (sem dor) a 10 (insuportável).</p>
                  </div>
                  <div className="relative py-10">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={painIntensity}
                      onChange={(e) => setPainIntensity(parseInt(e.target.value))}
                      className="w-full h-4 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between mt-6">
                      {[0, 2, 4, 6, 8, 10].map(val => (
                        <span key={val} className={cn(
                          "text-sm font-black transition-all",
                          painIntensity === val ? "text-indigo-600 scale-125" : "text-slate-300"
                        )}>{val}</span>
                      ))}
                    </div>
                    <div className="mt-8 p-6 bg-indigo-50 rounded-3xl text-center">
                      <span className="text-4xl font-black text-indigo-600">{painIntensity}</span>
                      <p className="text-indigo-400 font-bold uppercase tracking-widest text-[10px] mt-1">
                        {painIntensity <= 3 ? 'Leve' : painIntensity <= 7 ? 'Moderada' : 'Intensa'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-900">Como prefere ser atendido?</h2>
                    <p className="text-slate-500">Escolha a modalidade que melhor se adapta a você.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <button
                      onClick={() => setServiceType('domicilio')}
                      className={cn(
                        "p-8 rounded-[2.5rem] border-2 transition-all text-left space-y-4",
                        serviceType === 'domicilio' ? "border-indigo-600 bg-indigo-50" : "border-slate-50 bg-slate-50"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                        serviceType === 'domicilio' ? "bg-indigo-600 text-white" : "bg-white text-slate-400"
                      )}>
                        <MapPin size={24} />
                      </div>
                      <div>
                        <p className={cn("font-black text-lg", serviceType === 'domicilio' ? "text-indigo-900" : "text-slate-900")}>Domicílio</p>
                        <p className="text-sm text-slate-500 font-medium">O fisioterapeuta vai até você.</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setServiceType('online')}
                      className={cn(
                        "p-8 rounded-[2.5rem] border-2 transition-all text-left space-y-4",
                        serviceType === 'online' ? "border-indigo-600 bg-indigo-50" : "border-slate-50 bg-slate-50"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                        serviceType === 'online' ? "bg-indigo-600 text-white" : "bg-white text-slate-400"
                      )}>
                        <Activity size={24} />
                      </div>
                      <div>
                        <p className={cn("font-black text-lg", serviceType === 'online' ? "text-indigo-900" : "text-slate-900")}>Online</p>
                        <p className="text-sm text-slate-500 font-medium">Consulta via vídeo chamada.</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-6">
                {currentStep > 0 && (
                  <button
                    onClick={prevStep}
                    className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-3xl font-black hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    <ChevronLeft size={20} /> Voltar
                  </button>
                )}
                <button
                  onClick={nextStep}
                  disabled={!isStepValid() || loading}
                  className="flex-[2] py-5 bg-indigo-600 text-white rounded-3xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <>
                      {currentStep === STEPS.length - 1 ? 'Finalizar Triagem' : 'Próximo'}
                      <ChevronRight size={20} />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-[2.5rem] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="relative z-10 flex items-center gap-4 mb-6">
                  <div className={cn(
                    "w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center",
                    analysis && displayedAnalysis.length < analysis.length && "animate-pulse"
                  )}>
                    <BrainCircuit size={24} />
                  </div>
                  <h3 className="text-2xl font-black tracking-tight">Análise da IA Concluída</h3>
                </div>
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown>{displayedAnalysis || ''}</ReactMarkdown>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 bg-amber-50 rounded-3xl border border-amber-100 text-amber-800">
                <AlertCircle className="flex-shrink-0 mt-1" size={20} />
                <p className="text-sm font-medium leading-relaxed">
                  <strong>Aviso Importante:</strong> Esta análise é gerada por inteligência artificial e serve apenas como orientação preliminar. Não substitui o diagnóstico de um profissional de saúde.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={resetTriage}
                  className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-3xl font-black hover:bg-slate-200 transition-all"
                >
                  Nova Triagem
                </button>
                <button
                  onClick={() => navigate('/appointments')}
                  className="flex-[2] py-5 bg-indigo-600 text-white rounded-3xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                >
                  Agendar Consulta
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* History Section - Recipe 1: Data Grid feel */}
      <section className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full p-8 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
              <History size={24} />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-black text-slate-900">Histórico de Triagens</h2>
              <p className="text-sm text-slate-500 font-medium">Acompanhe suas avaliações anteriores.</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
            {showHistory ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </button>
        
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-slate-50"
            >
              {history.length === 0 ? (
                <div className="p-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                    <History size={32} />
                  </div>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhuma triagem encontrada</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {history.map((item, i) => (
                    <div key={i} className="p-8 hover:bg-slate-50 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                            {formatDate(item.data_triagem)}
                          </div>
                          <div className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            parseInt(item.gravidade) > 7 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                          )}>
                            Intensidade {item.gravidade}/10
                          </div>
                        </div>
                      </div>
                      <p className="text-slate-700 font-medium leading-relaxed">{item.sintomas}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
