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
  FileText,
  Download
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
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
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
    // Dynamic questions based on region
    perguntas_especificas: {} as Record<string, any>,
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
      historico_cancer: false,
    },
    avaliacao_funcional: {
      movimentos_normais: true,
      piora_movimento: false,
      melhora_repouso: true,
      limitacao_atividades: 'leve' as 'leve' | 'moderada' | 'grave',
    },
    escala_dor: 5,
  });

  const REGION_QUESTIONS: Record<string, any[]> = {
    'Quadril': [
      { id: 'local_dor', label: 'A dor é mais lateral (lado) ou anterior (frente)?', type: 'select', options: ['Lateral', 'Anterior', 'Posterior (Glúteo)'] },
      { id: 'piora_caminhar', label: 'A dor piora ao caminhar?', type: 'boolean' },
      { id: 'piora_deitar', label: 'Piora ao deitar sobre o lado afetado?', type: 'boolean' },
      { id: 'aumento_atividade', label: 'Houve aumento recente da atividade física?', type: 'boolean' }
    ],
    'Coluna Lombar': [
      { id: 'irradiacao', label: 'A dor irradia para a perna?', type: 'boolean' },
      { id: 'dormencia', label: 'Sente dormência ou formigamento?', type: 'boolean' },
      { id: 'piora_sentado', label: 'A dor piora ao ficar muito tempo sentado?', type: 'boolean' }
    ],
    'Cervical': [
      { id: 'irradiacao_braco', label: 'A dor irradia para o braço ou mão?', type: 'boolean' },
      { id: 'tontura', label: 'Sente tontura ou dor de cabeça associada?', type: 'boolean' },
      { id: 'rigidez_matinal', label: 'Sente muita rigidez ao acordar?', type: 'boolean' }
    ],
    'Joelho': [
      { id: 'falseio', label: 'Sente sensação de "falseio" ou instabilidade?', type: 'boolean' },
      { id: 'bloqueio', label: 'O joelho trava ou estala com dor?', type: 'boolean' },
      { id: 'piora_escada', label: 'Piora ao subir ou descer escadas?', type: 'boolean' }
    ],
    'Ombro': [
      { id: 'piora_elevar', label: 'Dói ao elevar o braço acima da cabeça?', type: 'boolean' },
      { id: 'fraqueza_braco', label: 'Sente fraqueza para segurar objetos?', type: 'boolean' },
      { id: 'piora_noite', label: 'A dor impede o sono ou piora à noite?', type: 'boolean' }
    ]
  };

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
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const { data: triages, error: supabaseError } = await supabase
        .from('triagens')
        .select('*')
        .eq('paciente_id', userId)
        .order('created_at', { ascending: false });
      
      if (supabaseError) throw supabaseError;
      setHistory(triages || []);
    } catch (err: any) {
      console.error("Erro ao buscar histórico de triagens:", err);
      setHistory([]);
      setHistoryError(err.message || 'Erro de conexão');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleTriage = async () => {
    if (loading || !user) return;

    // Validation
    if (!formData.regiao_dor || !formData.tempo_sintomas || formData.escala_dor === undefined) {
      toast.error("Por favor, preencha todos os campos obrigatórios (Queixa, Tempo e Escala de Dor).");
      return;
    }

    setLoading(true);
    try {
      // 1. Generate AI Analysis
      const aiResult = await generateTriageReport(formData);
      setAnalysis(aiResult);

      // 2. Prepare data for saving
      const triageData = {
        paciente_id: user.id,
        idade: formData.idade ? (parseInt(formData.idade) || null) : null,
        sexo: formData.sexo || null,
        peso: formData.peso ? (parseFloat(formData.peso) || null) : null,
        altura: formData.altura ? (parseFloat(formData.altura) || null) : null,
        profissao: formData.profissao || null,
        atividade_fisica: formData.atividade_fisica || null,
        regiao_dor: formData.regiao_dor || null,
        inicio_sintomas: formData.inicio_sintomas || null,
        tempo_sintomas: formData.tempo_sintomas || null,
        historico_clinico: formData.historico_clinico,
        doencas_preexistentes: formData.doencas_preexistentes,
        escala_dor: formData.escala_dor,
        limitacao_funcional: formData.avaliacao_funcional?.limitacao_atividades || 'Não informada',
        red_flag: !!aiResult.red_flag_detected,
        classificacao: aiResult.classificacao || 'Não classificado',
        gravidade: aiResult.gravidade || 'Não definida',
        relatorio: aiResult.relatorio,
        ai_analysis: aiResult,
        status: 'concluido',
        data_triagem: new Date().toISOString()
      };

      // 3. Save to Database
      const { error: saveError } = await supabase
        .from('triagens')
        .insert(triageData);

      if (saveError) {
        console.error("Erro ao salvar triagem no Supabase:", saveError);
        throw new Error("Erro ao salvar triagem no banco de dados. Tente novamente.");
      }

      toast.success("Triagem realizada e salva com sucesso!");
      setCurrentStep(STEPS.length);
      fetchHistory(user.id);
    } catch (err: any) {
      console.error("Erro detalhado na triagem:", err);
      toast.error(err.message || "Erro ao processar triagem. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!analysis?.relatorio) return;
    const element = document.createElement("a");
    const file = new Blob([analysis.relatorio], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `triagem_${formatDate(new Date().toISOString())}.txt`;
    document.body.appendChild(element);
    element.click();
    toast.success("Relatório baixado!");
  };

  const shareWithPhysio = () => {
    toast.success("Relatório compartilhado com seu fisioterapeuta!");
    // In a real app, this could trigger a notification or message
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
    <div className="w-full max-w-[700px] mx-auto space-y-6 pb-20 px-4">
      <header className="text-center space-y-3 pt-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-primary text-white rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-primary/20"
        >
          <BrainCircuit size={32} />
        </motion.div>
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-text-main tracking-tight">Triagem <span className="text-primary italic">Inteligente</span></h1>
          <p className="text-sm text-text-muted font-medium">Avaliação clínica completa guiada por IA.</p>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="flex items-center justify-between px-2 overflow-x-auto pb-2 scrollbar-hide">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center flex-shrink-0">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500",
              currentStep >= i ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-bg-general text-text-muted"
            )}>
              <step.icon size={14} />
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                "w-4 h-0.5 mx-1 rounded-full transition-all duration-500",
                currentStep > i ? "bg-primary" : "bg-bg-general"
              )} />
            )}
          </div>
        ))}
      </div>

      <div className="glass-card p-5 sm:p-8 rounded-[3rem] relative overflow-hidden">
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
                  <h2 className="text-2xl font-black text-text-main">Dados Básicos</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-text-main ml-2">Idade</label>
                      <input 
                        type="number" 
                        value={formData.idade}
                        onChange={(e) => setFormData({...formData, idade: e.target.value})}
                        className="w-full p-4 bg-bg-general border border-border-soft rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                        placeholder="Ex: 30"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-text-main ml-2">Sexo</label>
                      <select 
                        value={formData.sexo}
                        onChange={(e) => setFormData({...formData, sexo: e.target.value})}
                        className="w-full p-4 bg-bg-general border border-border-soft rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                      >
                        <option value="">Selecione</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-text-main ml-2">Peso (kg)</label>
                      <input 
                        type="number" 
                        value={formData.peso}
                        onChange={(e) => setFormData({...formData, peso: e.target.value})}
                        className="w-full p-4 bg-bg-general border border-border-soft rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                        placeholder="Ex: 75"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-text-main ml-2">Altura (m)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={formData.altura}
                        onChange={(e) => setFormData({...formData, altura: e.target.value})}
                        className="w-full p-4 bg-bg-general border border-border-soft rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                        placeholder="Ex: 1.75"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-sm font-bold text-text-main ml-2">Profissão</label>
                      <input 
                        type="text" 
                        value={formData.profissao}
                        onChange={(e) => setFormData({...formData, profissao: e.target.value})}
                        className="w-full p-4 bg-bg-general border border-border-soft rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                        placeholder="Ex: Engenheiro, Professor..."
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-sm font-bold text-text-main ml-2">Nível de Atividade Física</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Sedentário', 'Atividade Leve', 'Atividade Moderada', 'Atividade Intensa'].map(level => (
                          <button
                            key={level}
                            onClick={() => setFormData({...formData, atividade_fisica: level})}
                            className={cn(
                              "p-3 rounded-xl border-2 text-xs font-bold transition-all",
                              formData.atividade_fisica === level ? "border-primary bg-primary/5 text-primary" : "border-border-soft bg-bg-general text-text-muted"
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
                  <h2 className="text-xl font-black text-text-main">Queixa Principal</h2>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-text-main ml-1">Região do Corpo</label>
                      <select 
                        value={formData.regiao_dor}
                        onChange={(e) => {
                          setFormData({
                            ...formData, 
                            regiao_dor: e.target.value,
                            perguntas_especificas: {} // Reset specific questions when region changes
                          });
                        }}
                        className="w-full p-4 bg-bg-general border border-border-soft rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                      >
                        <option value="">Selecione a região</option>
                        {['Cervical', 'Ombro', 'Cotovelo', 'Punho/Mão', 'Coluna Lombar', 'Quadril', 'Joelho', 'Tornozelo/Pé', 'Outro'].map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    {/* Dynamic Questions based on Region */}
                    {formData.regiao_dor && REGION_QUESTIONS[formData.regiao_dor] && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4 pt-4 border-t border-border-soft"
                      >
                        <h3 className="text-sm font-black text-primary uppercase tracking-widest">Perguntas Específicas</h3>
                        {REGION_QUESTIONS[formData.regiao_dor].map((q) => (
                          <div key={q.id} className="space-y-2">
                            <label className="text-sm font-bold text-text-main ml-1">{q.label}</label>
                            {q.type === 'boolean' ? (
                              <div className="grid grid-cols-2 gap-2">
                                {['Sim', 'Não'].map(opt => (
                                  <button
                                    key={opt}
                                    onClick={() => setFormData({
                                      ...formData,
                                      perguntas_especificas: {
                                        ...formData.perguntas_especificas,
                                        [q.id]: opt === 'Sim'
                                      }
                                    })}
                                    className={cn(
                                      "p-3 rounded-xl border-2 text-sm font-bold transition-all",
                                      formData.perguntas_especificas[q.id] === (opt === 'Sim') ? "border-primary bg-primary/5 text-primary" : "border-border-soft bg-bg-general text-text-muted"
                                    )}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <select
                                value={formData.perguntas_especificas[q.id] || ''}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  perguntas_especificas: {
                                    ...formData.perguntas_especificas,
                                    [q.id]: e.target.value
                                  }
                                })}
                                className="w-full p-3 bg-bg-general border border-border-soft rounded-xl outline-none"
                              >
                                <option value="">Selecione</option>
                                {q.options.map((opt: string) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        ))}
                      </motion.div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-text-main ml-1">Como começou?</label>
                      <div className="grid grid-cols-1 gap-2">
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
                              formData.inicio_sintomas === type.label ? "border-primary bg-primary/5 text-primary" : "border-border-soft bg-bg-general text-text-muted"
                            )}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-text-main ml-1">Há quanto tempo sente isso?</label>
                      <input 
                        type="text" 
                        value={formData.tempo_sintomas}
                        onChange={(e) => setFormData({...formData, tempo_sintomas: e.target.value})}
                        className="w-full p-4 bg-bg-general border border-border-soft rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                        placeholder="Ex: 2 semanas, 3 meses..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Clinical History */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-black text-text-main">Histórico Clínico</h2>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-bg-general rounded-2xl">
                      <span className="font-bold text-text-main">Já realizou fisioterapia antes?</span>
                      <button 
                        onClick={() => setFormData({...formData, historico_clinico: {...formData.historico_clinico, fisioterapia_anterior: !formData.historico_clinico.fisioterapia_anterior}})}
                        className={cn("w-12 h-6 rounded-full transition-all relative", formData.historico_clinico.fisioterapia_anterior ? "bg-primary" : "bg-border-soft")}
                      >
                        <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", formData.historico_clinico.fisioterapia_anterior ? "left-7" : "left-1")} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-bg-general rounded-2xl">
                      <span className="font-bold text-text-main">Possui diagnóstico médico?</span>
                      <button 
                        onClick={() => setFormData({...formData, historico_clinico: {...formData.historico_clinico, diagnostico_medico: !formData.historico_clinico.diagnostico_medico}})}
                        className={cn("w-12 h-6 rounded-full transition-all relative", formData.historico_clinico.diagnostico_medico ? "bg-primary" : "bg-border-soft")}
                      >
                        <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", formData.historico_clinico.diagnostico_medico ? "left-7" : "left-1")} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-text-main ml-2">Realizou exames de imagem?</label>
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
                              formData.historico_clinico.exames_imagem.includes(exam) ? "border-primary bg-primary/5 text-primary" : "border-border-soft bg-bg-general text-text-muted"
                            )}
                          >
                            {exam}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-text-main ml-2">Doenças pré-existentes</label>
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
                              formData.doencas_preexistentes.includes(disease) ? "border-primary bg-primary/5 text-primary" : "border-border-soft bg-bg-general text-text-muted"
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
                    <h2 className="text-xl font-black text-text-main">Sinais de Alerta</h2>
                  </div>
                  <p className="text-sm text-text-muted font-medium">Marque se você apresenta algum destes sintomas associados à dor:</p>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { id: 'febre', label: 'Febre associada à dor' },
                      { id: 'perda_peso', label: 'Perda de peso inexplicada' },
                      { id: 'fraqueza', label: 'Fraqueza progressiva nos membros' },
                      { id: 'sensibilidade', label: 'Perda de sensibilidade' },
                      { id: 'controle_urinario', label: 'Perda de controle urinário ou intestinal' },
                      { id: 'dor_noturna', label: 'Dor muito intensa à noite' },
                      { id: 'historico_cancer', label: 'Histórico prévio de câncer' }
                    ].map(flag => (
                      <button
                        key={flag.id}
                        onClick={() => setFormData({...formData, red_flags: {...formData.red_flags, [flag.id]: !formData.red_flags[flag.id as keyof typeof formData.red_flags]}})}
                        className={cn(
                          "p-4 rounded-2xl border-2 text-sm font-bold transition-all text-left flex items-center justify-between",
                          formData.red_flags[flag.id as keyof typeof formData.red_flags] ? "border-amber-500 bg-amber-50 text-amber-700" : "border-border-soft bg-bg-general text-text-muted"
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
                  <h2 className="text-2xl font-black text-text-main">Avaliação Funcional</h2>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-bg-general rounded-2xl">
                      <span className="font-bold text-text-main">Consegue realizar movimentos normalmente?</span>
                      <button 
                        onClick={() => setFormData({...formData, avaliacao_funcional: {...formData.avaliacao_funcional, movimentos_normais: !formData.avaliacao_funcional.movimentos_normais}})}
                        className={cn("w-12 h-6 rounded-full transition-all relative", formData.avaliacao_funcional.movimentos_normais ? "bg-primary" : "bg-border-soft")}
                      >
                        <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", formData.avaliacao_funcional.movimentos_normais ? "left-7" : "left-1")} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-bg-general rounded-2xl">
                      <span className="font-bold text-text-main">A dor piora com o movimento?</span>
                      <button 
                        onClick={() => setFormData({...formData, avaliacao_funcional: {...formData.avaliacao_funcional, piora_movimento: !formData.avaliacao_funcional.piora_movimento}})}
                        className={cn("w-12 h-6 rounded-full transition-all relative", formData.avaliacao_funcional.piora_movimento ? "bg-primary" : "bg-border-soft")}
                      >
                        <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", formData.avaliacao_funcional.piora_movimento ? "left-7" : "left-1")} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-text-main ml-2">Nível de limitação para atividades diárias</label>
                      <div className="grid grid-cols-3 gap-3">
                        {['leve', 'moderada', 'grave'].map(level => (
                          <button
                            key={level}
                            onClick={() => setFormData({...formData, avaliacao_funcional: {...formData.avaliacao_funcional, limitacao_atividades: level as any}})}
                            className={cn(
                              "p-4 rounded-xl border-2 text-xs font-black uppercase tracking-widest transition-all",
                              formData.avaliacao_funcional.limitacao_atividades === level ? "border-primary bg-primary/5 text-primary" : "border-border-soft bg-bg-general text-text-muted"
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
                    <h2 className="text-2xl font-black text-text-main">Escala de Dor</h2>
                    <p className="text-text-muted">De 0 (sem dor) a 10 (pior dor imaginável).</p>
                  </div>
                  <div className="relative py-10">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={formData.escala_dor}
                      onChange={(e) => setFormData({...formData, escala_dor: parseInt(e.target.value)})}
                      className="w-full h-4 bg-bg-general rounded-full appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between mt-6">
                      {[0, 2, 4, 6, 8, 10].map(val => (
                        <span key={val} className={cn(
                          "text-sm font-black transition-all",
                          formData.escala_dor === val ? "text-primary scale-125" : "text-border-soft"
                        )}>{val}</span>
                      ))}
                    </div>
                    <div className="mt-8 p-8 bg-primary/5 rounded-[2.5rem] text-center">
                      <span className="text-6xl font-black text-primary">{formData.escala_dor}</span>
                      <p className="text-primary/60 font-bold uppercase tracking-[0.3em] text-xs mt-2">
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
                    className="flex-1 py-5 bg-bg-general text-text-muted rounded-3xl font-black hover:bg-border-soft transition-all flex items-center justify-center gap-2"
                  >
                    <ChevronLeft size={20} /> Voltar
                  </button>
                )}
                <button
                  onClick={nextStep}
                  disabled={!isStepValid() || loading}
                  className="flex-[2] py-5 bg-primary text-white rounded-3xl font-black hover:bg-primary-hover transition-all shadow-premium flex items-center justify-center gap-2 disabled:opacity-50"
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
              <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-3xl text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="relative z-10 flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                    <BrainCircuit size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Relatório de Triagem</h3>
                    <div className="flex gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-white/20 rounded-full text-[9px] font-black uppercase tracking-widest">
                        {analysis?.classificacao}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                        analysis?.gravidade === 'Vermelho' || analysis?.gravidade === 'grave' ? "bg-rose-500" : analysis?.gravidade === 'Amarelo' || analysis?.gravidade === 'moderado' ? "bg-amber-500" : "bg-emerald-500"
                      )}>
                        Gravidade {analysis?.gravidade}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="max-h-[80vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20">
                  <div className="prose prose-invert prose-sm max-w-none bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20 shadow-inner break-words whitespace-normal">
                    <ReactMarkdown>{displayedAnalysis || ''}</ReactMarkdown>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-800">
                <AlertCircle className="flex-shrink-0 mt-1" size={18} />
                <div className="space-y-1">
                  <p className="text-xs font-bold">Aviso Legal</p>
                  <p className="text-[10px] font-medium leading-relaxed">
                    Esta triagem é informativa e não substitui avaliação presencial. Em caso de dor súbita e intensa, procure uma emergência.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={downloadReport}
                    className="py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Download size={18} /> Baixar
                  </button>
                  <button
                    onClick={shareWithPhysio}
                    className="py-4 bg-primary/10 text-primary rounded-2xl font-black hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Send size={18} /> Enviar
                  </button>
                </div>
                <button
                  onClick={() => setCurrentStep(0)}
                  className="py-4 bg-bg-general text-text-muted rounded-2xl font-black hover:bg-border-soft transition-all"
                >
                  Nova Triagem
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* History Section */}
      <section className="glass-card rounded-[3.5rem] overflow-hidden">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full p-8 flex items-center justify-between hover:bg-bg-general transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-bg-general rounded-2xl flex items-center justify-center text-text-muted">
              <History size={24} />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-black text-text-main">Histórico de Triagens</h2>
              <p className="text-sm text-text-muted font-medium">Acompanhe suas avaliações anteriores.</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-bg-general flex items-center justify-center text-text-muted">
            {showHistory ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </button>
        
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-border-soft"
            >
              {isHistoryLoading ? (
                <div className="p-20 text-center space-y-4">
                  <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                  <p className="text-text-muted font-bold animate-pulse">Carregando histórico...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="p-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-bg-general rounded-full flex items-center justify-center mx-auto text-border-soft">
                    <History size={32} />
                  </div>
                  <p className="text-text-muted font-bold uppercase tracking-widest text-xs">Nenhuma triagem encontrada</p>
                </div>
              ) : (
                <div className="divide-y divide-border-soft">
                  {history.map((item, i) => (
                    <div key={i} className="p-8 hover:bg-bg-general transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest">
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
                      <p className="text-text-main font-bold mb-2">{item.regiao_dor} - {item.tempo_sintomas}</p>
                      <div className="text-text-muted text-sm line-clamp-3 prose prose-slate prose-sm max-w-none">
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
