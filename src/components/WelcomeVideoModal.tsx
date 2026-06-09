import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, X } from 'lucide-react';

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

  const storageKey = useMemo(() => getStorageKey(userId), [userId]);
  const normalizedRole = String(userRole || '').toLowerCase();
  const shouldShowForRole = normalizedRole === 'paciente' || normalizedRole === 'fisioterapeuta';

  useEffect(() => {
    if (!userId || !shouldShowForRole) return;

    try {
      const alreadySeen = localStorage.getItem(storageKey);
      if (!alreadySeen) {
        const timer = window.setTimeout(() => setIsVisible(true), 500);
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

    const tryAutoplayWithSound = async () => {
      setHasTriedAutoplay(true);

      try {
        video.muted = false;
        video.volume = 1;
        await video.play();

        if (cancelled) return;
        setNeedsSoundTap(false);
      } catch (soundError) {
        console.warn('[WelcomeVideoModal] Autoplay com som bloqueado. Tentando iniciar sem som.', soundError);

        try {
          video.muted = true;
          await video.play();

          if (cancelled) return;
          setNeedsSoundTap(true);
        } catch (mutedError) {
          console.warn('[WelcomeVideoModal] Autoplay mutado também foi bloqueado.', mutedError);

          if (cancelled) return;
          setNeedsSoundTap(true);
        }
      }
    };

    tryAutoplayWithSound();

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
      setNeedsSoundTap(false);
    } catch (error) {
      console.warn('[WelcomeVideoModal] Não foi possível ativar o som.', error);
      setNeedsSoundTap(true);
    }
  };

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
          src={videoSrc}
          className="h-full w-full bg-black object-cover"
          playsInline
          autoPlay
          controls={false}
          preload="auto"
          onEnded={markAsSeenAndClose}
          onClick={needsSoundTap ? handleEnableSound : undefined}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-32 bg-gradient-to-b from-black/45 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-36 bg-gradient-to-t from-black/40 to-transparent" />

        <button
          type="button"
          onClick={markAsSeenAndClose}
          className="absolute right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-2xl backdrop-blur-md transition-all hover:bg-black/60"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 14px)' }}
          aria-label="Fechar vídeo de boas-vindas"
        >
          <X size={24} />
        </button>

        {needsSoundTap && (
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
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
