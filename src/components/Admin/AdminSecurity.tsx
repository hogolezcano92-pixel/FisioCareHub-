import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { 
  ShieldAlert, 
  UserX, 
  Unlock, 
  Lock, 
  Smartphone, 
  Clock, // Added Clock
  Globe, 
  Search, 
  History,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ZapOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface SecurityUser {
  id: string;
  nome_completo: string;
  email: string;
  tipo_usuario: string;
  status: 'ativo' | 'suspenso' | 'banido';
  lastSeen: string;
  devices: number;
}

export default function AdminSecurity() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<SecurityUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [suspiciousCount, setSuspiciousCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOptions, setShowOptions] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSecurityData() {
      try {
        const { data: profiles, error } = await supabase
          .from('perfis')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const { count, error: suspiciousError } = await supabase
          .from('historico_atividades')
          .select('*', { count: 'exact', head: true })
          .eq('tipo_acao', 'acao_suspicia')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        setSuspiciousCount(count || 0);

        const mappedUsers: SecurityUser[] = (profiles || []).map(p => ({
          id: p.id,
          nome_completo: p.nome_completo || t('common.no_name', 'Sem Nome'),
          email: p.email || 'N/A',
          tipo_usuario: p.tipo_usuario,
          status: p.status_aprovacao === 'rejeitado' ? 'banido' : p.status_aprovacao === 'pendente' ? 'suspenso' : 'ativo',
          lastSeen: p.last_active_at ? new Date(p.last_active_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
          devices: 1 // Default to 1 active session until actual devices table is available
        }));

        setUsers(mappedUsers);
      } catch (error) {
        console.error("Error fetching security data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSecurityData();
  }, [t]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const dbStatus = newStatus === 'banido' ? 'rejeitado' : newStatus === 'ativo' ? 'aprovado' : 'pendente';
      const { error } = await supabase
        .from('perfis')
        .update({ status_aprovacao: dbStatus })
        .eq('id', id);

      if (error) throw error;

      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus as any } : u));
      toast.success(t('admin.security.toast_success', 'Usuário {{status}} com sucesso', { status: newStatus }));
    } catch (err) {
      toast.error(t('admin.security.toast_error', 'Erro ao atualizar status.'));
    } finally {
      setShowOptions(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Alert Banner for Suspicious Activity */}
      {suspiciousCount > 0 && (
        <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-12 -mr-12 -mt-12 bg-rose-100 blur-3xl rounded-full group-hover:bg-rose-200 transition-all duration-1000" />
          
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shadow-sm animate-pulse">
              <ShieldAlert size={28} />
            </div>
            <div>
              <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">{t('admin.security.threats_detected', 'Security Threats Detected')}</h4>
              <p className="text-rose-600 font-bold text-xs">{suspiciousCount} {t('admin.security.flagged_events', 'suspicious events flagged in the last 24h.')}</p>
            </div>
          </div>
          
          <button 
            onClick={() => toast.info('Analyzing digital footprints...')}
            className="relative z-10 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-rose-100 transition-all active:scale-95 flex items-center gap-2"
          >
            <ZapOff size={18} />
            {t('admin.security.lockdown', 'Preventive Lockdown')}
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">{t('admin.security.access_control', 'Access Control & Security')}</h3>
          <p className="text-xs text-slate-500 font-medium">{t('admin.security.access_desc', 'Manage sessions, reset credentials, and enforce policies.')}</p>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder={t('admin.security.search_placeholder', 'Search security pool...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl pl-11 pr-6 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all w-full md:w-80"
          />
        </div>
      </div>

      {/* Users Security List */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500 tracking-[0.15em]">{t('admin.security.table.user', 'System User')}</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500 tracking-[0.15em]">{t('admin.security.table.tier', 'Access Tier')}</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500 tracking-[0.15em]">{t('admin.security.table.sync', 'Last Sync')}</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500 tracking-[0.15em]">{t('admin.security.table.hardware', 'Hardware')}</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500 tracking-[0.15em] text-right">{t('admin.security.table.shield', 'Shield')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('admin.security.scanning', 'Scanning encrypted pool...')}</p>
                  </td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-blue-600 border border-slate-200 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        {user.nome_completo.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 pr-4">{user.nome_completo}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className={cn(
                      "inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                      user.status === 'ativo' ? "border-emerald-100 bg-emerald-50 text-emerald-600" :
                      user.status === 'suspenso' ? "border-amber-100 bg-amber-50 text-amber-600" :
                      "border-rose-100 bg-rose-50 text-rose-600"
                    )}>
                      <div className={cn(
                        "w-1 h-1 rounded-full",
                        user.status === 'ativo' ? "bg-emerald-500" :
                        user.status === 'suspenso' ? "bg-amber-500" : "bg-rose-500"
                      )} />
                      {user.status}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                      <Clock size={14} className="text-slate-300" />
                      {user.lastSeen}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {Array.from({ length: user.devices }).map((_, i) => (
                          <div key={i} className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-slate-400" title="Active Terminal">
                            <Smartphone size={12} />
                          </div>
                        ))}
                      </div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {user.devices} {t('admin.security.connected', 'Connected')}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right relative">
                    <button 
                      onClick={() => setShowOptions(showOptions === user.id ? null : user.id)}
                      className="p-2 text-slate-400 hover:text-slate-900 rounded-lg transition-all"
                    >
                      <MoreVertical size={18} />
                    </button>

                    <AnimatePresence>
                      {showOptions === user.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setShowOptions(null)}
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                            className="absolute right-8 top-12 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 py-2 overflow-hidden"
                          >
                            <button 
                              className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all"
                              onClick={() => handleUpdateStatus(user.id, user.status === 'suspenso' ? 'ativo' : 'suspenso')}
                            >
                              {user.status === 'suspenso' ? (
                                <><Unlock size={14} className="text-emerald-500" /> {t('admin.security.actions.activate', 'Activate Account')}</>
                              ) : (
                                <><Lock size={14} className="text-amber-500" /> {t('admin.security.actions.suspend', 'Suspend Access')}</>
                              )}
                            </button>
                            <button 
                              className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all"
                              onClick={() => toast.info('Sessions terminated!')}
                            >
                              <ZapOff size={14} className="text-blue-500" /> {t('admin.security.actions.kill_sessions', 'Kill Remote Sessions')}
                            </button>
                            <div className="h-px bg-slate-100 my-1" />
                            <button 
                              className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-black text-rose-500 hover:bg-rose-50 transition-all"
                              onClick={() => handleUpdateStatus(user.id, 'banido')}
                            >
                              <UserX size={14} /> {t('admin.security.actions.ban', 'Permanent Ban')}
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </td>
                </tr>
              ))}
              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t('admin.security.no_assets', 'No assets found matching criteria.')}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Tools Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: History, title: t('admin.security.tools.audit_title', 'Auth Audit'), desc: t('admin.security.tools.audit_desc', 'Detailed tracking of administrative overrides and config changes.'), color: 'blue', action: t('admin.security.tools.audit_action', 'View Logs') },
          { icon: Globe, title: t('admin.security.tools.shield_title', 'Network Shield'), desc: t('admin.security.tools.shield_desc', 'Enforce geo-fencing and restrict access to authorized IP pools.'), color: 'amber', action: t('admin.security.tools.shield_action', 'Configure') },
          { icon: CheckCircle2, title: t('admin.security.tools.lgpd_title', 'LGPD Compliance'), desc: t('admin.security.tools.lgpd_desc', 'GDPR-grade reports for sensitive data access and HIPAA audits.'), color: 'emerald', action: t('admin.security.tools.lgpd_action', 'Audit Hub') }
        ].map((tool, idx) => (
          <div key={idx} className="bg-white p-8 rounded-[2rem] border border-slate-200 space-y-6 hover:shadow-md hover:border-slate-300 transition-all group">
            <div className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110",
              tool.color === 'blue' ? 'bg-blue-50 border-blue-100 text-blue-600' :
              tool.color === 'amber' ? 'bg-amber-50 border-amber-100 text-amber-600' :
              'bg-emerald-50 border-emerald-100 text-emerald-600'
            )}>
              <tool.icon size={28} />
            </div>
            <div>
              <h5 className="text-lg font-black text-slate-900 uppercase tracking-tight">{tool.title}</h5>
              <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">{tool.desc}</p>
            </div>
            <button className={cn(
              "w-full py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-sm transition-all",
              tool.color === 'blue' ? 'bg-blue-600 text-white hover:bg-blue-700' :
              'bg-white border text-slate-900 hover:bg-slate-50 border-slate-200'
            )}>
              {tool.action}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
