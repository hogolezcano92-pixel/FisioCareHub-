import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Clock, 
  Search, 
  Filter, 
  User, 
  Shield, 
  AlertCircle, 
  FileText, 
  Activity,
  ArrowRight,
  Monitor,
  Globe,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate } from '../../lib/utils';

interface Log {
  id: string;
  usuario_id: string;
  tipo_usuario: string;
  tipo_acao: string;
  descricao: string;
  referencia_id: string;
  created_at: string;
  detalhes: any;
  ip_address: string;
  perfil?: {
    nome_completo: string;
    email: string;
    foto_url: string;
  };
}

export default function AdminLogs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('admin_audit_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'historico_atividades' }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('historico_atividades')
        .select(`
          *,
          perfil:perfis!usuario_id (nome_completo, email, foto_url)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.perfil?.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.tipo_acao.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || log.tipo_usuario === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const getActionIcon = (type: string) => {
    if (type.includes('login') || type.includes('logout')) return <Shield size={16} className="text-blue-400" />;
    if (type.includes('prontuario')) return <FileText size={16} className="text-emerald-400" />;
    if (type.includes('finance') || type.includes('pagamento')) return <Database size={16} className="text-amber-400" />;
    if (type.includes('erro') || type.includes('suspicia')) return <AlertCircle size={16} className="text-rose-400" />;
    return <Activity size={16} className="text-slate-400" />;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tight uppercase">Audit Trail & Sistema de Logs</h3>
          <p className="text-sm text-slate-400 font-medium">Monitoramento em tempo real de todas as ações da plataforma.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Pesquisar logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-3 text-sm text-white font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all w-64 shadow-inner"
            />
          </div>

          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
            {['all', 'fisio', 'paciente', 'admin', 'sistema'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  filterType === type 
                    ? "bg-blue-600 text-white shadow-lg" 
                    : "text-slate-500 hover:text-white"
                )}
              >
                {type === 'all' ? 'Ver Todos' : type}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Timeline View */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/5 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <h4 className="text-lg font-black text-white tracking-tight flex items-center gap-3">
                <Clock className="text-blue-400" size={20} />
                Timeline de Atividades
              </h4>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Live Flow</span>
              </div>
            </div>

            <div className="p-0 overflow-y-auto max-h-[700px] custom-scrollbar">
              {loading ? (
                <div className="p-20 text-center space-y-4">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Carregando logs...</p>
                </div>
              ) : filteredLogs.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {filteredLogs.map((log) => (
                    <motion.div 
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => setSelectedLog(log)}
                      className={cn(
                        "p-6 flex items-start gap-5 hover:bg-white/[0.03] transition-all cursor-pointer border-r-4 border-transparent",
                        selectedLog?.id === log.id && "bg-white/[0.05] border-blue-600"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border border-white/10",
                        log.tipo_usuario === 'admin' ? "bg-amber-500/10" : 
                        log.tipo_usuario === 'fisio' ? "bg-blue-500/10" : "bg-emerald-500/10"
                      )}>
                        {getActionIcon(log.tipo_acao)}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm font-black text-white">{log.descricao}</p>
                          <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <User size={12} className="text-slate-500" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {log.perfil?.nome_completo || 'Sistema'}
                            </span>
                          </div>
                          <div className="w-1 h-1 rounded-full bg-slate-700" />
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border border-white/5",
                            log.tipo_usuario === 'admin' ? "text-amber-400 bg-amber-400/5" :
                            log.tipo_usuario === 'fisio' ? "text-blue-400 bg-blue-400/5" : "text-emerald-400 bg-emerald-400/5"
                          )}>
                            {log.tipo_usuario}
                          </span>
                          {log.ip_address && (
                            <>
                              <div className="w-1 h-1 rounded-full bg-slate-700" />
                              <span className="text-[9px] font-bold text-slate-600 font-mono">{log.ip_address}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-32 text-center">
                  <Activity size={48} className="text-slate-700 mx-auto mb-4 opacity-50" />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Nenhum log encontrado.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Log Inspector */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600/10 to-indigo-600/5 rounded-[2.5rem] border border-blue-500/20 shadow-2xl p-8 sticky top-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20">
                <Shield size={28} />
              </div>
              <div>
                <h4 className="text-lg font-black text-white uppercase tracking-tight">Log Inspector</h4>
                <p className="text-xs text-blue-400/60 font-bold">Análise profunda de eventos</p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {selectedLog ? (
                <motion.div
                  key={selectedLog.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                      <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <span>Ação</span>
                        <span className="text-blue-400">{selectedLog.tipo_acao}</span>
                      </div>
                      <p className="text-sm font-bold text-white leading-relaxed">{selectedLog.descricao}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">ID Usuário</p>
                        <p className="text-[10px] font-mono text-slate-400 truncate">{selectedLog.usuario_id}</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ref ID</p>
                        <p className="text-[10px] font-mono text-slate-400 truncate">{selectedLog.referencia_id || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                      <div className="flex items-center gap-3">
                        <Monitor size={14} className="text-slate-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Detalhes do Sistema</span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500 font-bold">IP Address</span>
                          <span className="text-white font-mono">{selectedLog.ip_address || '127.0.0.1'}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500 font-bold">Browser</span>
                          <span className="text-white font-mono truncate max-w-[120px]">{selectedLog.detalhes?.userAgent || 'Chrome/124.0.0'}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500 font-bold">Location</span>
                          <span className="text-white font-mono">São Paulo, BR</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Payload (JSON)</p>
                      <pre className="p-6 bg-slate-950 rounded-[2rem] border border-white/10 text-[10px] font-mono text-blue-400/80 overflow-x-auto custom-scrollbar">
                        {JSON.stringify(selectedLog.detalhes || { status: 'Success' }, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <button className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-white/10 flex items-center justify-center gap-2 group">
                    Visualizar Objeto Vinculado
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              ) : (
                <div className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-slate-700 mx-auto border border-white/10">
                    <Globe size={32} />
                  </div>
                  <p className="text-slate-500 text-xs font-bold leading-relaxed">
                    Selecione um evento na timeline para ver os detalhes técnicos, metadados e payload da transação.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
