import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useDebounce } from '@/hooks/useDebounce';
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
  const { t } = useTranslation();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filterType, setFilterType] = useState('all');
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('admin_audit_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'historico_atividades' }, async (payload) => {
        const newLog = payload.new as Log;
        
        // Fetch profile for the new log to maintain UI consistency
        const { data: profile } = await supabase
          .from('perfis')
          .select('nome_completo, email, foto_url')
          .eq('id', newLog.usuario_id)
          .single();
        
        const logWithProfile = {
          ...newLog,
          perfil: profile || undefined
        };

        setLogs(prev => [logWithProfile, ...prev].slice(0, 100));
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

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const descricao = (log.descricao ?? '').toLowerCase();
      const nomeCompleto = (log.perfil?.nome_completo ?? '').toLowerCase();
      const tipoAcao = (log.tipo_acao ?? '').toLowerCase();
      const search = (debouncedSearch ?? '').toLowerCase();

      const matchesSearch = 
        descricao.includes(search) ||
        nomeCompleto.includes(search) ||
        tipoAcao.includes(search);
      
      const matchesFilter = filterType === 'all' || log.tipo_usuario === filterType;
      
      return matchesSearch && matchesFilter;
    });
  }, [logs, debouncedSearch, filterType]);

  const getActionIcon = (type: string) => {
    const actionType = type ?? '';
    if (actionType.includes('login') || actionType.includes('logout')) return <Shield size={16} className="text-blue-400" />;
    if (actionType.includes('prontuario')) return <FileText size={16} className="text-emerald-400" />;
    if (actionType.includes('finance') || actionType.includes('pagamento')) return <Database size={16} className="text-amber-400" />;
    if (actionType.includes('erro') || actionType.includes('suspicia')) return <AlertCircle size={16} className="text-rose-400" />;
    return <Activity size={16} className="text-slate-400" />;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-xl admin-title tracking-tight uppercase">{t('admin.logs.title')}</h3>
          <p className="admin-text-secondary text-xs font-medium">{t('admin.logs.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
            <input 
              type="text"
              placeholder={t('admin.logs.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl pl-11 pr-6 py-2.5 text-xs text-slate-900 font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all w-full md:w-64"
            />
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            {['all', 'fisio', 'paciente', 'admin'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                  filterType === type 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                {type === 'all' ? t('common.all') : t(`admin_users.role_${type === 'fisio' ? 'physio' : type === 'paciente' ? 'patient' : type}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Timeline View */}
        <div className="lg:col-span-2 space-y-6">
          <div className="admin-card overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h4 className="text-sm admin-title tracking-tight flex items-center gap-2">
                <Clock className="text-blue-600" size={16} />
                {t('admin.logs.timeline_title')}
              </h4>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{t('admin.logs.live_flow')}</span>
              </div>
            </div>

            <div className="p-0 overflow-y-auto max-h-[700px] custom-scrollbar">
              {loading ? (
                <div className="p-20 text-center space-y-4">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">{t('admin.logs.ingesting')}</p>
                </div>
              ) : filteredLogs.length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {filteredLogs.map((log) => (
                    <motion.div 
                      key={log.id}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => setSelectedLog(log)}
                      className={cn(
                        "p-5 flex items-start gap-5 hover:bg-slate-50/50 transition-all cursor-pointer border-r-4 border-transparent",
                        selectedLog?.id === log.id && "bg-blue-50/30 border-blue-600"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border transition-colors",
                        selectedLog?.id === log.id ? "bg-white border-blue-200 shadow-sm" : "bg-slate-100 border-slate-200"
                      )}>
                        {getActionIcon(log.tipo_acao)}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-xs font-black text-slate-900">{log.descricao ?? ''}</p>
                          <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <User size={12} className="text-slate-300" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              {log.perfil?.nome_completo ?? 'System Core'}
                            </span>
                          </div>
                          <div className="w-1 h-1 rounded-full bg-slate-200" />
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                            log.tipo_usuario === 'admin' ? "text-amber-600 bg-amber-50 border-amber-100" :
                            log.tipo_usuario === 'fisio' ? "text-blue-600 bg-blue-50 border-blue-100" : "text-emerald-600 bg-emerald-50 border-emerald-100"
                          )}>
                            {log.tipo_usuario}
                          </span>
                          {log.ip_address && (
                            <>
                              <div className="w-1 h-1 rounded-full bg-slate-200" />
                              <span className="text-[9px] font-bold text-slate-300 font-mono">{log.ip_address}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="py-32 text-center space-y-4">
                  <Activity size={40} className="text-slate-200 mx-auto" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">{t('admin.logs.no_entries')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Log Inspector */}
        <div className="space-y-6">
          <div className="admin-card p-8 shadow-xl sticky top-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 shadow-sm">
                <Shield size={24} />
              </div>
              <div>
                <h4 className="text-sm admin-title uppercase tracking-tight">{t('admin.logs.inspector.title')}</h4>
                <p className="admin-text-secondary text-[10px] font-bold uppercase tracking-widest">{t('admin.logs.inspector.metadata')}</p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {selectedLog ? (
                <motion.div
                  key={selectedLog.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <span>{t('admin.logs.inspector.event_type')}</span>
                        <span className="text-blue-600">{selectedLog.tipo_acao ?? ''}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 leading-relaxed">{selectedLog.descricao ?? ''}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('admin.logs.inspector.vector_id')}</p>
                        <p className="text-[9px] font-mono text-slate-600 truncate">{selectedLog.usuario_id ?? ''}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('admin.logs.inspector.linked_ref')}</p>
                        <p className="text-[9px] font-mono text-slate-600 truncate">{selectedLog.referencia_id || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                      <div className="flex items-center gap-3">
                        <Monitor size={14} className="text-slate-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('admin.logs.inspector.diagnostics')}</span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400 font-bold">{t('admin.logs.inspector.client_ip')}</span>
                          <span className="text-slate-900 font-mono font-bold">{selectedLog.ip_address || '127.0.0.1'}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400 font-bold">{t('admin.logs.inspector.user_agent')}</span>
                          <span className="text-slate-900 font-mono truncate max-w-[120px]">{selectedLog.detalhes?.userAgent || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">{t('admin.logs.inspector.payload')}</p>
                      <pre className="p-5 bg-slate-900 rounded-2xl border border-slate-800 text-[10px] font-mono text-blue-300 overflow-x-auto custom-scrollbar shadow-inner">
                        {JSON.stringify(selectedLog.detalhes || { status: 'Success' }, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <button className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 group">
                    {t('admin.logs.inspector.inspect_action')}
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              ) : (
                <div className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300 mx-auto border border-slate-200">
                    <Database size={32} />
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                    {t('admin.logs.inspector.select_event')}
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
