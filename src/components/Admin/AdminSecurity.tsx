import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  ShieldAlert, 
  UserX, 
  Unlock, 
  Lock, 
  Smartphone, 
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
  const [users, setUsers] = useState<SecurityUser[]>([
    { id: '1', nome_completo: 'João Paulo', email: 'joao@fisio.com', tipo_usuario: 'fisioterapeuta', status: 'ativo', lastSeen: '2 min atrás', devices: 2 },
    { id: '2', nome_completo: 'Maria Silva', email: 'maria@paciente.com', tipo_usuario: 'paciente', status: 'suspenso', lastSeen: '1 dia atrás', devices: 1 },
    { id: '3', nome_completo: 'Carlos Eduardo', email: 'carlos@fisio.com', tipo_usuario: 'fisioterapeuta', status: 'ativo', lastSeen: 'Online', devices: 3 },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showOptions, setShowOptions] = useState<string | null>(null);

  const handleUpdateStatus = (id: string, newStatus: 'ativo' | 'suspenso' | 'banido') => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus } : u));
    toast.success(`Usuário ${newStatus === 'ativo' ? 'reativado' : 'suspenso'} com sucesso`);
    setShowOptions(null);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Alert Banner for Suspicious Activity */}
      <div className="bg-rose-500/10 p-8 rounded-[3rem] border border-rose-500/20 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-12 -mr-12 -mt-12 bg-rose-600/10 blur-3xl rounded-full group-hover:bg-rose-600/20 transition-all duration-1000" />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center border border-rose-500/20 shadow-lg animate-pulse">
            <ShieldAlert size={32} />
          </div>
          <div>
            <h4 className="text-xl font-black text-white uppercase tracking-tight">Atividades Suspeitas Detectadas</h4>
            <p className="text-rose-400/80 font-bold text-sm">3 usuários com múltiplos IPs Geográficos na última hora.</p>
          </div>
        </div>
        
        <button className="relative z-10 px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-rose-900/40 transition-all active:scale-95 flex items-center gap-2">
          <ZapOff size={20} />
          Bloqueio Preventivo
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tight uppercase">Gestão de Acessos & Segurança</h3>
          <p className="text-sm text-slate-400 font-medium tracking-tight">Controle sessões, redefina senhas e gerencie suspensões.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text"
            placeholder="Filtrar usuários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-3 text-sm text-white font-bold outline-none focus:border-blue-600 transition-all w-72"
          />
        </div>
      </div>

      {/* Users Security List */}
      <div className="bg-white/5 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5">
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Usuário</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Status de Acesso</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Atividade</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Dispositivos</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center font-black text-blue-400 border border-white/10 group-hover:border-blue-500/50 transition-all">
                        {user.nome_completo.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white pr-4">{user.nome_completo}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className={cn(
                      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                      user.status === 'ativo' ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" :
                      user.status === 'suspenso' ? "border-amber-500/20 bg-amber-500/5 text-amber-500" :
                      "border-rose-500/20 bg-rose-500/5 text-rose-500"
                    )}>
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        user.status === 'ativo' ? "bg-emerald-500" :
                        user.status === 'suspenso' ? "bg-amber-500" : "bg-rose-500"
                      )} />
                      {user.status}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                      <Clock size={14} className="text-slate-600" />
                      {user.lastSeen}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {Array.from({ length: user.devices }).map((_, i) => (
                          <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-[#0B1120] flex items-center justify-center text-slate-500" title="Dispositivo Conectado">
                            <Smartphone size={14} />
                          </div>
                        ))}
                      </div>
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                        {user.devices} Ativos
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right relative">
                    <button 
                      onClick={() => setShowOptions(showOptions === user.id ? null : user.id)}
                      className="p-2 text-slate-500 hover:text-white rounded-xl transition-all"
                    >
                      <MoreVertical size={20} />
                    </button>

                    <AnimatePresence>
                      {showOptions === user.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setShowOptions(null)}
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -10 }}
                            className="absolute right-8 top-16 w-64 bg-[#0F172A] border border-white/10 rounded-2xl shadow-2xl z-20 py-2 overflow-hidden"
                          >
                            <button 
                              className="w-full px-4 py-3 flex items-center gap-3 text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-all"
                              onClick={() => handleUpdateStatus(user.id, user.status === 'suspenso' ? 'ativo' : 'suspenso')}
                            >
                              {user.status === 'suspenso' ? (
                                <><Unlock size={16} className="text-emerald-500" /> Reativar Conta</>
                              ) : (
                                <><Lock size={16} className="text-amber-500" /> Suspender Acesso</>
                              )}
                            </button>
                            <button 
                              className="w-full px-4 py-3 flex items-center gap-3 text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-all"
                              onClick={() => toast.info('Sessões encerradas!')}
                            >
                              <ZapOff size={16} className="text-blue-500" /> Encerrar Outras Sessões
                            </button>
                            <div className="h-px bg-white/5 my-1" />
                            <button 
                              className="w-full px-4 py-3 flex items-center gap-3 text-xs font-black text-rose-500 hover:bg-rose-500/10 transition-all"
                              onClick={() => handleUpdateStatus(user.id, 'banido')}
                            >
                              <UserX size={16} /> Banir Permanentemente
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Tools Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-6 hover:bg-white/[0.08] transition-all group">
          <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
            <History size={28} />
          </div>
          <div>
            <h5 className="text-lg font-black text-white uppercase tracking-tight">Logs Administrativos</h5>
            <p className="text-xs text-slate-500 font-bold mt-2">Veja quem alterou configurações do sistema e quando.</p>
          </div>
          <button className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-900/20">
            Acessar Logs
          </button>
        </div>

        <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-6 hover:bg-white/[0.08] transition-all group">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
            <Globe size={28} />
          </div>
          <div>
            <h5 className="text-lg font-black text-white uppercase tracking-tight">Geofencing & IP</h5>
            <p className="text-xs text-slate-500 font-bold mt-2">Restringir acesso por região ou endereços IP específicos.</p>
          </div>
          <button className="w-full py-3 bg-white/5 text-amber-500 rounded-xl font-black text-[10px] uppercase tracking-widest border border-amber-500/20">
            Configurar Filtros
          </button>
        </div>

        <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-6 hover:bg-white/[0.08] transition-all group">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <h5 className="text-lg font-black text-white uppercase tracking-tight">Conformidade LGPD</h5>
            <p className="text-xs text-slate-500 font-bold mt-2">Relatórios de acesso a dados sensíveis (Medical Audit).</p>
          </div>
          <button className="w-full py-3 bg-white/5 text-emerald-400 rounded-xl font-black text-[10px] uppercase tracking-widest border border-emerald-500/20">
            Audit Report
          </button>
        </div>
      </div>
    </div>
  );
}
