import { useState, useEffect, useRef } from 'react';
import type React from 'react';
import { createPortal } from 'react-dom';
import { Bell, MessageSquare, Calendar, Info, X, Check, CheckCheck, CreditCard, Wallet, FileText, Activity, UserCheck, AlertCircle, Sparkles, Clock, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

type NotificationFilter = 'all' | 'unread';
type NotificationTone = { icon: React.ReactNode; iconWrap: string; label: string; accent: string };

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [showAll, setShowAll] = useState(false);
  const [selectedMarketingNotification, setSelectedMarketingNotification] = useState<any | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('notificacoes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
    if (error) console.error('Erro ao buscar notificações:', error); else setNotifications(data || []);
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const channel = supabase.channel(`notificacoes_bell_${user.id}_${Math.random().toString(36).substring(7)}`).on('postgres_changes', { event: '*', schema: 'public', table: 'notificacoes', filter: `user_id=eq.${user.id}` }, fetchNotifications).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => { if (user && isOpen) fetchNotifications(); }, [isOpen, user]);

  useEffect(() => {
    if (!user) return;
    const refresh = () => { if (document.visibilityState === 'visible') fetchNotifications(); };
    document.addEventListener('visibilitychange', refresh); window.addEventListener('focus', refresh);
    return () => { document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh); };
  }, [user]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside); return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.lida).length;
  const filteredNotifications = filter === 'all' ? notifications : notifications.filter((n) => !n.lida);
  const initialVisibleCount = filter === 'all' ? 8 : 10;
  const visibleNotifications = showAll ? filteredNotifications : filteredNotifications.slice(0, initialVisibleCount);
  const hasMoreNotifications = filteredNotifications.length > visibleNotifications.length;

  const markAsRead = async (id: string) => {
    if (!user?.id) return false;
    try {
      const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('id', id).eq('user_id', user.id);
      if (error) throw error;
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, lida: true } : n)); return true;
    } catch (err) { console.error('Error marking notification as read:', err); return false; }
  };

  const markAllAsRead = async () => {
    if (!user?.id || notifications.every((n) => n.lida)) return false;
    try {
      const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('user_id', user.id).eq('lida', false);
      if (error) throw error;
      setNotifications((prev) => prev.map((n) => ({ ...n, lida: true }))); return true;
    } catch (err) { console.error('Error marking all notifications as read:', err); return false; }
  };

  const getNotificationLink = (notification: any) => {
    const rawLink = [notification?.link, notification?.metadata?.link, notification?.metadata?.url, notification?.url].find((v) => typeof v === 'string' && v.trim());
    if (!rawLink) return '';
    const link = rawLink.trim();
    if (/^https?:\/\/(www\.)?fisiocarehub\.com\.br/i.test(link)) return link.replace(/^https?:\/\/(www\.)?fisiocarehub\.com\.br/i, 'https://www.fisiocarehub.company');
    return link;
  };

  const isMarketingNotification = (notification: any) => {
    const tipo = String(notification?.tipo || '').toLowerCase();
    return tipo.includes('marketing') || tipo.includes('campaign') || notification?.metadata?.source === 'marketing';
  };

  const getMarketingCtaLabel = (notification: any) => {
    const candidates = [notification?.metadata?.cta_label, notification?.metadata?.ctaLabel, notification?.cta_label, notification?.metadata?.button_text, notification?.metadata?.buttonText];
    const label = candidates.find((v) => typeof v === 'string' && v.trim());
    return label?.trim() || 'Saiba mais';
  };

  const openNotification = async (notification: any) => {
    if (isMarketingNotification(notification)) {
      setSelectedMarketingNotification(notification);
      setIsOpen(false);
      return;
    }
    const link = getNotificationLink(notification);
    if (!link) return;
    await markAsRead(notification.id);
    setIsOpen(false);
    if (/^https?:\/\//i.test(link)) window.location.href = link;
    else navigate(link.startsWith('/') ? link : `/${link}`);
  };

  const openMarketingDestination = async () => {
    if (!selectedMarketingNotification) return;
    const notification = selectedMarketingNotification;
    const link = getNotificationLink(notification);
    await markAsRead(notification.id);
    setSelectedMarketingNotification(null);
    if (!link) return;
    if (/^https?:\/\//i.test(link)) window.location.href = link;
    else navigate(link.startsWith('/') ? link : `/${link}`);
  };

  const getNotificationTone = (tipo?: string): NotificationTone => {
    const t = String(tipo || '').toLowerCase();
    if (t.includes('marketing') || t.includes('campaign')) return { icon: <Sparkles size={18} />, iconWrap: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300', label: 'Marketing', accent: 'from-violet-500/18 via-blue-500/8 to-transparent' };
    if (t.includes('appointment') || t.includes('agendamento') || t.includes('consulta')) return { icon: <Calendar size={18} />, iconWrap: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400', label: 'Agenda', accent: 'from-emerald-500/18 via-cyan-500/8 to-transparent' };
    if (t.includes('payment') || t.includes('pagamento') || t.includes('paid')) return { icon: <CreditCard size={18} />, iconWrap: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400', label: 'Pagamento', accent: 'from-sky-500/18 via-blue-500/8 to-transparent' };
    if (t.includes('withdrawal') || t.includes('saque') || t.includes('financeiro')) return { icon: <Wallet size={18} />, iconWrap: 'bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400', label: 'Financeiro', accent: 'from-blue-500/18 via-indigo-500/8 to-transparent' };
    if (t.includes('document') || t.includes('prontuario') || t.includes('prontuário')) return { icon: <FileText size={18} />, iconWrap: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300', label: 'Documento', accent: 'from-violet-500/18 via-purple-500/8 to-transparent' };
    if (t.includes('exercise') || t.includes('exercicio') || t.includes('exercício')) return { icon: <Activity size={18} />, iconWrap: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-300', label: 'Exercícios', accent: 'from-cyan-500/18 via-blue-500/8 to-transparent' };
    if (t.includes('support') || t.includes('suporte')) return { icon: <MessageSquare size={18} />, iconWrap: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400', label: 'Suporte', accent: 'from-amber-500/18 via-orange-500/8 to-transparent' };
    if (t.includes('subscription') || t.includes('assinatura') || t.includes('plano')) return { icon: <CreditCard size={18} />, iconWrap: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300', label: 'Assinatura', accent: 'from-purple-500/18 via-violet-500/8 to-transparent' };
    if (t.includes('profile') || t.includes('patient') || t.includes('paciente')) return { icon: <UserCheck size={18} />, iconWrap: 'bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300', label: 'Paciente', accent: 'from-indigo-500/18 via-blue-500/8 to-transparent' };
    if (t.includes('alert') || t.includes('error') || t.includes('warning')) return { icon: <AlertCircle size={18} />, iconWrap: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300', label: 'Alerta', accent: 'from-rose-500/18 via-red-500/8 to-transparent' };
    return { icon: <Info size={18} />, iconWrap: 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300', label: 'Sistema', accent: 'from-slate-500/14 via-white/5 to-transparent' };
  };

  const formatNotificationTime = (value: string) => {
    const date = new Date(value); if (Number.isNaN(date.getTime())) return '';
    const now = new Date(); const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (date.toDateString() === now.toDateString()) return time;
    if (date.toDateString() === yesterday.toDateString()) return `Ontem · ${time}`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  };

  const handleAction = async (notification: any, approved: boolean) => {
    const agendamento_id = notification.metadata?.agendamento_id; if (!agendamento_id) return;
    try {
      const finalStatus = approved ? 'confirmado' : 'recusado';
      const { data: updatedApp, error } = await supabase.from('agendamentos').update({ status: finalStatus }).eq('id', agendamento_id).select(`*, fisio:fisio_id(nome_completo, especialidade, localizacao, endereco), paciente:paciente_id(nome_completo, endereco)`).single();
      if (error) throw error;
      if (approved && updatedApp) {
        const isHome = String(updatedApp.tipo).toLowerCase().includes('domiciliar') || String(updatedApp.servico).toLowerCase().includes('domiciliar');
        let local = updatedApp.fisio?.localizacao || updatedApp.fisio?.endereco || 'Clínica'; if (isHome) local = updatedApp.paciente?.endereco || 'Seu endereço cadastrado';
        await supabase.from('notificacoes').insert({ user_id: updatedApp.paciente_id, titulo: 'Agendamento Confirmado!', mensagem: `Dr(a). ${updatedApp.fisio?.nome_completo}\n${updatedApp.fisio?.especialidade}\n\nServiço: ${updatedApp.servico}\nData: ${new Date(updatedApp.data + 'T00:00:00').toLocaleDateString('pt-BR')} às ${updatedApp.hora.substring(0, 5)}\nLocal: ${local}\nStatus: Confirmado`, tipo: 'appointment', link: '/appointments' });
      } else if (!approved && updatedApp) {
        await supabase.from('suporte_tickets').insert({ usuario_id: user?.id, categoria: 'financeiro', assunto: 'Estorno de Agendamento Recusado', descricao: `Agendamento #${agendamento_id} foi recusado pelo profissional. Necessário processar estorno para o paciente ${updatedApp.paciente_id}.`, status: 'aberto' });
      }
      await markAsRead(notification.id);
      import('sonner').then(({ toast }) => toast.success(approved ? 'Agendamento confirmado!' : 'Agendamento recusado. Solicitando estorno...'));
    } catch (err) { console.error('Erro ao processar ação de agendamento:', err); import('sonner').then(({ toast }) => toast.error('Falha ao processar solicitação.')); }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <style>{`
        .fch-notification-popover { border-radius: 24px !important; }
        .fch-notification-popover * { opacity: 1 }
        .fch-notification-item { border-radius: 16px !important; margin: 4px 8px; border: 1px solid transparent; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .fch-notification-item:hover { transform: translateY(-1px); }
        
        /* Tema Claro */
        html:not(.dark) .fch-notification-popover { background: rgba(255, 255, 255, 0.98) !important; backdrop-filter: blur(20px); border-color: rgba(226, 232, 240, 0.8) !important; box-shadow: 0 32px 80px -20px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15,23,42,0.02) !important; }
        html:not(.dark) .fch-notification-head { border-color: rgba(241, 245, 249, 1) !important; background: transparent !important; }
        html:not(.dark) .fch-notification-list { background: transparent !important; color: #0f172a !important; }
        html:not(.dark) .fch-notification-footer { border-color: rgba(241, 245, 249, 1) !important; background: transparent !important; }
        html:not(.dark) .fch-notification-item { background: transparent !important; color: #0f172a !important; }
        html:not(.dark) .fch-notification-item:hover { background: #ffffff !important; border-color: #f1f5f9 !important; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 4px 10px -5px rgba(15, 23, 42, 0.02) !important; }
        html:not(.dark) .fch-notification-unread { background: #f8fafc !important; border-color: #f1f5f9 !important; }
        html:not(.dark) .fch-light-title { color: #0f172a !important; text-shadow: none !important; }
        html:not(.dark) .fch-light-message { color: #475569 !important; }
        html:not(.dark) .fch-light-muted { color: #64748b !important; }
        html:not(.dark) .fch-light-action { color: #4f46e5 !important; }
        html:not(.dark) .fch-light-tab-active { background: #eef2ff !important; color: #4338ca !important; }
        html:not(.dark) .fch-light-tab { color: #64748b !important; }
        html:not(.dark) .fch-light-close { color: #64748b !important; }
        html:not(.dark) .fch-light-close:hover { background: #f1f5f9 !important; color: #0f172a !important; }

        /* Tema Escuro - Mantendo Compatibilidade e Aprimorando */
        html.dark .fch-notification-popover { background: rgba(2, 6, 23, 0.96) !important; color: #f8fafc !important; border-color: rgba(255, 255, 255, 0.10) !important; }
        html.dark .fch-notification-item:hover { background: rgba(255, 255, 255, 0.04) !important; border-color: rgba(255, 255, 255, 0.05) !important; }
        html.dark .fch-notification-unread { background: rgba(255, 255, 255, 0.02) !important; border-color: rgba(255, 255, 255, 0.03) !important; }

        .fch-marketing-modal { position: fixed !important; inset: 0 !important; width: 100vw !important; min-width: 100vw !important; height: 100vh !important; height: 100dvh !important; overflow-y: auto !important; display: grid !important; place-items: center !important; padding: 16px !important; }
        .fch-marketing-modal > div { position: relative !important; top: auto !important; left: auto !important; right: auto !important; bottom: auto !important; margin: 0 !important; width: min(100%, 32rem) !important; max-width: 32rem !important; }
        .fch-marketing-modal .fch-marketing-card { border-radius: 32px !important; box-shadow: 0 32px 90px -28px rgba(15, 23, 42, 0.42), 0 0 0 1px rgba(255,255,255,0.45) !important; }
        html:not(.dark) .fch-marketing-modal .fch-marketing-header { position: relative; overflow: hidden; background: linear-gradient(135deg, rgba(239,246,255,0.98), rgba(245,243,255,0.98) 58%, rgba(250,245,255,0.98)) !important; }
        html:not(.dark) .fch-marketing-modal .fch-marketing-header::after { content: ''; position: absolute; width: 170px; height: 170px; right: -70px; top: -90px; border-radius: 999px; background: radial-gradient(circle, rgba(124,58,237,0.18), transparent 68%); pointer-events: none; }
        html:not(.dark) .fch-marketing-modal .fch-marketing-body { background: #ffffff !important; }
        html:not(.dark) .fch-marketing-modal .fch-marketing-footer { background: linear-gradient(180deg, rgba(248,250,252,0.7), rgba(245,243,255,0.72)) !important; }
        html.dark .fch-marketing-modal .fch-marketing-card { box-shadow: 0 32px 90px -28px rgba(0,0,0,0.72), 0 0 0 1px rgba(255,255,255,0.05) !important; }
        html.dark .fch-marketing-modal .fch-marketing-header { position: relative; overflow: hidden; }
        html.dark .fch-marketing-modal .fch-marketing-header::after { content: ''; position: absolute; width: 170px; height: 170px; right: -70px; top: -90px; border-radius: 999px; background: radial-gradient(circle, rgba(124,58,237,0.16), transparent 68%); pointer-events: none; }
      `}</style>

      <button type="button" onClick={() => setIsOpen((v) => !v)} className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700 active:scale-95 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white" aria-label="Notificações">
        <Bell size={21} />
        {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-rose-500 px-1.5 text-[9px] font-bold text-white shadow-sm">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: -12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 25, stiffness: 300 } }} exit={{ opacity: 0, y: -8, scale: 0.98 }} className="fch-notification-popover absolute -right-14 top-12 z-[100] w-[min(92vw,430px)] overflow-hidden border shadow-2xl sm:right-0">
            <div className="fch-notification-head flex items-center justify-between border-b px-5 py-4">
              <div><h3 className="fch-light-title text-[15px] font-bold tracking-tight">Notificações</h3><p className="fch-light-muted mt-0.5 text-xs">{unreadCount ? `${unreadCount} não lida${unreadCount === 1 ? '' : 's'}` : 'Tudo em dia 🎉'}</p></div>
              <div className="flex items-center gap-2">{unreadCount > 0 && <button type="button" onClick={markAllAsRead} className="fch-light-action rounded-xl px-3 py-1.5 text-xs font-semibold transition hover:bg-blue-50/50 dark:hover:bg-blue-500/10">Marcar lidas</button>}<button type="button" onClick={() => setIsOpen(false)} className="fch-light-close rounded-full p-2 transition" aria-label="Fechar"><X size={18} /></button></div>
            </div>
            <div className="fch-notification-list flex items-center gap-2 border-b px-4 py-3">
              <button type="button" onClick={() => { setFilter('all'); setShowAll(false); }} className={cn('rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors', filter === 'all' ? 'fch-light-tab-active bg-indigo-500/10 text-indigo-400' : 'fch-light-tab hover:bg-slate-50 dark:hover:bg-white/5')}>Todas</button>
              <button type="button" onClick={() => { setFilter('unread'); setShowAll(false); }} className={cn('rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors', filter === 'unread' ? 'fch-light-tab-active bg-indigo-500/10 text-indigo-400' : 'fch-light-tab hover:bg-slate-50 dark:hover:bg-white/5')}>Não lidas</button>
            </div>
            <div className="fch-notification-list max-h-[55vh] overflow-y-auto py-2">
              {visibleNotifications.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-white/5"><Bell className="text-slate-300 dark:text-slate-600" size={28} /></div>
                  <p className="fch-light-muted text-[15px] font-medium">Nenhuma notificação por aqui.</p>
                </div>
              ) : visibleNotifications.map((notification, index) => {
                const tone = getNotificationTone(notification.tipo); const marketing = isMarketingNotification(notification); const link = getNotificationLink(notification);
                return (
                  <motion.div key={notification.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: index * 0.03 }} className={cn('fch-notification-item relative px-4 py-3.5', !notification.lida && 'fch-notification-unread')}>
                    <button type="button" onClick={() => openNotification(notification)} className="w-full text-left">
                      <div className="flex gap-4">
                        <div className={cn('mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-sm', tone.iconWrap)}>{tone.icon}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="fch-light-title truncate text-[14px] font-bold">{notification.titulo || 'Notificação'}</p>
                              <p className="fch-light-muted mt-0.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide opacity-80">{tone.label} <span className="h-1 w-1 rounded-full bg-current opacity-40"></span> {formatNotificationTime(notification.created_at)}</p>
                            </div>
                            {!notification.lida && (
                              <div className="relative mt-1 flex h-2.5 w-2.5 shrink-0 items-center justify-center">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-60"></span>
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-600 dark:bg-violet-400"></span>
                              </div>
                            )}
                          </div>
                          <p className="fch-light-message mt-2 line-clamp-2 whitespace-pre-line text-[13px] leading-relaxed opacity-90">{notification.mensagem || 'Sem mensagem.'}</p>
                          {(marketing || link) && <span className="fch-light-action mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold transition-transform group-hover:translate-x-0.5">Ver detalhes <ExternalLink size={14} /></span>}
                        </div>
                      </div>
                    </button>
                    {notification.tipo && String(notification.tipo).toLowerCase().includes('appointment') && notification.metadata?.action_required && !notification.lida && (
                      <div className="mt-4 flex gap-2 pl-[60px]">
                        <button type="button" onClick={() => handleAction(notification, true)} className="flex-1 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500/25">Confirmar</button>
                        <button type="button" onClick={() => handleAction(notification, false)} className="flex-1 rounded-xl bg-red-500/10 px-3 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-500/20 dark:bg-red-500/15 dark:text-red-400 dark:hover:bg-red-500/25">Recusar</button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
            {hasMoreNotifications && <button type="button" onClick={() => setShowAll(true)} className="fch-notification-footer w-full border-t px-4 py-3.5 text-center text-[13px] font-bold text-indigo-600 transition hover:bg-slate-50 dark:text-indigo-400 dark:hover:bg-white/5">Ver todas as notificações</button>}
          </motion.div>
        )}
      </AnimatePresence>

      {selectedMarketingNotification && createPortal(
        <AnimatePresence>
          <motion.div className="fch-marketing-modal z-[2147483647] bg-slate-950/60 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedMarketingNotification(null)}>
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 25, stiffness: 300 } }} exit={{ opacity: 0, y: 20, scale: 0.96 }} onClick={(e) => e.stopPropagation()} className="fch-marketing-card overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">
              <div className="flex max-h-[85vh] flex-col">
                <div className="fch-marketing-header relative flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-blue-50/80 to-violet-50/80 px-6 py-5 dark:border-slate-800 dark:from-blue-950/40 dark:to-violet-950/40">
                  <div className="relative z-10 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-violet-500/20 ring-4 ring-white/60 dark:ring-white/5">
                      <Sparkles size={17} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">FisioCareHub</span>
                      <h3 className="mt-0.5 truncate text-[17px] font-bold tracking-tight text-slate-900 dark:text-white">{selectedMarketingNotification.titulo || 'FisioCareHub'}</h3>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSelectedMarketingNotification(null)} className="relative z-10 rounded-full bg-white/70 p-2 text-slate-500 shadow-sm ring-1 ring-slate-900/5 transition-all hover:scale-105 hover:bg-white hover:text-slate-900 dark:bg-white/10 dark:text-slate-400 dark:ring-white/5 dark:hover:bg-white/20 dark:hover:text-white" aria-label="Fechar"><X size={18} /></button>
                </div>
                <div className="fch-marketing-body overflow-y-auto px-6 py-7">
                  {selectedMarketingNotification.metadata?.image_url && <img src={selectedMarketingNotification.metadata.image_url} alt="" className="mb-6 max-h-60 w-full rounded-[22px] object-cover shadow-md ring-1 ring-slate-900/5 dark:ring-white/10" />}
                  <p className="whitespace-pre-line text-[15px] leading-7 text-slate-700 dark:text-slate-300">{selectedMarketingNotification.mensagem || 'Sem mensagem.'}</p>
                </div>
                {getNotificationLink(selectedMarketingNotification) && (
                  <div className="fch-marketing-footer border-t border-slate-100 bg-slate-50/50 px-6 py-5 dark:border-slate-800 dark:bg-slate-900/50">
                    <button type="button" onClick={openMarketingDestination} className="group flex w-full items-center justify-center gap-2 rounded-[18px] bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-5 py-3.5 text-[15px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(79,70,229,0.55)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-8px_rgba(79,70,229,0.62)] active:translate-y-0">
                      {getMarketingCtaLabel(selectedMarketingNotification)}
                      <ExternalLink size={15} className="transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
