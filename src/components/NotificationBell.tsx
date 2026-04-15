import { useState, useEffect, useRef } from 'react';
import { Bell, MessageSquare, Calendar, Info, X, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error("Erro ao buscar notificações:", error);
      } else {
        setNotifications(data || []);
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel(`notificacoes_bell_${user.id}_${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notificacoes',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('[Realtime] Notification received:', payload);
        fetchNotifications();
      })
      .subscribe((status) => {
        console.log('[Realtime] Notification subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.lida).length;
  const filteredNotifications = filter === 'all' ? notifications : notifications.filter(n => !n.lida);

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', id);
      
      if (error) throw error;
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.lida);
    if (unread.length === 0) return;

    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('user_id', user?.id)
        .eq('lida', false);
      
      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'message': return <MessageSquare size={16} className="text-blue-500" />;
      case 'appointment': return <Calendar size={16} className="text-emerald-500" />;
      default: return <Info size={16} className="text-slate-400" />;
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2 text-slate-400 hover:text-blue-400 hover:bg-white/5 rounded-xl transition-all",
          isOpen && "bg-white/5 text-blue-400"
        )}
      >
        <Bell size={20} className={cn(unreadCount > 0 && "animate-swing")} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 bg-slate-900 rounded-3xl shadow-2xl border border-white/10 overflow-hidden z-[50]"
          >
            <div className="p-4 border-b border-white/5 bg-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-white text-sm tracking-tight">Notificações</h4>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-[10px] font-black uppercase text-blue-400 hover:text-blue-300 tracking-widest"
                  >
                    Marcar todas como lidas
                  </button>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                    filter === 'all' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "bg-white/5 text-slate-500 hover:text-slate-300"
                  )}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                    filter === 'unread' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "bg-white/5 text-slate-500 hover:text-slate-300"
                  )}
                >
                  Não lidas ({unreadCount})
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-16 h-16 bg-white/5 text-slate-700 rounded-full flex items-center justify-center mx-auto">
                    <Bell size={32} />
                  </div>
                  <p className="text-xs font-bold text-slate-500">
                    {filter === 'unread' ? "Você não tem notificações não lidas." : "Nenhuma notificação por enquanto."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {filteredNotifications.map((n) => (
                    <div 
                      key={n.id}
                      onClick={() => {
                        if (n.link) {
                          markAsRead(n.id);
                          setIsOpen(false);
                          window.location.href = n.link;
                        }
                      }}
                      className={cn(
                        "p-4 flex gap-3 transition-colors relative group cursor-pointer",
                        !n.lida ? "bg-blue-500/5" : "hover:bg-white/5"
                      )}
                    >
                      <div className="mt-1">{getIcon(n.tipo)}</div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn("text-xs font-bold truncate", !n.lida ? "text-white" : "text-slate-400")}>
                            {n.titulo}
                          </p>
                          <span className="text-[9px] text-slate-500 font-medium whitespace-nowrap">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                          {n.mensagem}
                        </p>
                        {n.link && (
                          <span 
                            className="inline-block text-[10px] font-black text-blue-400 hover:underline uppercase tracking-widest pt-1"
                          >
                            Ver detalhes
                          </span>
                        )}
                      </div>
                      {!n.lida && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                          }}
                          className="absolute right-2 bottom-2 p-1 text-blue-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Marcar como lida"
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 bg-white/5 border-t border-white/5 text-center">
              <Link 
                to="/profile" 
                onClick={() => setIsOpen(false)}
                className="text-[10px] font-black uppercase text-slate-500 hover:text-slate-300 tracking-widest"
              >
                Ver todas as notificações
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
