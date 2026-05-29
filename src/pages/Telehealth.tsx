import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  PhoneOff,
  ShieldCheck,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

export default function Telehealth() {
  const location = useLocation();
  const navigate = useNavigate();

  const [room, setRoom] = useState('');
  const [callId, setCallId] = useState<string | null>(null);
  const [title, setTitle] = useState('Teleconsulta FisioCareHub');
  const [subtitle, setSubtitle] = useState('Sala protegida do FisioCareHub');
  const [returnTo, setReturnTo] = useState('/chat');
  const [loading, setLoading] = useState(true);
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    const roomName = params.get('room') || 'FisioCareHub-Geral';
    const call = params.get('callId');
    const friendlyTitle = params.get('title') || 'Teleconsulta FisioCareHub';
    const friendlySubtitle = params.get('subtitle') || 'Sala protegida do FisioCareHub';
    const backRoute = params.get('returnTo') || '/chat';

    setRoom(roomName);
    setCallId(call);
    setTitle(friendlyTitle);
    setSubtitle(friendlySubtitle);
    setReturnTo(backRoute);

    const timer = window.setTimeout(() => {
      setLoading(false);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [location.search]);

  const safeRoom = useMemo(() => {
    const normalized = room
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 90);

    return normalized || 'FisioCareHub-Geral';
  }, [room]);

  const jitsiUrl = useMemo(() => {
    const config = [
      'prejoinPageEnabled=false',
      'startWithAudioMuted=false',
      'startWithVideoMuted=false',
      'disableDeepLinking=true',
    ].join('&config.');

    const interfaceConfig = [
      'SHOW_JITSI_WATERMARK=false',
      'SHOW_WATERMARK_FOR_GUESTS=false',
      'MOBILE_APP_PROMO=false',
      'HIDE_INVITE_MORE_HEADER=true',
    ].join('&interfaceConfig.');

    return `https://meet.jit.si/${safeRoom}#config.${config}&interfaceConfig.${interfaceConfig}`;
  }, [safeRoom]);

  const handleJoin = async () => {
    setIsJoined(true);

    if (callId) {
      const { error } = await supabase
        .from('video_calls')
        .update({ status: 'accepted' })
        .eq('id', callId);

      if (error) {
        console.warn('[VideoCall] Não foi possível marcar a chamada como aceita:', error);
      }
    }

    toast.success('Abrindo câmera e microfone...');
  };

  const handleLeave = async () => {
    if (callId) {
      const { error } = await supabase
        .from('video_calls')
        .update({ status: 'ended' })
        .eq('id', callId);

      if (error) {
        console.warn('[VideoCall] Não foi possível finalizar o registro da chamada:', error);
      }
    }

    toast.info('Atendimento encerrado.');
    navigate(returnTo);
  };

  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 bg-blue-500/10 rounded-3xl flex items-center justify-center animate-pulse border border-blue-500/20">
          <Video className="text-blue-400" size={32} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-blue-500" size={24} />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
            Preparando sala segura...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden relative">
      <header className="px-4 md:px-6 py-3 md:py-4 bg-slate-900/85 backdrop-blur-xl border-b border-white/10 flex items-center justify-between z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(returnTo)}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-2xl hover:bg-white/10"
            aria-label="Voltar ao chat"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="min-w-0">
            <h2 className="text-xs md:text-sm font-black text-white tracking-tight flex items-center gap-2 truncate">
              <span className="truncate">{title}</span>
              <span className="hidden sm:flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-400/15">
                <ShieldCheck size={10} className="text-emerald-400" />
                <span className="text-[7px] text-emerald-400 font-black uppercase tracking-widest">Protegido</span>
              </span>
            </h2>
            <p className="text-[8px] md:text-[9px] text-slate-500 uppercase font-bold tracking-widest mt-0.5 truncate">
              {subtitle}
            </p>
          </div>
        </div>

        <button
          onClick={handleLeave}
          className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest border border-red-400/20 flex items-center gap-2"
        >
          <PhoneOff size={16} />
          <span className="hidden sm:inline">Encerrar</span>
        </button>
      </header>

      <main className="flex-1 relative bg-slate-950 overflow-hidden">
        {!isJoined ? (
          <div className="h-full flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="max-w-md w-full rounded-[2.25rem] border border-white/10 bg-slate-900/80 p-7 md:p-9 text-center shadow-2xl shadow-blue-950/30 backdrop-blur-xl"
            >
              <div className="relative mx-auto mb-7 flex h-28 w-28 items-center justify-center rounded-[2rem] border border-blue-300/20 bg-blue-500/15 text-blue-200 shadow-xl shadow-blue-950/30">
                <div className="absolute inset-0 rounded-[2rem] bg-blue-400/20 animate-ping opacity-20" />
                <Video size={44} className="relative" />
              </div>

              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-blue-300">
                Sala de vídeo
              </p>
              <h3 className="text-2xl font-black text-white tracking-tight">
                Pronto para entrar?
              </h3>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-400">
                Ao entrar, o navegador vai pedir permissão para usar câmera e microfone. Os dois participantes entram na mesma sala protegida.
              </p>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sala</p>
                <p className="mt-1 break-all text-xs font-bold text-slate-300">{safeRoom}</p>
              </div>

              <button
                onClick={handleJoin}
                className="mt-7 w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-900/40 transition-all flex items-center justify-center gap-2"
              >
                <Video size={18} />
                Entrar na videochamada
              </button>

              <button
                onClick={() => navigate(returnTo)}
                className="mt-3 w-full py-3 text-slate-400 hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
              >
                Voltar ao chat
              </button>
            </motion.div>
          </div>
        ) : (
          <div className="h-full w-full bg-slate-950">
            <iframe
              title="Videochamada FisioCareHub"
              src={jitsiUrl}
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              className="h-full w-full border-0"
            />
          </div>
        )}
      </main>

      {isJoined && (
        <footer className="bg-slate-900/90 backdrop-blur-xl border-t border-white/10 px-4 py-3 flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(returnTo)}
            className="h-11 px-4 rounded-2xl bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest"
          >
            <MessageSquare size={16} />
            Chat
          </button>

          <button
            onClick={handleLeave}
            className="h-11 px-5 rounded-2xl bg-red-600 text-white border border-red-400/20 hover:bg-red-700 transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest shadow-xl shadow-red-950/30"
          >
            <PhoneOff size={18} />
            Encerrar
          </button>
        </footer>
      )}
    </div>
  );
}
