import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Volume2, X } from 'lucide-react';

interface WelcomeVideoModalProps {
  userId?: string | null;
  userRole?: string | null;
  videoSrc?: string;
}

/**
 * O parâmetro v força o navegador/Vercel a buscar o arquivo novo,
 * evitando tela preta por cache antigo do MP4.
 */
const DEFAULT_VIDEO_SRC = '/onboarding/fisiocarehub-welcome.mp4?v=4';

const getStorageKey = (userId?: string | null) =>
  userId ? `fisiocarehub_welcome_video_seen_${userId}` : 'fisiocarehub_welcome_video_seen_guest';

export default function WelcomeVideoModal({
  userId,
  userRole,
  videoSrc = DEFAULT_VIDEO_SRC,
}: WelcomeVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const startedRef = useRef(false);

  const [isVisible, setIsVisible] = useState(false);
  const [needsSoundTap, setNeedsSoundTap] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);

  const storageKey = useMemo(() => getStorageKey(userId), [userId]);
  const normalizedRole = String(userRole || '').toLowerCase();
  const shouldShowForRole = normalizedRole === 'paciente' || normalizedRole === 'fisioterapeuta';

  useEffect(() => {
    if (!userId || !shouldShowForRole) return;

    try {
      const alreadySeen = localStorage.getItem(storageKey);
      if (!alreadySeen) {
        const timer = window.setTimeout(() => setIsVisible(true), 400);
        return () => window.clearTimeout(timer);
      }
    } catch {
      setIsVisible(true);
    }
  }, [storageKey, shouldShowForRole, userId]);

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

  const startVideo = async (preferSound = true) => {
    const video = videoRef.current;
    if (!video) return;

    setHasVideoError(false);
    setShowPlayButton(false);

    try {
      video.playsInline = true;
      video.controls = false;

      if (preferSound) {
        video.muted = false;
        video.volume = 1;
      }

      await video.play();

      startedRef.current = true;
      setNeedsSoundTap(false);
    } catch (soundError) {
      console.warn('[WelcomeVideoModal] Autoplay com som bloqueado. Tentando sem som.', soundError);

      try {
        video.muted = true;
        await video.play();

        startedRef.current = true;
        setNeedsSoundTap(true);
      } catch (mutedError) {
        console.warn('[WelcomeVideoModal] Autoplay mutado também foi bloqueado.', mutedError);

        setShowPlayButton(true);
        setNeedsSoundTap(true);
      }
    }
  };

  const handleEnableSound = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      video.muted = false;
      video.volume = 1;
      await video.play();

      startedRef.current = true;
      setNeedsSoundTap(false);
      setShowPlayButton(false);
    } catch (error) {
      console.warn('[WelcomeVideoModal] Não foi possível ativar o som.', error);
      setNeedsSoundTap(true);
    }
  };

  const handleManualPlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      video.muted = false;
      video.volume = 1;
      await video.play();

      startedRef.current = true;
      setShowPlayButton(false);
      setNeedsSoundTap(false);
    } catch {
      await startVideo(false);
    }
  };

  useEffect(() => {
    if (!isVisible) return;

    startedRef.current = false;
    setNeedsSoundTap(false);
    setShowPlayButton(false);
    setHasVideoError(false);

    const video = videoRef.current;
    if (!video) return;

    try {
      video.load();
    } catch {}

    const timer = window.setTimeout(() => {
      if (!startedRef.current) {
        startVideo(true);
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [isVisible, videoSrc]);

  if (!isVisible) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100000] h-[100dvh] w-screen overflow-hidden bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label="Vídeo de boas-vindas FisioCareHub"
      >
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full bg-black object-cover"
          playsInline
          webkit-playsinline="true"
          autoPlay
          controls={false}
          preload="auto"
          onLoadedData={() => {
            if (!startedRef.current) startVideo(true);
          }}
          onCanPlay={() => {
            if (!startedRef.current) startVideo(true);
          }}
          onEnded={markAsSeenAndClose}
          onError={(event) => {
            console.error('[WelcomeVideoModal] Erro ao carregar vídeo de boas-vindas.', event);
            setHasVideoError(true);
            setShowPlayButton(true);
          }}
          onClick={needsSoundTap ? handleEnableSound : undefined}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-28 bg-gradient-to-b from-black/45 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-28 bg-gradient-to-t from-black/35 to-transparent" />

        <button
          type="button"
          onClick={markAsSeenAndClose}
          className="absolute right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-2xl backdrop-blur-md transition-all hover:bg-black/60"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 14px)' }}
          aria-label="Fechar vídeo de boas-vindas"
        >
          <X size={24} />
        </button>

        {needsSoundTap && !showPlayButton && (
          <button
            type="button"
            onClick={handleEnableSound}
            className="absolute left-1/2 z-30 flex -translate-x-1/2 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/90 px-5 py-3 text-sm font-black text-slate-950 shadow-2xl backdrop-blur-md transition-all hover:scale-[1.03] hover:bg-white"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 26px)' }}
            aria-label="Ativar som do vídeo"
          >
            <Volume2 size={18} />
            Ativar som
          </button>
        )}

        {showPlayButton && (
          <button
            type="button"
            onClick={hasVideoError ? () => window.location.reload() : handleManualPlay}
            className="absolute left-1/2 top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-3 rounded-[2rem] border border-white/20 bg-black/55 px-8 py-7 text-white shadow-2xl backdrop-blur-md transition-all hover:bg-black/70"
            aria-label={hasVideoError ? 'Recarregar vídeo' : 'Tocar vídeo'}
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-sky-600 shadow-xl">
              {hasVideoError ? <RotateCcw size={30} /> : <Play size={30} fill="currentColor" />}
            </span>
            <span className="text-sm font-black uppercase tracking-[0.2em]">
              {hasVideoError ? 'Recarregar' : 'Tocar vídeo'}
            </span>
          </button>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
