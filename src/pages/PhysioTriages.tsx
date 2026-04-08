import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrainCircuit, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  ChevronRight, 
  AlertCircle,
  Clock,
  Activity,
  FileText,
  X,
  Download
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatDate, cn } from '../lib/utils';
import { toast } from 'sonner';

export default function PhysioTriages() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [triages, setTriages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTriage, setSelectedTriage] = useState<any | null>(null);

  useEffect(() => {
    if (profile && profile.plano !== 'fisioterapeuta') {
      navigate('/dashboard');
      return;
    }
    fetchTriages();
  }, [profile, navigate]);

  const fetchTriages = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('triagens')
        .select(`
          *,
          paciente:perfis!paciente_id (
            nome_completo,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (supabaseError) {
        console.error('Erro completo do Supabase ao buscar triagens:', supabaseError);
        // Fallback para query simples
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('triagens')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (fallbackError) throw fallbackError;
        setTriages(fallbackData || []);
        return;
      }
      setTriages(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar triagens:', err);
      setTriages([]);
      setError(err.message || 'Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTriages = triages.filter(t => 
    t.paciente?.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.regiao_dor?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const downloadReport = (triage: any) => {
    const element = document.createElement("a");
    const file = new Blob([triage.relatorio], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `triagem_${triage.paciente?.nome_completo || 'paciente'}_${formatDate(triage.created_at)}.txt`;
    document.body.appendChild(element);
    element.click();
    toast.success("Relatório baixado!");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 w-full box-border overflow-wrap-break-word">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Triagens Realizadas</h1>
          <p className="text-slate-500 font-medium">Acompanhe as avaliações de IA dos seus pacientes.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Buscar por paciente ou região..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl w-full focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
          />
        </div>
      </header>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 w-full">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse">Carregando triagens...</p>
        </div>
      ) : filteredTriages.length === 0 ? (
        <div className="bg-white p-20 rounded-[3rem] text-center space-y-4 border border-slate-100 w-full">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
            <BrainCircuit size={40} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900">Nenhuma triagem encontrada</h3>
            <p className="text-slate-500">As triagens realizadas pelos pacientes aparecerão aqui.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {filteredTriages.map((triage) => (
            <motion.div
              key={triage.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group cursor-pointer"
              onClick={() => setSelectedTriage(triage)}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <User size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 line-clamp-1">{triage.paciente?.nome_completo || 'Paciente'}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      <Calendar size={12} />
                      {formatDate(triage.created_at)}
                    </div>
                  </div>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                  triage.gravidade === 'Vermelho' || triage.gravidade === 'grave' ? "bg-rose-50 text-rose-600" : triage.gravidade === 'Amarelo' || triage.gravidade === 'moderado' ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                )}>
                  {triage.gravidade}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Activity size={16} className="text-slate-400" />
                  <span className="text-slate-600 font-bold">{triage.regiao_dor}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={16} className="text-slate-400" />
                  <span className="text-slate-600 font-medium">{triage.tempo_sintomas}</span>
                </div>
                
                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-600 uppercase tracking-widest group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Ver Relatório <ChevronRight size={14} />
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Dor:</span>
                    <span className="text-sm font-black text-slate-900">{triage.escala_dor}/10</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Triage Detail Modal */}
      <AnimatePresence>
        {selectedTriage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTriage(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                    <BrainCircuit size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Relatório de Triagem</h2>
                    <p className="text-slate-500 font-medium">{selectedTriage.paciente?.nome_completo} • {formatDate(selectedTriage.created_at)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedTriage(null)}
                  className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 space-y-8">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Região</span>
                    <p className="font-bold text-slate-900">{selectedTriage.regiao_dor}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dor</span>
                    <p className="font-bold text-slate-900">{selectedTriage.escala_dor}/10</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gravidade</span>
                    <p className={cn(
                      "font-bold",
                      selectedTriage.gravidade === 'Vermelho' || selectedTriage.gravidade === 'grave' ? "text-rose-600" : selectedTriage.gravidade === 'Amarelo' || selectedTriage.gravidade === 'moderado' ? "text-amber-600" : "text-emerald-600"
                    )}>{selectedTriage.gravidade}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Classificação</span>
                    <p className="font-bold text-slate-900 line-clamp-1">{selectedTriage.classificacao}</p>
                  </div>
                </div>

                <div className="prose prose-slate max-w-none bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 break-words">
                  <ReactMarkdown>{selectedTriage.relatorio}</ReactMarkdown>
                </div>

                {selectedTriage.red_flag && (
                  <div className="p-6 bg-rose-50 border border-rose-100 rounded-[2rem] flex items-start gap-4 text-rose-900">
                    <AlertCircle className="flex-shrink-0 mt-1" size={24} />
                    <div className="space-y-1">
                      <p className="font-black uppercase tracking-widest text-xs">Atenção: Red Flags Detectadas</p>
                      <p className="text-sm font-medium leading-relaxed">Esta triagem identificou sinais de alerta que podem exigir atenção médica imediata ou prioridade máxima na avaliação.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                <button
                  onClick={() => downloadReport(selectedTriage)}
                  className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Download size={20} /> Baixar PDF
                </button>
                <button
                  onClick={() => setSelectedTriage(null)}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                >
                  Fechar Relatório
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Loader2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
