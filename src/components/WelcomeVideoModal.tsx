import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Volume2, X } from 'lucide-react';

interface WelcomeVideoModalProps {
  userId?: string | null;
  userRole?: string | null;
}

type WelcomeVideoStep = {
  id: 'welcome' | 'paciente' | 'fisioterapeuta';
  src: string;
};

const VIDEO_VERSION = 'v=5';

const GENERAL_VIDEO: WelcomeVideoStep = {
  id: 'welcome',
  src: `/onboarding/fisiocarehub-welcome.mp4?${VIDEO_VERSION}`,
};

const ROLE_VIDEOS: Record<string, WelcomeVideoStep> = {
  paciente: {
    id: 'paciente',
    src: `/onboarding/fisiocarehub-paciente.mp4?${VIDEO_VERSION}`,
  },
  fisioterapeuta: {
    id: 'fisioterapeuta',
    src: `/onboarding/fisiocarehub-fisioterapeuta.mp4?${VIDEO_VERSION}`,
  },
};

const getStorageKey = (userId?: string | null) =>
  userId
    ? `fisiocarehub_welcome_video_sequence_seen_${userId}_${VIDEO_VERSION}`
    : `fisiocarehub_welcome_video_sequence_seen_guest_${VIDEO_VERSION}`;

const normalizeRole = (role?: string | null) => String(role || '').toLowerCase();

export default function WelcomeVideoModal({ userId, userRole }: WelcomeVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const startedRef = useRef(false);
  const closingRef = useRef(false);

  const [isVisible, setIsVisible] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [needsSoundTap, setNeedsSoundTap] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);

  const normalizedRole = normalizeRole(userRole);
  const shouldShowForRole = normalizedRole === 'paciente' || normalizedRole === 'fisioterapeuta';
  const storageKey = useMemo(() => getStorageKey(userId), [userId]);

  const videoSteps = useMemo<WelcomeVideoStep[]>(() => {
    const steps = [GENERAL_VIDEO];
    const roleVideo = ROLE_VIDEOS[normalizedRole];

    if (roleVideo) {
      steps.push(roleVideo);
    }

    return steps;
  }, [normalizedRole]);

  const currentStep = videoSteps[currentStepIndex] || GENERAL_VIDEO;
  const isLastStep = currentStepIndex >= videoSteps.length - 1;

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

  useEffect(() => {
    if (!isVisible || videoSteps.length === 0) return;

    videoSteps.forEach((step) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'video';
      link.href = step.src;
      document.head.appendChild(link);

      return () => {
        try {
          document.head.removeChild(link);
        } catch {}
      };
    });
  }, [isVisible, videoSteps]);

  const markAsSeenAndClose = () => {
    closingRef.current = true;

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

  const goToNextVideoOrClose = () => {
    if (!isLastStep) {
      startedRef.current = false;
      setNeedsSoundTap(false);
      setShowPlayButton(false);
      setHasVideoError(false);
      setCurrentStepIndex((index) => index + 1);
      return;
    }

    markAsSeenAndClose();
  };

  const startVideo = async (preferSound = true) => {
    const video = videoRef.current;
    if (!video || closingRef.current) return;

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

    closingRef.current = false;
    startedRef.current = false;
    setNeedsSoundTap(false);
    setShowPlayButton(false);
    setHasVideoError(false);

    const video = videoRef.current;
    if (!video) return;

    try {
      video.pause();
      video.currentTime = 0;
      video.load();
    } catch {}

    const timer = window.setTimeout(() => {
      if (!startedRef.current) {
        startVideo(true);
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [currentStep.src, isVisible]);

  const handleVideoError = (event: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('[WelcomeVideoModal] Erro ao carregar vídeo de boas-vindas.', {
      step: currentStep.id,
      src: currentStep.src,
      event,
    });

    /**
     * Se o vídeo por tipo de conta ainda não existir no projeto,
     * não deixa o usuário preso em tela preta: fecha normalmente após o vídeo geral.
     */
    if (currentStep.id !== 'welcome') {
      markAsSeenAndClose();
      return;
    }

    setHasVideoError(true);
    setShowPlayButton(true);
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
          key={currentStep.src}
          ref={videoRef}
          className="absolute inset-0 h-full w-full bg-black object-cover"
          playsInline
          autoPlay
          controls={false}
          preload="auto"
          onLoadedData={() => {
            if (!startedRef.current) startVideo(true);
          }}
          onCanPlay={() => {
            if (!startedRef.current) startVideo(true);
          }}
          onEnded={goToNextVideoOrClose}
          onError={handleVideoError}
          onClick={needsSoundTap ? handleEnableSound : undefined}
        >
          <source src={currentStep.src} type="video/mp4" />
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
