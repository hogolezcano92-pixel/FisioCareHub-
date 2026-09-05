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
    } catch (err) { console.error('Error marking all as read:', err); return false; }
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
    if (t.includes('marketing') || t.includes('campaign')) return { icon: <Sparkles size={18} />, iconWrap: 'bg-violet-500/12 text-violet-300 ring-1 ring-violet-300/25', label: 'Marketing', accent: 'from-violet-500/18 via-blue-500/8 to-transparent' };
    if (t.includes('appointment') || t.includes('agendamento') || t.includes('consulta')) return { icon: <Calendar size={18} />, iconWrap: 'bg-emerald-500/12 text-emerald-400 ring-1 ring-emerald-400/25', label: 'Agenda', accent: 'from-emerald-500/18 via-cyan-500/8 to-transparent' };
    if (t.includes('payment') || t.includes('pagamento') || t.includes('paid')) return { icon: <CreditCard size={18} />, iconWrap: 'bg-sky-500/12 text-sky-400 ring-1 ring-sky-400/25', label: 'Pagamento', accent: 'from-sky-500/18 via-blue-500/8 to-transparent' };
    if (t.includes('withdrawal') || t.includes('saque') || t.includes('financeiro')) return { icon: <Wallet size={18} />, iconWrap: 'bg-blue-500/12 text-blue-400 ring-1 ring-blue-400/25', label: 'Financeiro', accent: 'from-blue-500/18 via-indigo-500/8 to-transparent' };
    if (t.includes('document') || t.includes('prontuario') || t.includes('prontuário')) return { icon: <FileText size={18} />, iconWrap: 'bg-violet-500/12 text-violet-300 ring-1 ring-violet-300/25', label: 'Documento', accent: 'from-violet-500/18 via-purple-500/8 to-transparent' };
    if (t.includes('exercise') || t.includes('exercicio') || t.includes('exercício')) return { icon: <Activity size={18} />, iconWrap: 'bg-cyan-500/12 text-cyan-300 ring-1 ring-cyan-300/25', label: 'Exercícios', accent: 'from-cyan-500/18 via-blue-500/8 to-transparent' };
    if (t.includes('support') || t.includes('suporte')) return { icon: <MessageSquare size={18} />, iconWrap: 'bg-amber-500/12 text-amber-300 ring-1 ring-amber-300/25', label: 'Suporte', accent: 'from-amber-500/18 via-orange-500/8 to-transparent' };
    if (t.includes('subscription') || t.includes('assinatura') || t.includes('plano')) return { icon: <CreditCard size={18} />, iconWrap: 'bg-purple-500/12 text-purple-300 ring-1 ring-violet-300/25', label: 'Assinatura', accent: 'from-purple-500/18 via-violet-500/8 to-transparent' };
    if (t.includes('profile') || t.includes('patient') || t.includes('paciente')) return { icon: <UserCheck size={18} />, iconWrap: 'bg-indigo-500/12 text-indigo-300 ring-1 ring-indigo-300/25', label: 'Paciente', accent: 'from-indigo-500/18 via-blue-500/8 to-transparent' };
    if (t.includes('alert') || t.includes('error') || t.includes('warning')) return { icon: <AlertCircle size={18} />, iconWrap: 'bg-rose-500/12 text-rose-300 ring-1 ring-rose-300/25', label: 'Alerta', accent: 'from-rose-500/18 via-red-500/8 to-transparent' };
    return { icon: <Info size={18} />, iconWrap: 'bg-slate-500/12 text-slate-300 ring-1 ring-white/15', label: 'Sistema', accent: 'from-slate-500/14 via-white/5 to-transparent' };
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
        /* Base: preserve the existing dark notification appearance. */
        .fch-notification-popover{background:rgba(2,6,23,.96)!important;color:#f8fafc!important;border-color:rgba(255,255,255,.10)!important}
        .fch-notification-popover *{opacity:1}
        /* Light mode: only scope corrections to the notification component. */
        html:not(.dark) .fch-notification-popover{background:#fff!important;color:#0f172a!important;border-color:rgba(203,213,225,.9)!important;box-shadow:0 24px 70px -28px rgba(15,23,42,.35)!important}
        html:not(.dark) .fch-notification-popover .fch-notification-head{background:#fff!important;border-color:#e2e8f0!important}
        html:not(.dark) .fch-notification-popover .fch-notification-list{background:#fff!important;color:#0f172a!important}
        html:not(.dark) .fch-notification-popover .fch-notification-footer{background:#fff!important;border-color:#e2e8f0!important}
        html:not(.dark) .fch-notification-popover .fch-notification-item{background:#fff!important;color:#0f172a!important}
        html:not(.dark) .fch-notification-popover .fch-notification-item:hover{background:#f8fafc!important}
        html:not(.dark) .fch-notification-popover .fch-notification-unread{background:#f8fafc!important}
        html:not(.dark) .fch-notification-popover .fch-light-title{color:#0f172a!important;text-shadow:none!important}
        html:not(.dark) .fch-notification-popover .fch-light-message{color:#475569!important}
        html:not(.dark) .fch-notification-popover .fch-light-muted{color:#64748b!important}
        html:not(.dark) .fch-notification-popover .fch-light-action{color:#2563eb!important}
        html:not(.dark) .fch-notification-popover .fch-light-icon{color:#475569!important}
        html:not(.dark) .fch-notification-popover .fch-light-border{border-color:#e2e8f0!important}
        html:not(.dark) .fch-notification-popover .fch-light-tab-active{background:#eef2ff!important;color:#4338ca!important}
        html:not(.dark) .fch-notification-popover .fch-light-tab{color:#64748b!important}
        html:not(.dark) .fch-notification-popover .fch-light-count{background:#e0e7ff!important;color:#4338ca!important}
        html:not(.dark) .fch-notification-popover .fch-light-close{color:#64748b!important}
        html:not(.dark) .fch-notification-popover .fch-light-close:hover{background:#f1f5f9!important;color:#0f172a!important}
        html:not(.dark) .fch-marketing-modal{color:#0f172a}
      `}</style>

      <button type="button" onClick={() => setIsOpen((v) => !v)} className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white" aria-label="Notificações">
        <Bell size={21} />
        {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: -8, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: .98 }} className="fch-notification-popover absolute right-0 top-12 z-[100] w-[min(92vw,430px)] overflow-hidden rounded-2xl border shadow-2xl">
            <div className="fch-notification-head flex items-center justify-between border-b px-4 py-3">
              <div>
                <h3 className="fch-light-title text-sm font-semibold">Notificações</h3>
                <p className="fch-light-muted mt-0.5 text-xs">{unreadCount ? `${unreadCount} não lida${unreadCount === 1 ? '' : 's'}` : 'Tudo em dia'}</p>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && <button type="button" onClick={markAllAsRead} className="fch-light-action rounded-lg px-2 py-1 text-xs font-medium">Marcar todas</button>}
                <button type="button" onClick={() => setIsOpen(false)} className="fch-light-close rounded-lg p-1.5" aria-label="Fechar"><X size={17} /></button>
              </div>
            </div>
            <div className="fch-notification-list flex items-center gap-1 border-b p-2">
              <button type="button" onClick={() => { setFilter('all'); setShowAll(false); }} className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', filter === 'all' ? 'fch-light-tab-active' : 'fch-light-tab')}>Todas</button>
              <button type="button" onClick={() => { setFilter('unread'); setShowAll(false); }} className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', filter === 'unread' ? 'fch-light-tab-active' : 'fch-light-tab')}>Não lidas</button>
            </div>
            <div className="fch-notification-list max-h-[60vh] overflow-y-auto">
              {visibleNotifications.length === 0 ? (
                <div className="px-5 py-10 text-center"><Bell className="mx-auto mb-3 text-slate-300" size={28} /><p className="fch-light-muted text-sm">Nenhuma notificação.</p></div>
              ) : visibleNotifications.map((notification) => {
                const tone = getNotificationTone(notification.tipo);
                const marketing = isMarketingNotification(notification);
                const link = getNotificationLink(notification);
                return (
                  <div key={notification.id} className={cn('fch-notification-item relative border-b border-white/5 px-4 py-3 transition', !notification.lida && 'fch-notification-unread')}>
                    <button type="button" onClick={() => openNotification(notification)} className="w-full text-left">
                      <div className="flex gap-3">
                        <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', tone.iconWrap)}>{tone.icon}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0"><p className="fch-light-title truncate text-sm font-semibold">{notification.titulo || 'Notificação'}</p><p className="fch-light-muted mt-0.5 text-[11px]">{tone.label} · {formatNotificationTime(notification.created_at)}</p></div>
                            {!notification.lida && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                          </div>
                          <p className="fch-light-message mt-2 line-clamp-2 whitespace-pre-line text-sm leading-relaxed">{notification.mensagem || 'Sem mensagem.'}</p>
                          {marketing && <span className="fch-light-action mt-2 inline-flex items-center gap-1 text-xs font-semibold">Ver detalhes <ExternalLink size={13} /></span>}
                          {!marketing && link && <span className="fch-light-action mt-2 inline-flex items-center gap-1 text-xs font-semibold">Ver detalhes <ExternalLink size={13} /></span>}
                        </div>
                      </div>
                    </button>
                    {notification.tipo && String(notification.tipo).toLowerCase().includes('appointment') && notification.metadata?.action_required && !notification.lida && (
                      <div className="mt-3 flex gap-2 pl-12">
                        <button type="button" onClick={() => handleAction(notification, true)} className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white">Confirmar</button>
                        <button type="button" onClick={() => handleAction(notification, false)} className="flex-1 rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white">Recusar</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {hasMoreNotifications && <button type="button" onClick={() => setShowAll(true)} className="fch-notification-footer w-full border-t px-4 py-3 text-center text-xs font-semibold text-blue-600">Ver todas</button>}
          </motion.div>
        )}
      </AnimatePresence>

      {selectedMarketingNotification && createPortal(
        <AnimatePresence>
          <motion.div className="fch-marketing-modal fixed inset-0 z-[2147483647] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedMarketingNotification(null)}>
            <motion.div initial={{ opacity: 0, y: 20, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: .97 }} onClick={(e) => e.stopPropagation()} className="my-auto w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex max-h-[85vh] flex-col">
                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                  <h3 className="text-lg font-bold text-slate-900">{selectedMarketingNotification.titulo || 'FisioCareHub'}</h3>
                  <button type="button" onClick={() => setSelectedMarketingNotification(null)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Fechar"><X size={19} /></button>
                </div>
                <div className="overflow-y-auto px-5 py-5">
                  {selectedMarketingNotification.metadata?.image_url && <img src={selectedMarketingNotification.metadata.image_url} alt="" className="mb-5 max-h-56 w-full rounded-2xl object-cover" />}
                  <p className="whitespace-pre-line text-sm leading-7 text-slate-700">{selectedMarketingNotification.mensagem || 'Sem mensagem.'}</p>
                </div>
                {getNotificationLink(selectedMarketingNotification) && <div className="border-t border-slate-200 bg-white px-5 py-4"><button type="button" onClick={openMarketingDestination} className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-95">{getMarketingCtaLabel(selectedMarketingNotification)}</button></div>}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
