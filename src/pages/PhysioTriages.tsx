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
import ProGuard from '../components/ProGuard';

export default function PhysioTriages() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [triages, setTriages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTriage, setSelectedTriage] = useState<any | null>(null);

  useEffect(() => {
    if (profile && profile.tipo_usuario !== 'fisioterapeuta') {
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
            id,
            nome_completo,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (supabaseError) {
        console.warn('Primary fetch failed for triages, trying secondary fallback...', supabaseError.message);
        
        // Fallback: Busca básica sem join e depois busca os perfis relacionados
        const { data: baseData, error: baseError } = await supabase
          .from('triagens')
          .select('*')
          .order('created_at', { ascending: false });

        if (baseError) throw baseError;
        if (!baseData || baseData.length === 0) {
          setTriages([]);
          return;
        }

        const pacienteIds = [...new Set(baseData.map(t => t.paciente_id))].filter(Boolean);

        if (pacienteIds.length > 0) {
          const { data: profiles } = await supabase
            .from('perfis')
            .select('id, nome_completo, avatar_url')
            .in('id', pacienteIds);

          const profileMap = (profiles || []).reduce((acc: any, p) => {
            acc[p.id] = p;
            return acc;
          }, {});

          const enriched = baseData.map(t => ({
            ...t,
            paciente: profileMap[t.paciente_id] || { nome_completo: 'Paciente Externo', avatar_url: null }
          }));
          
          setTriages(enriched);
        } else {
          setTriages(baseData.map(t => ({ ...t, paciente: { nome_completo: 'Paciente Externo', avatar_url: null } })));
        }
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
    <ProGuard>
      <div className="max-w-6xl mx-auto space-y-8 pb-20 w-full box-border overflow-wrap-break-word">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tight">Triagens Realizadas</h1>
          <p className="text-slate-400 font-medium">Acompanhe as avaliações de IA dos seus pacientes.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search 
            className="absolute pointer-events-none z-20" 
            style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#94a3b8' }}
          />
          <input 
            type="text"
            placeholder="Buscar por paciente ou região..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-2xl w-full text-white placeholder:text-slate-600 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all !pl-[60px]"
          />
        </div>
      </header>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 w-full">
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse">Carregando triagens...</p>
        </div>
      ) : filteredTriages.length === 0 ? (
        <div className="bg-slate-900/50 backdrop-blur-xl p-20 rounded-[3rem] text-center space-y-4 border border-slate-800 w-full">
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-700">
            <BrainCircuit size={40} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-white">Nenhuma triagem encontrada</h3>
            <p className="text-slate-400">As triagens realizadas pelos pacientes aparecerão aqui.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {filteredTriages.map((triage) => (
            <motion.div
              key={triage.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2.5rem] border border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all group cursor-pointer"
              onClick={() => setSelectedTriage(triage)}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400">
                    <User size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-white line-clamp-1">{triage.paciente?.nome_completo || 'Paciente'}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      <Calendar size={12} />
                      {formatDate(triage.created_at)}
                    </div>
                  </div>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                  triage.gravidade === 'Vermelho' || triage.gravidade === 'grave' ? "bg-rose-500/10 text-rose-400" : triage.gravidade === 'Amarelo' || triage.gravidade === 'moderado' ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"
                )}>
                  {triage.gravidade}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Activity size={16} className="text-slate-500" />
                  <span className="text-slate-300 font-bold">{triage.regiao_dor}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={16} className="text-slate-500" />
                  <span className="text-slate-400 font-medium">{triage.tempo_sintomas}</span>
                </div>
                
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-400 uppercase tracking-widest group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Ver Relatório <ChevronRight size={14} />
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Dor:</span>
                    <span className="text-sm font-black text-white">{triage.escala_dor}/10</span>
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
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900 w-full max-w-3xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] border border-slate-800"
            >
              <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <BrainCircuit size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Relatório de Triagem</h2>
                    <p className="text-slate-400 font-medium">{selectedTriage.paciente?.nome_completo} • {formatDate(selectedTriage.created_at)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedTriage(null)}
                  className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 space-y-8">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-800/50 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Região</span>
                    <p className="font-bold text-white">{selectedTriage.regiao_dor}</p>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dor</span>
                    <p className="font-bold text-white">{selectedTriage.escala_dor}/10</p>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gravidade</span>
                    <p className={cn(
                      "font-bold",
                      selectedTriage.gravidade === 'Vermelho' || selectedTriage.gravidade === 'grave' ? "text-rose-400" : selectedTriage.gravidade === 'Amarelo' || selectedTriage.gravidade === 'moderado' ? "text-amber-400" : "text-emerald-400"
                    )}>{selectedTriage.gravidade}</p>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Classificação</span>
                    <p className="font-bold text-white line-clamp-1">{selectedTriage.classificacao}</p>
                  </div>
                </div>

                <div className="prose prose-invert max-w-none bg-slate-800/50 p-8 rounded-[2.5rem] border border-slate-800 break-words text-slate-300">
                  <ReactMarkdown>{selectedTriage.relatorio}</ReactMarkdown>
                </div>

                {selectedTriage.red_flag && (
                  <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] flex items-start gap-4 text-rose-200">
                    <AlertCircle className="flex-shrink-0 mt-1 text-rose-400" size={24} />
                    <div className="space-y-1">
                      <p className="font-black uppercase tracking-widest text-xs text-rose-400">Atenção: Red Flags Detectadas</p>
                      <p className="text-sm font-medium leading-relaxed">Esta triagem identificou sinais de alerta que podem exigir atenção médica imediata ou prioridade máxima na avaliação.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-slate-800 bg-slate-900/50 flex gap-4">
                <button
                  onClick={() => downloadReport(selectedTriage)}
                  className="flex-1 py-4 bg-slate-800 border border-slate-700 text-slate-300 rounded-2xl font-black hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <Download size={20} /> Baixar PDF
                </button>
                <button
                  onClick={() => setSelectedTriage(null)}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20"
                >
                  Fechar Relatório
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </ProGuard>
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
