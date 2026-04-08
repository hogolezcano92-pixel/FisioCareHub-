import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateTriageReport } from '../lib/groq';
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
  AlertCircle,
  User,
  ClipboardList,
  AlertTriangle,
  Scale,
  FileText
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatDate, cn } from '../lib/utils';
import { toast } from 'sonner';

const STEPS = [
  { id: 'basic', title: 'Dados Básicos', icon: User },
  { id: 'complaint', title: 'Queixa', icon: ClipboardList },
  { id: 'history', title: 'Histórico', icon: History },
  { id: 'redflags', title: 'Alertas', icon: AlertTriangle },
  { id: 'functional', title: 'Funcional', icon: Activity },
  { id: 'pain', title: 'Dor', icon: Thermometer },
];

export default function Triage() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [displayedAnalysis, setDisplayedAnalysis] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    idade: '',
    sexo: '',
    peso: '',
    altura: '',
    profissao: '',
    atividade_fisica: '',
    regiao_dor: '',
    inicio_sintomas: '',
    tempo_sintomas: '',
    historico_clinico: {
      fisioterapia_anterior: false,
      diagnostico_medico: false,
      exames_imagem: [] as string[],
    },
    doencas_preexistentes: [] as string[],
    red_flags: {
      febre: false,
      perda_peso: false,
      fraqueza: false,
      sensibilidade: false,
      controle_urinario: false,
      dor_noturna: false,
    },
    avaliacao_funcional: {
      movimentos_normais: true,
      piora_movimento: false,
      melhora_repouso: true,
      limitacao_atividades: 'leve' as 'leve' | 'moderada' | 'grave',
    },
    escala_dor: 5,
  });

  useEffect(() => {
    if (analysis?.relatorio) {
      let i = 0;
      setDisplayedAnalysis('');
      const interval = setInterval(() => {
        setDisplayedAnalysis(analysis.relatorio.slice(0, i));
        i += 10;
        if (i > analysis.relatorio.length) {
          setDisplayedAnalysis(analysis.relatorio);
          clearInterval(interval);
        }
      }, 10);
      return () => clearInterval(interval);
    }
  }, [analysis]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login', { state: { from: '/triage' } });
        return;
      }
      fetchHistory(user.id);
    }
  }, [user, authLoading, navigate]);

  const fetchHistory = async (userId: string) => {
    try {
      const { data: triages } = await supabase
        .from('triagens')
        .select('*')
        .eq('paciente_id', userId)
        .order('created_at', { ascending: false });
      
      if (triages) {
        setHistory(triages);
      }
    } catch (err) {
      console.error("Erro ao buscar histórico de triagens:", err);
    }
  };

  const handleTriage = async () => {
    if (loading || !user) return;

    setLoading(true);
    try {
      // 1. Generate AI Analysis
      const aiResult = await generateTriageReport(formData);
      setAnalysis(aiResult);

      // 2. Save to Database
      const { error } = await supabase
        .from('triagens')
        .insert({
          paciente_id: user.id,
          idade: parseInt(formData.idade),
          sexo: formData.sexo,
          peso: parseFloat(formData.peso),
          altura: parseFloat(formData.altura),
          profissao: formData.profissao,
          atividade_fisica: formData.atividade_fisica,
          regiao_dor: formData.regiao_dor,
          inicio_sintomas: formData.inicio_sintomas,
          tempo_sintomas: formData.tempo_sintomas,
          historico_clinico: formData.historico_clinico,
          doencas_preexistentes: formData.doencas_preexistentes,
          escala_dor: formData.escala_dor,
          limitacao_funcional: formData.avaliacao_funcional.limitacao_atividades,
          red_flag: aiResult.red_flag_detected,
          classificacao: aiResult.classificacao,
          gravidade: aiResult.gravidade,
          relatorio: aiResult.relatorio,
          status: 'concluido',
          data_triagem: new Date().toISOString()
        });

      if (error) throw error;

      toast.success("Triagem realizada com sucesso!");
      setCurrentStep(STEPS.length);
      fetchHistory(user.id);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao processar triagem. Tente novamente.");
    } finally {
      setLoading(false);
    }
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
      case 0: return formData.idade && formData.sexo && formData.peso && formData.altura && formData.profissao && formData.atividade_fisica;
      case 1: return formData.regiao_dor && formData.inicio_sintomas && formData.tempo_sintomas;
      default: return true;
    }
  };

  const hasRedFlags = Object.values(formData.red_flags).some(v => v);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <header className="text-center space-y-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-indigo-200"
        >
          <BrainCircuit size={40} />
        </motion.div>
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Triagem Inteligente</h1>
          <p className="text-slate-500 font-medium">Avaliação clínica completa guiada por Inteligência Artificial.</p>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="flex items-center justify-between px-4 max-w-2xl mx-auto overflow-x-auto pb-4 scrollbar-hide">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center flex-shrink-0">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
              currentStep >= i ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-slate-100 text-slate-400"
            )}>
              <step.icon size={18} />
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                "w-8 sm:w-12 h-1 mx-2 rounded-full transition-all duration-500",
                currentStep > i ? "bg-indigo-600" : "bg-slate-100"
              )} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white p-6 md:p-12 rounded-[3.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
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
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full"
                />
                <div className="w-24 h-24 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center shadow-2xl relative z-10 animate-pulse">
                  <BrainCircuit size={48} />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-slate-900">Analisando Dados Clínicos...</h3>
                <p className="text-slate-500 font-medium animate-pulse">Nossa IA está gerando seu relatório de triagem.</p>
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
              {/* Step 0: Basic Data */}
              {currentStep === 0 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-black text-slate-900">Dados Básicos</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-2">Idade</label>
                      <input 
                        type="number" 
                        value={formData.idade}
                        onChange={(e) => setFormData({...formData, idade: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                        placeholder="Ex: 30"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-2">Sexo</label>
                      <select 
                        value={formData.sexo}
                        onChange={(e) => setFormData({...formData, sexo: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                      >
                        <option value="">Selecione</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-2">Peso (kg)</label>
                      <input 
                        type="number" 
                        value={formData.peso}
                        onChange={(e) => setFormData({...formData, peso: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                        placeholder="Ex: 75"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-2">Altura (m)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={formData.altura}
                        onChange={(e) => setFormData({...formData, altura: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                        placeholder="Ex: 1.75"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-sm font-bold text-slate-700 ml-2">Profissão</label>
                      <input 
                        type="text" 
                        value={formData.profissao}
                        onChange={(e) => setFormData({...formData, profissao: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                        placeholder="Ex: Engenheiro, Professor..."
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-sm font-bold text-slate-700 ml-2">Nível de Atividade Física</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Sedentário', 'Atividade Leve', 'Atividade Moderada', 'Atividade Intensa'].map(level => (
                          <button
                            key={level}
                            onClick={() => setFormData({...formData, atividade_fisica: level})}
                            className={cn(
                              "p-3 rounded-xl border-2 text-xs font-bold transition-all",
                              formData.atividade_fisica === level ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-slate-100 bg-slate-50 text-slate-500"
                            )}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Main Complaint */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-black text-slate-900">Queixa Principal</h2>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-2">Região do Corpo</label>
                      <select 
                        value={formData.regiao_dor}
                        onChange={(e) => setFormData({...formData, regiao_dor: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                      >
                        <option value="">Selecione a região</option>
                        {['Cervical', 'Ombro', 'Cotovelo', 'Punho/Mão', 'Coluna Lombar', 'Quadril', 'Joelho', 'Tornozelo/Pé', 'Outro'].map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-2">Como começou?</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          { id: 'queda', label: 'Após queda ou acidente' },
                          { id: 'fisica', label: 'Durante atividade física' },
                          { id: 'repetitivo', label: 'Movimento repetitivo' },
                          { id: 'aparente', label: 'Sem causa aparente' }
                        ].map(type => (
                          <button
                            key={type.id}
                            onClick={() => setFormData({...formData, inicio_sintomas: type.label})}
                            className={cn(
                              "p-4 rounded-xl border-2 text-sm font-bold transition-all text-left",
                              formData.inicio_sintomas === type.label ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-slate-100 bg-slate-50 text-slate-500"
                            )}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-2">Há quanto tempo sente isso?</label>
                      <input 
                        type="text" 
                        value={formData.tempo_sintomas}
                        onChange={(e) => setFormData({...formData, tempo_sintomas: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                        placeholder="Ex: 2 semanas, 3 meses..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Clinical History */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-black text-slate-900">Histórico Clínico</h2>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <span className="font-bold text-slate-700">Já realizou fisioterapia antes?</span>
                      <button 
                        onClick={() => setFormData({...formData, historico_clinico: {...formData.historico_clinico, fisioterapia_anterior: !formData.historico_clinico.fisioterapia_anterior}})}
                        className={cn("w-12 h-6 rounded-full transition-all relative", formData.historico_clinico.fisioterapia_anterior ? "bg-indigo-600" : "bg-slate-300")}
                      >
                        <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", formData.historico_clinico.fisioterapia_anterior ? "left-7" : "left-1")} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <span className="font-bold text-slate-700">Possui diagnóstico médico?</span>
                      <button 
                        onClick={() => setFormData({...formData, historico_clinico: {...formData.historico_clinico, diagnostico_medico: !formData.historico_clinico.diagnostico_medico}})}
                        className={cn("w-12 h-6 rounded-full transition-all relative", formData.historico_clinico.diagnostico_medico ? "bg-indigo-600" : "bg-slate-300")}
                      >
                        <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", formData.historico_clinico.diagnostico_medico ? "left-7" : "left-1")} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700 ml-2">Realizou exames de imagem?</label>
                      <div className="flex flex-wrap gap-2">
                        {['Raio X', 'Ressonância', 'Tomografia', 'Ultrassom'].map(exam => (
                          <button
                            key={exam}
                            onClick={() => {
                              const exams = formData.historico_clinico.exames_imagem;
                              const newExams = exams.includes(exam) ? exams.filter(e => e !== exam) : [...exams, exam];
                              setFormData({...formData, historico_clinico: {...formData.historico_clinico, exames_imagem: newExams}});
                            }}
                            className={cn(
                              "px-4 py-2 rounded-full border-2 text-xs font-bold transition-all",
                              formData.historico_clinico.exames_imagem.includes(exam) ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-slate-100 bg-slate-50 text-slate-500"
                            )}
                          >
                            {exam}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700 ml-2">Doenças pré-existentes</label>
                      <div className="flex flex-wrap gap-2">
                        {['Diabetes', 'Hipertensão', 'Doença Cardíaca', 'Cirurgias Prévias'].map(disease => (
                          <button
                            key={disease}
                            onClick={() => {
                              const diseases = formData.doencas_preexistentes;
                              const newDiseases = diseases.includes(disease) ? diseases.filter(d => d !== disease) : [...diseases, disease];
                              setFormData({...formData, doencas_preexistentes: newDiseases});
                            }}
                            className={cn(
                              "px-4 py-2 rounded-full border-2 text-xs font-bold transition-all",
                              formData.doencas_preexistentes.includes(disease) ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-slate-100 bg-slate-50 text-slate-500"
                            )}
                          >
                            {disease}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Red Flags */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="text-amber-500" size={32} />
                    <h2 className="text-2xl font-black text-slate-900">Sinais de Alerta</h2>
                  </div>
                  <p className="text-slate-500 font-medium">Marque se você apresenta algum destes sintomas associados à dor:</p>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { id: 'febre', label: 'Febre associada à dor' },
                      { id: 'perda_peso', label: 'Perda de peso inexplicada' },
                      { id: 'fraqueza', label: 'Fraqueza progressiva nos membros' },
                      { id: 'sensibilidade', label: 'Perda de sensibilidade' },
                      { id: 'controle_urinario', label: 'Perda de controle urinário ou intestinal' },
                      { id: 'dor_noturna', label: 'Dor muito intensa à noite' }
                    ].map(flag => (
                      <button
                        key={flag.id}
                        onClick={() => setFormData({...formData, red_flags: {...formData.red_flags, [flag.id]: !formData.red_flags[flag.id as keyof typeof formData.red_flags]}})}
                        className={cn(
                          "p-4 rounded-2xl border-2 text-sm font-bold transition-all text-left flex items-center justify-between",
                          formData.red_flags[flag.id as keyof typeof formData.red_flags] ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-100 bg-slate-50 text-slate-500"
                        )}
                      >
                        {flag.label}
                        {formData.red_flags[flag.id as keyof typeof formData.red_flags] && <AlertCircle size={20} />}
                      </button>
                    ))}
                  </div>
                  {hasRedFlags && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-amber-100 border border-amber-200 rounded-2xl text-amber-900 text-sm font-bold flex items-start gap-3"
                    >
                      <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
                      <p>Alguns sinais indicam que uma avaliação médica pode ser necessária antes da fisioterapia.</p>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Step 4: Functional Assessment */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-black text-slate-900">Avaliação Funcional</h2>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <span className="font-bold text-slate-700">Consegue realizar movimentos normalmente?</span>
                      <button 
                        onClick={() => setFormData({...formData, avaliacao_funcional: {...formData.avaliacao_funcional, movimentos_normais: !formData.avaliacao_funcional.movimentos_normais}})}
                        className={cn("w-12 h-6 rounded-full transition-all relative", formData.avaliacao_funcional.movimentos_normais ? "bg-indigo-600" : "bg-slate-300")}
                      >
                        <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", formData.avaliacao_funcional.movimentos_normais ? "left-7" : "left-1")} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <span className="font-bold text-slate-700">A dor piora com o movimento?</span>
                      <button 
                        onClick={() => setFormData({...formData, avaliacao_funcional: {...formData.avaliacao_funcional, piora_movimento: !formData.avaliacao_funcional.piora_movimento}})}
                        className={cn("w-12 h-6 rounded-full transition-all relative", formData.avaliacao_funcional.piora_movimento ? "bg-indigo-600" : "bg-slate-300")}
                      >
                        <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", formData.avaliacao_funcional.piora_movimento ? "left-7" : "left-1")} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700 ml-2">Nível de limitação para atividades diárias</label>
                      <div className="grid grid-cols-3 gap-3">
                        {['leve', 'moderada', 'grave'].map(level => (
                          <button
                            key={level}
                            onClick={() => setFormData({...formData, avaliacao_funcional: {...formData.avaliacao_funcional, limitacao_atividades: level as any}})}
                            className={cn(
                              "p-4 rounded-xl border-2 text-xs font-black uppercase tracking-widest transition-all",
                              formData.avaliacao_funcional.limitacao_atividades === level ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-slate-100 bg-slate-50 text-slate-500"
                            )}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Pain Scale */}
              {currentStep === 5 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-900">Escala de Dor</h2>
                    <p className="text-slate-500">De 0 (sem dor) a 10 (pior dor imaginável).</p>
                  </div>
                  <div className="relative py-10">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={formData.escala_dor}
                      onChange={(e) => setFormData({...formData, escala_dor: parseInt(e.target.value)})}
                      className="w-full h-4 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between mt-6">
                      {[0, 2, 4, 6, 8, 10].map(val => (
                        <span key={val} className={cn(
                          "text-sm font-black transition-all",
                          formData.escala_dor === val ? "text-indigo-600 scale-125" : "text-slate-300"
                        )}>{val}</span>
                      ))}
                    </div>
                    <div className="mt-8 p-8 bg-indigo-50 rounded-[2.5rem] text-center">
                      <span className="text-6xl font-black text-indigo-600">{formData.escala_dor}</span>
                      <p className="text-indigo-400 font-bold uppercase tracking-[0.3em] text-xs mt-2">
                        {formData.escala_dor === 0 ? 'Sem Dor' : formData.escala_dor <= 3 ? 'Leve' : formData.escala_dor <= 7 ? 'Moderada' : 'Intensa'}
                      </p>
                    </div>
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
              <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[3rem] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="relative z-10 flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                    <BrainCircuit size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">Relatório de Triagem</h3>
                    <div className="flex gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {analysis?.classificacao}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                        analysis?.gravidade === 'grave' ? "bg-rose-500" : analysis?.gravidade === 'moderado' ? "bg-amber-500" : "bg-emerald-500"
                      )}>
                        Gravidade {analysis?.gravidade}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="prose prose-invert max-w-none bg-white/5 p-6 rounded-2xl backdrop-blur-sm border border-white/10">
                  <ReactMarkdown>{displayedAnalysis || ''}</ReactMarkdown>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 bg-amber-50 rounded-3xl border border-amber-100 text-amber-800">
                <AlertCircle className="flex-shrink-0 mt-1" size={20} />
                <div className="space-y-1">
                  <p className="text-sm font-bold">Aviso Legal</p>
                  <p className="text-xs font-medium leading-relaxed">
                    Esta triagem é apenas informativa e não substitui avaliação presencial com profissional de saúde. Em caso de dor súbita e intensa, procure uma emergência.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep(0)}
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

      {/* History Section */}
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
                            {formatDate(item.created_at)}
                          </div>
                          <div className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            item.gravidade === 'grave' ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                          )}>
                            {item.classificacao}
                          </div>
                        </div>
                      </div>
                      <p className="text-slate-700 font-bold mb-2">{item.regiao_dor} - {item.tempo_sintomas}</p>
                      <div className="text-slate-500 text-sm line-clamp-2 prose prose-sm max-w-none">
                        <ReactMarkdown>{item.relatorio}</ReactMarkdown>
                      </div>
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
