import { useState, useEffect, useRef } from 'react';
import type React from 'react';
import {
  Bell,
  MessageSquare,
  Calendar,
  Info,
  X,
  Check,
  CheckCheck,
  CreditCard,
  Wallet,
  FileText,
  Activity,
  UserCheck,
  AlertCircle,
  Sparkles,
  Clock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

type NotificationFilter = 'all' | 'unread';

type NotificationTone = {
  icon: React.ReactNode;
  iconWrap: string;
  label: string;
  accent: string;
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [showAll, setShowAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
        console.error('Erro ao buscar notificações:', error);
      } else {
        setNotifications(data || []);
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel(`notificacoes_bell_${user.id}_${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificacoes',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] Notification received:', payload);
          fetchNotifications();
        },
      )
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

  const unreadCount = notifications.filter((n) => !n.lida).length;
  const filteredNotifications = filter === 'all' ? notifications : notifications.filter((n) => !n.lida);
  const visibleNotifications = showAll ? filteredNotifications : filteredNotifications.slice(0, 5);
  const hasMoreNotifications = filteredNotifications.length > visibleNotifications.length;

  const markAsRead = async (id: string) => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
      return true;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      return false;
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.lida);
    if (unread.length === 0 || !user?.id) return false;

    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('user_id', user.id)
        .eq('lida', false);

      if (error) throw error;
      setNotifications((prev) => prev.map((n) => ({ ...n, lida: true })));
      return true;
    } catch (err) {
      console.error('Error marking all as read:', err);
      return false;
    }
  };

  const openNotification = async (notification: any) => {
    await markAsRead(notification.id);
    setIsOpen(false);

    const link = typeof notification.link === 'string' ? notification.link.trim() : '';
    if (!link) return;

    if (link.startsWith('http://') || link.startsWith('https://')) {
      window.location.href = link;
      return;
    }

    navigate(link.startsWith('/') ? link : `/${link}`);
  };

  const getNotificationTone = (tipo?: string): NotificationTone => {
    const normalizedTipo = String(tipo || '').toLowerCase();

    if (normalizedTipo.includes('appointment') || normalizedTipo.includes('agendamento') || normalizedTipo.includes('consulta')) {
      return {
        icon: <Calendar size={18} />,
        iconWrap: 'bg-emerald-500/12 text-emerald-400 ring-1 ring-emerald-400/25',
        label: 'Agenda',
        accent: 'from-emerald-500/18 via-cyan-500/8 to-transparent',
      };
    }

    if (normalizedTipo.includes('payment') || normalizedTipo.includes('pagamento') || normalizedTipo.includes('paid')) {
      return {
        icon: <CreditCard size={18} />,
        iconWrap: 'bg-sky-500/12 text-sky-400 ring-1 ring-sky-400/25',
        label: 'Pagamento',
        accent: 'from-sky-500/18 via-blue-500/8 to-transparent',
      };
    }

    if (normalizedTipo.includes('withdrawal') || normalizedTipo.includes('saque') || normalizedTipo.includes('financeiro')) {
      return {
        icon: <Wallet size={18} />,
        iconWrap: 'bg-blue-500/12 text-blue-400 ring-1 ring-blue-400/25',
        label: 'Financeiro',
        accent: 'from-blue-500/18 via-indigo-500/8 to-transparent',
      };
    }

    if (normalizedTipo.includes('document') || normalizedTipo.includes('prontuario') || normalizedTipo.includes('prontuário')) {
      return {
        icon: <FileText size={18} />,
        iconWrap: 'bg-violet-500/12 text-violet-300 ring-1 ring-violet-300/25',
        label: 'Documento',
        accent: 'from-violet-500/18 via-purple-500/8 to-transparent',
      };
    }

    if (normalizedTipo.includes('exercise') || normalizedTipo.includes('exercicio') || normalizedTipo.includes('exercício')) {
      return {
        icon: <Activity size={18} />,
        iconWrap: 'bg-cyan-500/12 text-cyan-300 ring-1 ring-cyan-300/25',
        label: 'Exercícios',
        accent: 'from-cyan-500/18 via-blue-500/8 to-transparent',
      };
    }

    if (normalizedTipo.includes('support') || normalizedTipo.includes('suporte')) {
      return {
        icon: <MessageSquare size={18} />,
        iconWrap: 'bg-amber-500/12 text-amber-300 ring-1 ring-amber-300/25',
        label: 'Suporte',
        accent: 'from-amber-500/18 via-orange-500/8 to-transparent',
      };
    }


    if (normalizedTipo.includes('video') || normalizedTipo.includes('telehealth') || normalizedTipo.includes('chamada')) {
      return {
        icon: <Activity size={18} />,
        iconWrap: 'bg-fuchsia-500/12 text-fuchsia-300 ring-1 ring-fuchsia-300/25',
        label: 'Teleconsulta',
        accent: 'from-fuchsia-500/18 via-violet-500/8 to-transparent',
      };
    }

    if (normalizedTipo.includes('library') || normalizedTipo.includes('material') || normalizedTipo.includes('biblioteca')) {
      return {
        icon: <FileText size={18} />,
        iconWrap: 'bg-teal-500/12 text-teal-300 ring-1 ring-teal-300/25',
        label: 'Biblioteca',
        accent: 'from-teal-500/18 via-emerald-500/8 to-transparent',
      };
    }

    if (normalizedTipo.includes('subscription') || normalizedTipo.includes('assinatura') || normalizedTipo.includes('plano')) {
      return {
        icon: <CreditCard size={18} />,
        iconWrap: 'bg-purple-500/12 text-purple-300 ring-1 ring-purple-300/25',
        label: 'Assinatura',
        accent: 'from-purple-500/18 via-violet-500/8 to-transparent',
      };
    }

    if (normalizedTipo.includes('approval') || normalizedTipo.includes('aprovacao') || normalizedTipo.includes('aprovação')) {
      return {
        icon: <UserCheck size={18} />,
        iconWrap: 'bg-lime-500/12 text-lime-300 ring-1 ring-lime-300/25',
        label: 'Aprovação',
        accent: 'from-lime-500/18 via-emerald-500/8 to-transparent',
      };
    }

    if (normalizedTipo.includes('profile') || normalizedTipo.includes('patient') || normalizedTipo.includes('paciente')) {
      return {
        icon: <UserCheck size={18} />,
        iconWrap: 'bg-indigo-500/12 text-indigo-300 ring-1 ring-indigo-300/25',
        label: 'Paciente',
        accent: 'from-indigo-500/18 via-blue-500/8 to-transparent',
      };
    }

    if (normalizedTipo.includes('alert') || normalizedTipo.includes('error') || normalizedTipo.includes('warning')) {
      return {
        icon: <AlertCircle size={18} />,
        iconWrap: 'bg-rose-500/12 text-rose-300 ring-1 ring-rose-300/25',
        label: 'Alerta',
        accent: 'from-rose-500/18 via-red-500/8 to-transparent',
      };
    }

    return {
      icon: <Info size={18} />,
      iconWrap: 'bg-slate-500/12 text-slate-300 ring-1 ring-white/15',
      label: 'Sistema',
      accent: 'from-slate-500/14 via-white/5 to-transparent',
    };
  };

  const formatNotificationTime = (dateValue: string) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return time;
    if (isYesterday) return `Ontem · ${time}`;

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  };

  const handleAction = async (notification: any, approved: boolean) => {
    const agendamento_id = notification.metadata?.agendamento_id;
    if (!agendamento_id) return;

    try {
      const finalStatus = approved ? 'confirmado' : 'recusado';
      const { data: updatedApp, error: appError } = await supabase
        .from('agendamentos')
        .update({ status: finalStatus })
        .eq('id', agendamento_id)
        .select(`
          *,
          fisio:fisio_id(nome_completo, especialidade, localizacao, endereco),
          paciente:paciente_id(nome_completo, endereco)
        `)
        .single();

      if (appError) throw appError;

      if (approved && updatedApp) {
        const isHome =
          String(updatedApp.tipo).toLowerCase().includes('domiciliar') ||
          String(updatedApp.servico).toLowerCase().includes('domiciliar');

        let local = updatedApp.fisio?.localizacao || updatedApp.fisio?.endereco || 'Clínica';
        if (isHome) local = updatedApp.paciente?.endereco || 'Seu endereço cadastrado';

        await supabase.from('notificacoes').insert({
          user_id: updatedApp.paciente_id,
          titulo: 'Agendamento Confirmado!',
          mensagem: `Dr(a). ${updatedApp.fisio?.nome_completo}\n${updatedApp.fisio?.especialidade}\n\nServiço: ${updatedApp.servico}\nData: ${new Date(updatedApp.data + 'T00:00:00').toLocaleDateString('pt-BR')} às ${updatedApp.hora.substring(0, 5)}\nLocal: ${local}\nStatus: Confirmado`,
          tipo: 'appointment',
          link: '/appointments',
        });
      } else if (!approved && updatedApp) {
        await supabase.from('suporte_tickets').insert({
          usuario_id: user?.id,
          categoria: 'financeiro',
          assunto: 'Estorno de Agendamento Recusado',
          descricao: `Agendamento #${agendamento_id} foi recusado pelo profissional. Necessário processar estorno para o paciente ${updatedApp.paciente_id}.`,
          status: 'aberto',
        });
      }

      await markAsRead(notification.id);

      const successMsg = approved ? 'Agendamento confirmado!' : 'Agendamento recusado. Solicitando estorno...';
      import('sonner').then(({ toast }) => toast.success(successMsg));
    } catch (err) {
      console.error('Erro ao processar ação de agendamento:', err);
      import('sonner').then(({ toast }) => toast.error('Falha ao processar solicitação.'));
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>

      <style>{`
        .fch-notification-popover {
          background: rgba(2, 6, 23, 0.96) !important;
          color: #f8fafc !important;
          border-color: rgba(255, 255, 255, 0.10) !important;
        }

        .fch-notification-popover * {
          opacity: 1;
        }

        html:not(.dark) .fch-notification-popover,
        :root[data-theme="light"] .fch-notification-popover,
        html.light .fch-notification-popover,
        body.light .fch-notification-popover {
          background: rgba(255, 255, 255, 0.98) !important;
          color: #0f172a !important;
          border-color: rgba(196, 181, 253, 0.86) !important;
          box-shadow: 0 32px 90px -38px rgba(76, 29, 149, 0.50), 0 10px 30px -20px rgba(15, 23, 42, 0.32) !important;
        }

        html:not(.dark) .fch-notification-popover .fch-notification-head,
        :root[data-theme="light"] .fch-notification-popover .fch-notification-head,
        html.light .fch-notification-popover .fch-notification-head,
        body.light .fch-notification-popover .fch-notification-head {
          background: linear-gradient(135deg, #ffffff 0%, #f5f3ff 45%, #eaf4ff 100%) !important;
          border-color: rgba(196, 181, 253, 0.74) !important;
        }

        html:not(.dark) .fch-notification-popover .fch-notification-list,
        :root[data-theme="light"] .fch-notification-popover .fch-notification-list,
        html.light .fch-notification-popover .fch-notification-list,
        body.light .fch-notification-popover .fch-notification-list {
          background: #ffffff !important;
          color: #0f172a !important;
        }

        html:not(.dark) .fch-notification-popover .fch-notification-footer,
        :root[data-theme="light"] .fch-notification-popover .fch-notification-footer,
        html.light .fch-notification-popover .fch-notification-footer,
        body.light .fch-notification-popover .fch-notification-footer {
          background: linear-gradient(180deg, #ffffff, #f8f7ff) !important;
          border-color: rgba(196, 181, 253, 0.74) !important;
        }

        html:not(.dark) .fch-notification-popover .fch-light-title,
        :root[data-theme="light"] .fch-notification-popover .fch-light-title,
        html.light .fch-notification-popover .fch-light-title,
        body.light .fch-notification-popover .fch-light-title {
          color: #0f172a !important;
          text-shadow: none !important;
        }

        html:not(.dark) .fch-notification-popover .fch-light-muted,
        :root[data-theme="light"] .fch-notification-popover .fch-light-muted,
        html.light .fch-notification-popover .fch-light-muted,
        body.light .fch-notification-popover .fch-light-muted {
          color: #475569 !important;
        }

        html:not(.dark) .fch-notification-popover .fch-filter-shell,
        :root[data-theme="light"] .fch-notification-popover .fch-filter-shell,
        html.light .fch-notification-popover .fch-filter-shell,
        body.light .fch-notification-popover .fch-filter-shell {
          background: rgba(255, 255, 255, 0.88) !important;
          border: 1px solid rgba(196, 181, 253, 0.86) !important;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.72), 0 16px 34px -28px rgba(88, 28, 135, 0.45) !important;
        }

        html:not(.dark) .fch-notification-popover .fch-filter-idle,
        :root[data-theme="light"] .fch-notification-popover .fch-filter-idle,
        html.light .fch-notification-popover .fch-filter-idle,
        body.light .fch-notification-popover .fch-filter-idle {
          color: #475569 !important;
          background: rgba(255, 255, 255, 0.72) !important;
          border: 1px solid rgba(221, 214, 254, 0.7) !important;
        }

        html:not(.dark) .fch-notification-popover .fch-filter-active,
        :root[data-theme="light"] .fch-notification-popover .fch-filter-active,
        html.light .fch-notification-popover .fch-filter-active,
        body.light .fch-notification-popover .fch-filter-active {
          color: #ffffff !important;
          background: linear-gradient(90deg, #2563eb 0%, #7c3aed 100%) !important;
          border-color: transparent !important;
          box-shadow: 0 16px 30px -22px rgba(37, 99, 235, 0.75) !important;
        }

        html:not(.dark) .fch-notification-popover .fch-notification-item,
        :root[data-theme="light"] .fch-notification-popover .fch-notification-item,
        html.light .fch-notification-popover .fch-notification-item,
        body.light .fch-notification-popover .fch-notification-item {
          background: #ffffff !important;
          color: #0f172a !important;
        }

        html:not(.dark) .fch-notification-popover .fch-notification-item:hover,
        :root[data-theme="light"] .fch-notification-popover .fch-notification-item:hover,
        html.light .fch-notification-popover .fch-notification-item:hover,
        body.light .fch-notification-popover .fch-notification-item:hover {
          background: #f8f7ff !important;
        }

        html:not(.dark) .fch-notification-popover .fch-notification-unread,
        :root[data-theme="light"] .fch-notification-popover .fch-notification-unread,
        html.light .fch-notification-popover .fch-notification-unread,
        body.light .fch-notification-popover .fch-notification-unread {
          background: linear-gradient(90deg, rgba(37,99,235,0.075), rgba(124,58,237,0.045), #ffffff) !important;
        }

        html:not(.dark) .fch-notification-popover .fch-notification-empty,
        :root[data-theme="light"] .fch-notification-popover .fch-notification-empty,
        html.light .fch-notification-popover .fch-notification-empty,
        body.light .fch-notification-popover .fch-notification-empty {
          background: linear-gradient(180deg, #ffffff 0%, #f8f7ff 100%) !important;
          color: #0f172a !important;
        }

        html:not(.dark) .fch-notification-popover .fch-notification-badge,
        :root[data-theme="light"] .fch-notification-popover .fch-notification-badge,
        html.light .fch-notification-popover .fch-notification-badge,
        body.light .fch-notification-popover .fch-notification-badge {
          background: #eef2ff !important;
          color: #3730a3 !important;
          border: 1px solid rgba(196, 181, 253, 0.85) !important;
        }

        html:not(.dark) .fch-notification-popover .fch-footer-action,
        :root[data-theme="light"] .fch-notification-popover .fch-footer-action,
        html.light .fch-notification-popover .fch-footer-action,
        body.light .fch-notification-popover .fch-footer-action {
          color: #2563eb !important;
        }
      `}</style>
      <button
        type="button"
        aria-label={unreadCount > 0 ? `Notificações, ${unreadCount} não lidas` : 'Notificações'}
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen) setShowAll(false);
        }}
        className={cn(
          'relative grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 shadow-[0_16px_38px_-28px_rgba(15,23,42,0.85)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-blue-400/35 hover:bg-blue-500/10 hover:text-blue-300',
          isOpen && 'border-blue-400/40 bg-blue-500/12 text-blue-300 shadow-blue-950/30',
        )}
      >
        <Bell size={20} className={cn(unreadCount > 0 && 'animate-swing')} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 bg-gradient-to-r from-rose-500 to-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-slate-950 shadow-lg shadow-rose-950/30">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fch-notification-popover fixed left-4 right-4 top-[5.6rem] z-[9999] overflow-hidden rounded-[1.8rem] border border-white/10 shadow-[0_30px_90px_-28px_rgba(0,0,0,0.85)] backdrop-blur-2xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-[24rem]"
          >
            <div className="fch-notification-head relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-4">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(59,130,246,0.20),transparent_35%),radial-gradient(circle_at_88%_0%,rgba(124,58,237,0.18),transparent_32%)]" />

              <div className="relative space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-500/12 text-blue-300 ring-1 ring-blue-300/20">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h4 className="fch-light-title text-base font-black tracking-tight text-white">Notificações</h4>
                      <p className="fch-light-muted text-[11px] font-semibold text-slate-400">
                        {unreadCount > 0 ? `${unreadCount} nova${unreadCount > 1 ? 's' : ''} para revisar` : 'Tudo em dia por aqui'}
                      </p>
                    </div>
                  </div>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-blue-300 hover:bg-blue-500/18"
                    >
                      <CheckCheck size={13} />
                      Lidas
                    </button>
                  )}
                </div>

                <div className="fch-filter-shell grid grid-cols-2 gap-2 rounded-2xl bg-white/[0.04] p-1 ring-1 ring-white/10">
                  <button
                    type="button"
                    onClick={() => { setFilter('all'); setShowAll(false); }}
                    className={cn(
                      'rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition-all',
                      filter === 'all'
                        ? 'fch-filter-active bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-950/30'
                        : 'fch-filter-idle text-slate-400 hover:bg-white/[0.04] hover:text-slate-200',
                    )}
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFilter('unread'); setShowAll(false); }}
                    className={cn(
                      'rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition-all',
                      filter === 'unread'
                        ? 'fch-filter-active bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-950/30'
                        : 'fch-filter-idle text-slate-400 hover:bg-white/[0.04] hover:text-slate-200',
                    )}
                  >
                    Não lidas ({unreadCount})
                  </button>
                </div>
              </div>
            </div>

            <div className="fch-notification-list max-h-[min(62vh,440px)] overflow-y-auto bg-slate-950/92">
              {filteredNotifications.length === 0 ? (
                <div className="fch-notification-empty p-10 text-center">
                  <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-white/[0.04] text-slate-500 ring-1 ring-white/10">
                    <Bell size={30} />
                  </div>
                  <p className="text-sm font-black text-slate-300">
                    {filter === 'unread' ? 'Sem notificações não lidas' : 'Nenhuma notificação por enquanto'}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Novas consultas, mensagens e atualizações aparecem aqui.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.06]">
                  {visibleNotifications.map((n) => {
                    const tone = getNotificationTone(n.tipo);
                    const isUnread = !n.lida;

                    return (
                      <div
                        key={n.id}
                        onClick={() => openNotification(n)}
                        className={cn(
                          'fch-notification-item group relative cursor-pointer overflow-hidden p-4 transition-all hover:bg-white/[0.04]',
                          isUnread && 'fch-notification-unread bg-blue-500/[0.055]',
                        )}
                      >
                        <div className={cn('pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b opacity-0 transition-opacity', tone.accent, isUnread && 'opacity-100')} />
                        <div className="flex gap-3">
                          <div className={cn('mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl', tone.iconWrap)}>
                            {tone.icon}
                          </div>

                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="mb-1 flex items-center gap-2">
                                  <span className="fch-notification-badge rounded-full bg-white/[0.06] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 ring-1 ring-white/10">
                                    {tone.label}
                                  </span>
                                  {isUnread && <span className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_14px_rgba(96,165,250,0.9)]" />}
                                </div>
                                <p className={cn('fch-light-title truncate text-sm font-black tracking-tight', isUnread ? 'text-white' : 'text-slate-300')}>
                                  {n.titulo || 'Nova notificação'}
                                </p>
                              </div>

                              <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold text-slate-500">
                                <Clock size={11} />
                                {formatNotificationTime(n.created_at)}
                              </span>
                            </div>

                            <p className="fch-light-muted line-clamp-3 whitespace-pre-wrap text-[12px] font-medium leading-relaxed text-slate-400">
                              {n.mensagem || 'Abra para ver mais detalhes.'}
                            </p>

                            {n.tipo === 'appointment_request' && isUnread && (
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAction(n, true);
                                  }}
                                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-lg shadow-blue-950/25 transition-all hover:brightness-110"
                                >
                                  <Check size={13} /> Confirmar
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAction(n, false);
                                  }}
                                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300 transition-all hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-300"
                                >
                                  <X size={13} /> Recusar
                                </button>
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-2 pt-1">
                              {n.link ? (
                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300 group-hover:text-blue-200">
                                  Ver detalhes
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
                                  Aviso interno
                                </span>
                              )}

                              {isUnread && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(n.id);
                                  }}
                                  className="rounded-full border border-blue-400/15 bg-blue-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-blue-300 opacity-100 transition-all hover:bg-blue-500/18 sm:opacity-0 sm:group-hover:opacity-100"
                                  title="Marcar como lida"
                                >
                                  Marcar lida
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="fch-notification-footer flex items-center justify-between gap-3 border-t border-white/10 bg-white/[0.04] px-4 py-3">
              <button
                type="button"
                onClick={() => { setFilter('all'); setShowAll(true); }}
                className="fch-footer-action text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 hover:text-slate-200"
              >
                {hasMoreNotifications || !showAll ? 'Mostrar todas' : 'Histórico completo'}
              </button>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-blue-300 hover:text-blue-200"
                >
                  <CheckCheck size={13} /> Marcar lidas
                </button>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400/80">Tudo revisado</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
