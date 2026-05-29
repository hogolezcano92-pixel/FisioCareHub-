import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PhoneOff, Video, Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type VideoCall = {
  id: string;
  caller_id: string;
  receiver_id: string;
  caller_name?: string | null;
  receiver_name?: string | null;
  room_id: string;
  title?: string | null;
  subtitle?: string | null;
  status: 'ringing' | 'accepted' | 'declined' | 'missed' | 'ended';
  created_at: string;
};

export default function IncomingVideoCallListener() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState<VideoCall | null>(null);
  const [busy, setBusy] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const missedTimerRef = useRef<number | null>(null);

  const isCallVisible = useMemo(() => {
    if (!incomingCall || !user) return false;
    return incomingCall.receiver_id === user.id && incomingCall.status === 'ringing';
  }, [incomingCall, user]);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.loop = true;

    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      if (missedTimerRef.current) window.clearTimeout(missedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isCallVisible) {
      audioRef.current?.play().catch(() => {
        // Alguns navegadores bloqueiam som sem interação prévia. O modal continua aparecendo.
      });
    } else {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
    }
  }, [isCallVisible]);

  useEffect(() => {
    if (!isCallVisible || !incomingCall) return;

    if (missedTimerRef.current) window.clearTimeout(missedTimerRef.current);
    missedTimerRef.current = window.setTimeout(async () => {
      const { error } = await supabase
        .from('video_calls')
        .update({ status: 'missed' })
        .eq('id', incomingCall.id)
        .eq('status', 'ringing');

      if (!error) {
        setIncomingCall(null);
      }
    }, 45000);

    return () => {
      if (missedTimerRef.current) window.clearTimeout(missedTimerRef.current);
    };
  }, [isCallVisible, incomingCall]);

  useEffect(() => {
    if (loading || !user) return;

    const fetchPendingCall = async () => {
      const { data, error } = await supabase
        .from('video_calls')
        .select('*')
        .eq('receiver_id', user.id)
        .eq('status', 'ringing')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setIncomingCall(data as VideoCall);
      }
    };

    fetchPendingCall();

    const channel = supabase
      .channel(`incoming_video_calls_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'video_calls',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const call = payload.new as VideoCall;
          if (call.status === 'ringing') {
            setIncomingCall(call);
            toast.info(`${call.caller_name || 'Alguém'} está chamando por vídeo.`);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_calls',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const call = payload.new as VideoCall;
          if (incomingCall?.id === call.id && call.status !== 'ringing') {
            setIncomingCall(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loading, user, incomingCall?.id]);

  const declineCall = async () => {
    if (!incomingCall) return;
    setBusy(true);

    const { error } = await supabase
      .from('video_calls')
      .update({ status: 'declined' })
      .eq('id', incomingCall.id);

    setBusy(false);

    if (error) {
      console.error('[VideoCall] Erro ao recusar chamada:', error);
      toast.error('Não foi possível recusar a chamada.');
      return;
    }

    setIncomingCall(null);
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    setBusy(true);

    const { error } = await supabase
      .from('video_calls')
      .update({ status: 'accepted' })
      .eq('id', incomingCall.id);

    setBusy(false);

    if (error) {
      console.error('[VideoCall] Erro ao atender chamada:', error);
      toast.error('Não foi possível atender a chamada.');
      return;
    }

    const title = incomingCall.title || `Consulta online com ${incomingCall.caller_name || 'paciente'}`;
    const subtitle = incomingCall.subtitle || 'Sala protegida do FisioCareHub';

    setIncomingCall(null);
    navigate(
      `/telehealth?room=${encodeURIComponent(incomingCall.room_id)}&callId=${encodeURIComponent(incomingCall.id)}&title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(subtitle)}&returnTo=${encodeURIComponent('/chat')}`
    );
  };

  return (
    <AnimatePresence>
      {isCallVisible && incomingCall && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xl"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl shadow-blue-950/40"
          >
            <div className="relative p-6 text-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.22),transparent_55%)]" />
              <div className="relative">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-blue-300/20 bg-blue-500/15 text-blue-200 shadow-xl shadow-blue-950/30">
                  <Video size={34} />
                </div>

                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-blue-300">Chamada de vídeo</p>
                <h3 className="text-2xl font-black tracking-tight text-white">{incomingCall.caller_name || 'Alguém'} está chamando</h3>
                <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-400">
                  Atenda para entrar na consulta online protegida pelo FisioCareHub.
                </p>

                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
                  <ShieldCheck size={13} />
                  Tempo real
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-white/10 bg-white/[0.03] p-4">
              <button
                type="button"
                onClick={declineCall}
                disabled={busy}
                className="flex items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-red-300 transition-all hover:bg-red-500/20 disabled:opacity-60"
              >
                {busy ? <Loader2 className="animate-spin" size={16} /> : <PhoneOff size={16} />}
                Recusar
              </button>

              <button
                type="button"
                onClick={acceptCall}
                disabled={busy}
                className="flex items-center justify-center gap-2 rounded-2xl border border-blue-300/20 bg-gradient-to-br from-blue-500 to-violet-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-blue-950/30 transition-all hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
              >
                {busy ? <Loader2 className="animate-spin" size={16} /> : <Video size={16} />}
                Atender
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
