type UserType = 'paciente' | 'fisioterapeuta' | null;

const CRITICAL_ONBOARDING_VIDEOS = [
  '/onboarding/welcome.mp4',
  '/onboarding/cuidado.mp4',
  '/onboarding/comovocequer.mp4',
];

const PATIENT_ONBOARDING_VIDEOS = [
  '/onboarding/recupere.mp4',
  '/onboarding/acompanheseuprogreso.mp4',
  '/onboarding/conectese.mp4',
];

const PHYSIO_ONBOARDING_VIDEOS = [
  '/onboarding/gerencie.mp4',
  '/onboarding/prescrever.mp4',
  '/onboarding/acompanhe.mp4',
];

const preloadedVideos = new Map<string, HTMLVideoElement>();
const preloadLinks = new Set<string>();

const canUseDOM = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const requestIdle = (callback: () => void) => {
  if (!canUseDOM()) return;

  const idle = (window as any).requestIdleCallback;
  if (typeof idle === 'function') {
    idle(callback, { timeout: 1800 });
    return;
  }

  window.setTimeout(callback, 250);
};

export const injectVideoPreloadLink = (url: string) => {
  if (!canUseDOM() || !url || preloadLinks.has(url)) return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'video';
  link.href = url;
  link.type = 'video/mp4';
  link.crossOrigin = 'anonymous';

  document.head.appendChild(link);
  preloadLinks.add(url);
};

export const preloadVideo = (url: string, options: { priority?: boolean } = {}) => {
  if (!canUseDOM() || !url || preloadedVideos.has(url)) return;

  if (options.priority) {
    injectVideoPreloadLink(url);
  }

  const video = document.createElement('video');
  video.src = url;
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';
  video.setAttribute('webkit-playsinline', 'true');

  try {
    video.load();
  } catch {}

  preloadedVideos.set(url, video);
};

export const preloadOnboardingCriticalAssets = () => {
  CRITICAL_ONBOARDING_VIDEOS.forEach((url, index) => {
    preloadVideo(url, { priority: index === 0 });
  });

  requestIdle(() => {
    [...PATIENT_ONBOARDING_VIDEOS, ...PHYSIO_ONBOARDING_VIDEOS].forEach((url) => {
      preloadVideo(url);
    });
  });
};

export const preloadOnboardingBranchAssets = (userType: UserType) => {
  const urls =
    userType === 'paciente'
      ? PATIENT_ONBOARDING_VIDEOS
      : userType === 'fisioterapeuta'
        ? PHYSIO_ONBOARDING_VIDEOS
        : [];

  urls.forEach((url, index) => {
    preloadVideo(url, { priority: index === 0 });
  });
};

export const getOnboardingCriticalVideos = () => [...CRITICAL_ONBOARDING_VIDEOS];
export const getOnboardingPatientVideos = () => [...PATIENT_ONBOARDING_VIDEOS];
export const getOnboardingPhysioVideos = () => [...PHYSIO_ONBOARDING_VIDEOS];
