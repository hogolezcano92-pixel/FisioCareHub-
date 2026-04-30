import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { 
  Stethoscope, 
  Search, 
  Plus, 
  FileText, 
  ArrowRight,
  Loader2,
  Calendar,
  User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate, cn } from '../lib/utils';
import ProGuard from '../components/ProGuard';

export default function PhysioEvaluationsList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      fetchEvaluations();
    }
  }, [user]);

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fichas_avaliacao')
        .select(`
          *,
          paciente:pacientes(id, nome)
        `)
        .eq('fisioterapeuta_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvaluations(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvaluations = evaluations.filter(ev => 
    ev.paciente?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ev.diagnostico_fisio?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProGuard>
      <div className="space-y-8 max-w-6xl mx-auto pb-20">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <Stethoscope className="text-sky-500" size={36} />
              Fichas de Avaliação
            </h1>
            <p className="text-slate-400 font-medium tracking-wide">
              Avaliação fisioterapêutica completa e histórico clínico dos seus pacientes.
            </p>
          </div>
          
          <button 
            onClick={() => navigate('/patients')}
            className="flex items-center gap-2 px-8 py-4 bg-sky-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-sky-600 transition-all shadow-xl shadow-sky-900/20"
          >
            <Plus size={20} /> Nova Avaliação
          </button>
        </header>

        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-500 transition-colors" size={20} />
          <input 
            type="text"
            placeholder="Buscar por nome do paciente ou diagnóstico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-5 bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-white placeholder:text-slate-600 font-medium"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-sky-500" size={48} />
          </div>
        ) : filteredEvaluations.length === 0 ? (
          <div className="bg-slate-900/50 backdrop-blur-xl p-20 rounded-[3rem] border border-white/10 text-center shadow-2xl">
            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center text-slate-700 mx-auto mb-6">
              <FileText size={40} />
            </div>
            <h3 className="text-2xl font-black text-white">Nenhuma ficha encontrada</h3>
            <p className="text-slate-500 mt-2 font-medium">Você ainda não realizou avaliações ou a busca não retornou resultados.</p>
            <button 
              onClick={() => navigate('/patients')}
              className="mt-8 px-8 py-3 bg-white/5 text-sky-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10"
            >
              Ir para Meus Pacientes
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvaluations.map((ev, idx) => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-xl overflow-hidden hover:border-sky-500/30 transition-all group cursor-pointer"
                onClick={() => navigate(`/physio/evaluation/${ev.id}`)}
              >
                <div className="p-8 space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-sky-500/10 text-sky-400 rounded-2xl border border-sky-500/20">
                      <FileText size={24} />
                    </div>
                    <div className="text-right">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Data da Ficha</span>
                       <span className="text-sm font-bold text-white flex items-center gap-2 justify-end">
                         <Calendar size={14} className="text-sky-500" />
                         {formatDate(ev.created_at)}
                       </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-white group-hover:text-sky-400 transition-colors flex items-center gap-2">
                      <User size={18} className="text-slate-600" />
                      {ev.paciente?.nome}
                    </h3>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Diagnóstico Fisio.</p>
                      <p className="text-xs text-slate-400 font-medium line-clamp-2 italic">
                        {ev.diagnostico_fisio || "Nenhum diagnóstico registrado..."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                     <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Acessar Ficha</span>
                     <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-slate-500 group-hover:bg-sky-500 group-hover:text-white transition-all shadow-inner">
                        <ArrowRight size={18} />
                     </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </ProGuard>
  );
}
