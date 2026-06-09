import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Volume2, VolumeX, X, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

interface WelcomeVideoModalProps {
  userId?: string | null;
  userRole?: string | null;
  videoSrc?: string;
}

const DEFAULT_VIDEO_SRC = '/onboarding/fisiocarehub-welcome.mp4';

const getStorageKey = (userId?: string | null) =>
  userId ? `fisiocarehub_welcome_video_seen_${userId}` : 'fisiocarehub_welcome_video_seen_guest';

export default function WelcomeVideoModal({
  userId,
  userRole,
  videoSrc = DEFAULT_VIDEO_SRC,
}: WelcomeVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasTriedAutoplay, setHasTriedAutoplay] = useState(false);
  const [needsSoundTap, setNeedsSoundTap] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const storageKey = useMemo(() => getStorageKey(userId), [userId]);
  const normalizedRole = String(userRole || '').toLowerCase();
  const shouldShowForRole = normalizedRole === 'paciente' || normalizedRole === 'fisioterapeuta';

  useEffect(() => {
    if (!userId || !shouldShowForRole) return;

    try {
      const alreadySeen = localStorage.getItem(storageKey);
      if (!alreadySeen) {
        const timer = window.setTimeout(() => setIsVisible(true), 600);
        return () => window.clearTimeout(timer);
      }
    } catch {
      setIsVisible(true);
    }
  }, [storageKey, shouldShowForRole, userId]);

  useEffect(() => {
    if (!isVisible || hasTriedAutoplay) return;

    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    const tryPlayWithSound = async () => {
      setHasTriedAutoplay(true);

      try {
        video.muted = false;
        video.volume = 1;
        await video.play();

        if (cancelled) return;
        setIsMuted(false);
        setIsPlaying(true);
        setNeedsSoundTap(false);
      } catch (soundError) {
        console.warn('[WelcomeVideoModal] Autoplay com som bloqueado. Tentando iniciar sem som.', soundError);

        try {
          video.muted = true;
          await video.play();

          if (cancelled) return;
          setIsMuted(true);
          setIsPlaying(true);
          setNeedsSoundTap(true);
        } catch (mutedError) {
          console.warn('[WelcomeVideoModal] Autoplay mutado também foi bloqueado.', mutedError);

          if (cancelled) return;
          setIsMuted(true);
          setIsPlaying(false);
          setNeedsSoundTap(true);
        }
      }
    };

    tryPlayWithSound();

    return () => {
      cancelled = true;
    };
  }, [hasTriedAutoplay, isVisible]);

  const markAsSeenAndClose = () => {
    try {
      localStorage.setItem(storageKey, 'true');
    } catch {}

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }

    setIsVisible(false);
  };

  const handleEnableSound = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      video.muted = false;
      video.volume = 1;
      await video.play();

      setIsMuted(false);
      setIsPlaying(true);
      setNeedsSoundTap(false);
    } catch (error) {
      console.warn('[WelcomeVideoModal] Não foi possível ativar o som.', error);
      setNeedsSoundTap(true);
    }
  };

  const handlePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      video.muted = isMuted;
      await video.play();
      setIsPlaying(true);
    } catch (error) {
      console.warn('[WelcomeVideoModal] Não foi possível iniciar o vídeo.', error);
      setNeedsSoundTap(true);
    }
  };

  if (!isVisible) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100000] flex items-center justify-center overflow-hidden bg-slate-950/92 px-4 py-6 backdrop-blur-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label="Vídeo de boas-vindas FisioCareHub"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-sky-500/25 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-purple-500/25 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>

        <motion.div
          className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/15 bg-slate-950 shadow-2xl sm:rounded-[3rem]"
          initial={{ scale: 0.95, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.97, y: 16, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        >
          <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-2 text-white shadow-lg backdrop-blur-md">
            <Sparkles size={16} className="text-cyan-300" />
            <span className="text-xs font-black uppercase tracking-[0.22em]">FisioCareHub</span>
          </div>

          <button
            type="button"
            onClick={markAsSeenAndClose}
            className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white transition-all hover:bg-white/15"
            aria-label="Fechar vídeo de boas-vindas"
          >
            <X size={20} />
          </button>

          <div className="relative bg-black">
            <video
              ref={videoRef}
              src={videoSrc}
              className="aspect-video w-full bg-black object-cover"
              playsInline
              autoPlay
              controls={false}
              preload="auto"
              onEnded={markAsSeenAndClose}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {!isPlaying && (
              <button
                type="button"
                onClick={handlePlay}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/35 text-white transition-all hover:bg-black/45"
              >
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-sky-600 shadow-2xl">
                  <Play size={34} fill="currentColor" />
                </span>
                <span className="text-sm font-black uppercase tracking-[0.25em]">Assistir apresentação</span>
              </button>
            )}

            {needsSoundTap && (
              <div className="absolute bottom-5 left-1/2 z-20 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
                <button
                  type="button"
                  onClick={handleEnableSound}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-950 shadow-2xl transition-all hover:scale-[1.01] hover:bg-cyan-50"
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  Ativar som da apresentação
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 text-white sm:p-7">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-300">Boas-vindas</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Tecnologia, cuidado e reabilitação em um só lugar.
              </h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-300">
                Assista à apresentação rápida do FisioCareHub. Tentamos iniciar com som automaticamente; se o navegador bloquear, toque em ativar som.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleEnableSound}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black transition-all',
                  isMuted || needsSoundTap
                    ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                    : 'bg-white/10 text-white hover:bg-white/15'
                )}
              >
                <Volume2 size={18} />
                {isMuted || needsSoundTap ? 'Ativar som' : 'Som ativado'}
              </button>

              <button
                type="button"
                onClick={markAsSeenAndClose}
                className="flex flex-1 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-sm font-black text-white transition-all hover:bg-white/10"
              >
                Começar agora
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
