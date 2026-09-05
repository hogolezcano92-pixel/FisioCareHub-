import { useState, useEffect, useRef } from 'react';
import type React from 'react';
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
    if (error) console.error('Erro ao buscar notificações:', error);
    else setNotifications(data || []);
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const channel = supabase.channel(`notificacoes_bell_${user.id}_${Math.random().toString(36).substring(7)}`).on('postgres_changes', { event: '*', schema: 'public', table: 'notificacoes', filter: `user_id=eq.${user.id}` }, fetchNotifications).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (!user || !isOpen) return;
    fetchNotifications();
  }, [isOpen, user]);

  useEffect(() => {
    if (!user) return;
    const refresh = () => { if (document.visibilityState === 'visible') fetchNotifications(); };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => { document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh); };
  }, [user]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
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
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, lida: true } : n));
      return true;
    } catch (err) { console.error('Error marking notification as read:', err); return false; }
  };

  const markAllAsRead = async () => {
    if (!user?.id || notifications.every((n) => n.lida)) return false;
    try {
      const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('user_id', user.id).eq('lida', false);
      if (error) throw error;
      setNotifications((prev) => prev.map((n) => ({ ...n, lida: true })));
      return true;
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
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (date.toDateString() === now.toDateString()) return time;
    if (date.toDateString() === yesterday.toDateString()) return `Ontem · ${time}`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  };

  const handleAction = async (notification: any, approved: boolean) => {
    const agendamento_id = notification.metadata?.agendamento_id;
    if (!agendamento_id) return;
    try {
      const finalStatus = approved ? 'confirmado' : 'recusado';
      const { data: updatedApp, error } = await supabase.from('agendamentos').update({ status: finalStatus }).eq('id', agendamento_id).select(`*, fisio:fisio_id(nome_completo, especialidade, localizacao, endereco), paciente:paciente_id(nome_completo, endereco)`).single();
      if (error) throw error;
      if (approved && updatedApp) {
        const isHome = String(updatedApp.tipo).toLowerCase().includes('domiciliar') || String(updatedApp.servico).toLowerCase().includes('domiciliar');
        let local = updatedApp.fisio?.localizacao || updatedApp.fisio?.endereco || 'Clínica';
        if (isHome) local = updatedApp.paciente?.endereco || 'Seu endereço cadastrado';
        await supabase.from('notificacoes').insert({ user_id: updatedApp.paciente_id, titulo: 'Agendamento Confirmado!', mensagem: `Dr(a). ${updatedApp.fisio?.nome_completo}\n${updatedApp.fisio?.especialidade}\n\nServiço: ${updatedApp.servico}\nData: ${new Date(updatedApp.data + 'T00:00:00').toLocaleDateString('pt-BR')} às ${updatedApp.hora.substring(0, 5)}\nLocal: ${local}\nStatus: Confirmado`, tipo: 'appointment', link: '/appointments' });
      } else if (!approved && updatedApp) {
        await supabase.from('suporte_tickets').insert({ usuario_id: user?.id, categoria: 'financeiro', assunto: 'Estorno de Agendamento Recusado', descricao: `Agendamento #${agendamento_id} foi recusado pelo profissional. Necessário processar estorno para o paciente ${updatedApp.paciente_id}.`, status: 'aberto' });
      }
      await markAsRead(notification.id);
      import('sonner').then(({ toast }) => toast.success(approved ? 'Agendamento confirmado!' : 'Agendamento recusado. Solicitando estorno...'));
    } catch (err) {
      console.error('Erro ao processar ação de agendamento:', err);
      import('sonner').then(({ toast }) => toast.error('Falha ao processar solicitação.'));
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <style>{`
        .fch-notification-popover{background:rgba(2,6,23,.96)!important;color:#f8fafc!important;border-color:rgba(255,255,255,.10)!important}
        .fch-notification-popover *{opacity:1}
        html:not(.dark) .fch-notification-popover,html.light .fch-notification-popover,body.light .fch-notification-popover{background:rgba(255,255,255,.98)!important;color:#0f172a!important;border-color:rgba(196,181,253,.86)!important;box-shadow:0 32px 90px -38px rgba(76,29,149,.50),0 10px 30px -20px rgba(15,23,42,.32)!important}
        html:not(.dark) .fch-notification-popover .fch-notification-head,html.light .fch-notification-popover .fch-notification-head,body.light .fch-notification-popover .fch-notification-head{background:linear-gradient(135deg,#fff 0%,#f5f3ff 45%,#eaf4ff 100%)!important;border-color:rgba(196,181,253,.74)!important}
        html:not(.dark) .fch-notification-popover .fch-notification-list,html.light .fch-notification-popover .fch-notification-list,body.light .fch-notification-popover .fch-notification-list{background:#fff!important;color:#0f172a!important}
        html:not(.dark) .fch-notification-popover .fch-notification-footer,html.light .fch-notification-popover .fch-notification-footer,body.light .fch-notification-popover .fch-notification-footer{background:linear-gradient(180deg,#fff,#f8f7ff)!important;border-color:rgba(196,181,253,.74)!important}
        html:not(.dark) .fch-notification-popover .fch-notification-item,html.light .fch-notification-popover .fch-notification-item,body.light .fch-notification-popover .fch-notification-item{background:#fff!important;color:#0f172a!important}
        html:not(.dark) .fch-notification-popover .fch-notification-item:hover,html.light .fch-notification-popover .fch-notification-item:hover,body.light .fch-notification-popover .fch-notification-item:hover{background:#f8f7ff!important}
        html:not(.dark) .fch-notification-popover .fch-notification-unread,html.light .fch-notification-popover .fch-notification-unread,body.light .fch-notification-popover .fch-notification-unread{background:linear-gradient(90deg,rgba(37,99,235,.075),rgba(124,58,237,.045),#fff)!important}
        html:not(.dark) .fch-notification-popover .fch-light-title,html.light .fch-notification-popover .fch-light-title,body.light .fch-notification-popover .fch-light-title{color:#0f172a!important;text-shadow:none!important}
        html:not(.dark) .fch-notification-popover .fch-light-muted,html.light .fch-notification-popover .fch-light-muted,body.light .fch-notification-popover .fch-light-muted{color:#475569!important}
      `}</style>
      <button type="button" aria-label={unreadCount > 0 ? `Notificações, ${unreadCount} não lidas` : 'Notificações'} onClick={() => { setIsOpen(!isOpen); if (isOpen) setShowAll(false); }} className={cn('relative grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 shadow-[0_16px_38px_-28px_rgba(15,23,42,0.85)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-blue-400/35 hover:bg-blue-500/10 hover:text-blue-300', isOpen && 'border-blue-400/40 bg-blue-500/12 text-blue-300 shadow-blue-950/30')}>
        <Bell size={20} className={cn(unreadCount > 0 && 'animate-swing')} />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 bg-gradient-to-r from-rose-500 to-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-slate-950 shadow-lg shadow-rose-950/30">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      <AnimatePresence>
        {isOpen && <motion.div initial={{ opacity: 0, y: 12, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .96 }} transition={{ duration: .18, ease: 'easeOut' }} className="fch-notification-popover fixed left-4 right-4 top-[5.6rem] z-[9999] overflow-hidden rounded-[1.8rem] border border-white/10 shadow-[0_30px_90px_-28px_rgba(0,0,0,.85)] backdrop-blur-2xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-[24rem]">
          <div className="fch-notification-head relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(59,130,246,.20),transparent_35%),radial-gradient(circle_at_88%_0%,rgba(124,58,237,.18),transparent_32%)]" />
            <div className="relative space-y-4">
              <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-500/12 text-blue-300 ring-1 ring-blue-300/20"><Sparkles size={18}/></div><div><h4 className="fch-light-title text-base font-black tracking-tight text-white">Notificações</h4><p className="fch-light-muted text-[11px] font-semibold text-slate-400">{unreadCount > 0 ? `${unreadCount} nova${unreadCount > 1 ? 's' : ''} para revisar` : notifications.length > 0 ? `${notifications.length} no histórico` : 'Tudo em dia por aqui'}</p></div></div>{unreadCount > 0 && <button type="button" onClick={markAllAsRead} className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-blue-300"><CheckCheck size={13}/>Lidas</button>}</div>
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/[.04] p-1 ring-1 ring-white/10"><button type="button" onClick={() => {setFilter('all');setShowAll(false)}} className={cn('rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-[.16em]', filter==='all'?'bg-gradient-to-r from-blue-600 to-violet-600 text-white':'text-slate-400')}>Todas</button><button type="button" onClick={() => {setFilter('unread');setShowAll(false)}} className={cn('rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-[.16em]', filter==='unread'?'bg-gradient-to-r from-blue-600 to-violet-600 text-white':'text-slate-400')}>Não lidas ({unreadCount})</button></div>
            </div>
          </div>
          <div className="fch-notification-list max-h-[min(62vh,440px)] overflow-y-auto bg-slate-950/92">
            {filteredNotifications.length === 0 ? <div className="p-10 text-center"><div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-white/[.04] text-slate-500 ring-1 ring-white/10"><Bell size={30}/></div><p className="text-sm font-black text-slate-300">{filter==='unread'?'Sem notificações não lidas':'Nenhuma notificação por enquanto'}</p></div> : <div className="divide-y divide-white/[.06]">{visibleNotifications.map((n) => {
              const tone=getNotificationTone(n.tipo); const isUnread=!n.lida; const notificationLink=getNotificationLink(n); const marketing=isMarketingNotification(n);
              return <div key={n.id} onClick={() => openNotification(n)} className={cn('fch-notification-item group relative cursor-pointer overflow-hidden p-4 transition-all hover:bg-white/[.04]',isUnread&&'fch-notification-unread bg-blue-500/[.055]')}>
                <div className={cn('pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b opacity-0 transition-opacity',tone.accent,isUnread&&'opacity-100')}/>
                <div className="flex gap-3"><div className={cn('mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl',tone.iconWrap)}>{tone.icon}</div><div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="mb-1 flex items-center gap-2"><span className="rounded-full bg-white/[.06] px-2 py-0.5 text-[9px] font-black uppercase tracking-[.16em] text-slate-400 ring-1 ring-white/10">{tone.label}</span>{isUnread&&<span className="h-2 w-2 rounded-full bg-blue-400"/>}</div><p className={cn('fch-light-title truncate text-sm font-black tracking-tight',isUnread?'text-white':'text-slate-300')}>{n.titulo||'Nova notificação'}</p></div><span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold text-slate-500"><Clock size={11}/>{formatNotificationTime(n.created_at)}</span></div>
                  <p className="fch-light-muted line-clamp-3 whitespace-pre-wrap text-[12px] font-medium leading-relaxed text-slate-400">{n.mensagem||'Abra para ver mais detalhes.'}</p>
                  {n.tipo==='appointment_request'&&isUnread&&<div className="grid grid-cols-2 gap-2 pt-1"><button type="button" onClick={(e)=>{e.stopPropagation();handleAction(n,true)}} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-3 py-2 text-[10px] font-black uppercase tracking-[.12em] text-white"><Check size={13}/>Confirmar</button><button type="button" onClick={(e)=>{e.stopPropagation();handleAction(n,false)}} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-[10px] font-black uppercase tracking-[.12em] text-slate-300"><X size={13}/>Recusar</button></div>}
                  <div className="flex items-center justify-between gap-2 pt-1">{notificationLink?<span className="text-[10px] font-black uppercase tracking-[.18em] text-blue-300">{marketing?'Abrir campanha':'Ver detalhes'}</span>:<span className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-600">Aviso interno</span>}{isUnread&&<button type="button" onClick={(e)=>{e.stopPropagation();markAsRead(n.id)}} className="rounded-full border border-blue-400/15 bg-blue-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.14em] text-blue-300 sm:opacity-0 sm:group-hover:opacity-100">Marcar lida</button>}</div>
                </div></div>
              </div>;
            })}</div>}
          </div>
          <div className="fch-notification-footer flex items-center justify-between gap-3 border-t border-white/10 bg-white/[.04] px-4 py-3"><button type="button" onClick={()=>{setFilter('all');setShowAll(true)}} className="text-[10px] font-black uppercase tracking-[.18em] text-blue-300">{hasMoreNotifications||!showAll?`Mostrar todas (${filteredNotifications.length})`:'Histórico completo'}</button>{unreadCount>0?<button type="button" onClick={markAllAsRead} className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.18em] text-blue-300"><CheckCheck size={13}/>Marcar lidas</button>:<span className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-400/80">{notifications.length>0?`${notifications.length} salvas`:'Tudo revisado'}</span>}</div>
        </motion.div>}
      </AnimatePresence>

      <AnimatePresence>
        {selectedMarketingNotification && (() => {
          const notification = selectedMarketingNotification;
          const tone = getNotificationTone(notification.tipo);
          const link = getNotificationLink(notification);
          const ctaLabel = getMarketingCtaLabel(notification);
          const image = [notification?.metadata?.image_url, notification?.metadata?.imageUrl, notification?.metadata?.banner_url, notification?.metadata?.bannerUrl].find((v) => typeof v === 'string' && v.trim());
          return <motion.div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={(e)=>{if(e.target===e.currentTarget)setSelectedMarketingNotification(null)}}>
            <motion.div initial={{opacity:0,y:18,scale:.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:18,scale:.97}} transition={{duration:.18}} className="w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950 text-white shadow-[0_35px_100px_-25px_rgba(0,0,0,.85)]">
              {image && <img src={image} alt="" className="h-44 w-full object-cover" onError={(e)=>{e.currentTarget.style.display='none'}}/>}
              <div className="p-5 sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-4"><div className="flex items-center gap-3"><div className={cn('grid h-11 w-11 place-items-center rounded-2xl',tone.iconWrap)}>{tone.icon}</div><div><span className="text-[10px] font-black uppercase tracking-[.18em] text-violet-300">Marketing</span><p className="mt-1 text-xs font-semibold text-slate-500">FisioCareHub</p></div></div><button type="button" aria-label="Fechar" onClick={()=>setSelectedMarketingNotification(null)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[.04] text-slate-400 hover:text-white"><X size={17}/></button></div>
                <h3 className="text-xl font-black tracking-tight text-white sm:text-2xl">{notification.titulo||'Nova campanha'}</h3>
                <p className="mt-4 whitespace-pre-wrap text-sm font-medium leading-7 text-slate-300">{notification.mensagem||''}</p>
                {link && <button type="button" onClick={openMarketingDestination} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3.5 text-xs font-black uppercase tracking-[.15em] text-white shadow-lg shadow-blue-950/30 transition hover:brightness-110"><ExternalLink size={15}/>{ctaLabel}</button>}
                {!link && <button type="button" onClick={()=>setSelectedMarketingNotification(null)} className="mt-6 w-full rounded-2xl border border-white/10 bg-white/[.04] px-5 py-3.5 text-xs font-black uppercase tracking-[.15em] text-slate-300">Fechar</button>}
              </div>
            </motion.div>
          </motion.div>;
        })()}
      </AnimatePresence>
    </div>
  );
}
