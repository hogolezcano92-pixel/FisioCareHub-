type FchSplashAudioState = {
  audio: HTMLAudioElement | null;
  sourceIndex: number;
  fadeFrame: number;
  timers: number[];
  unlocked: boolean;
};

declare global {
  interface Window {
    __fchPostLoginSplashAudio?: FchSplashAudioState;
  }
}

const SPLASH_MP3_SOURCES = [
  '/sounds/post-login-splash.mp3',
  '/assets/post-login-splash.mp3',
  '/audio/post-login-splash.mp3',
];

const getState = (): FchSplashAudioState | null => {
  if (typeof window === 'undefined') return null;

  if (!window.__fchPostLoginSplashAudio) {
    window.__fchPostLoginSplashAudio = {
      audio: null,
      sourceIndex: 0,
      fadeFrame: 0,
      timers: [],
      unlocked: false,
    };
  }

  return window.__fchPostLoginSplashAudio;
};

const clearTimers = (state: FchSplashAudioState) => {
  state.timers.forEach((timer) => window.clearTimeout(timer));
  state.timers = [];
};

const stopFade = (state: FchSplashAudioState) => {
  if (state.fadeFrame) {
    window.cancelAnimationFrame(state.fadeFrame);
    state.fadeFrame = 0;
  }
};

const fadeVolume = (
  state: FchSplashAudioState,
  from: number,
  to: number,
  duration: number,
  onDone?: () => void,
) => {
  stopFade(state);

  const startedAt = window.performance.now();

  const tick = (now: number) => {
    const audio = state.audio;
    if (!audio) return;

    const progress = Math.min((now - startedAt) / duration, 1);
    audio.volume = Math.max(0, Math.min(1, from + (to - from) * progress));

    if (progress < 1) {
      state.fadeFrame = window.requestAnimationFrame(tick);
      return;
    }

    state.fadeFrame = 0;
    onDone?.();
  };

  state.fadeFrame = window.requestAnimationFrame(tick);
};

const resetAudioElement = (state: FchSplashAudioState) => {
  stopFade(state);

  if (!state.audio) return;

  state.audio.pause();
  state.audio.currentTime = 0;
  state.audio.src = '';
  state.audio.load();
  state.audio = null;
};

const createAudioForCurrentSource = (state: FchSplashAudioState) => {
  resetAudioElement(state);

  const audio = new Audio(SPLASH_MP3_SOURCES[state.sourceIndex]);
  audio.preload = 'auto';
  audio.loop = true;
  audio.volume = 0.001;
  state.audio = audio;

  audio.addEventListener('error', () => {
    if (state.sourceIndex >= SPLASH_MP3_SOURCES.length - 1) return;
    state.sourceIndex += 1;
    createAudioForCurrentSource(state);
    void state.audio?.play().catch(() => undefined);
  }, { once: true });

  return audio;
};

export const primePostLoginSplashSound = () => {
  const state = getState();
  if (!state) return;

  clearTimers(state);

  const audio = state.audio || createAudioForCurrentSource(state);
  if (!audio) return;

  audio.volume = 0.001;

  const playPromise = audio.play();
  if (playPromise) {
    playPromise
      .then(() => {
        state.unlocked = true;
      })
      .catch(() => {
        state.unlocked = false;
      });
  }
};

export const startPostLoginSplashSound = (durationMs: number) => {
  const state = getState();
  if (!state) return () => undefined;

  clearTimers(state);

  const audio = state.audio || createAudioForCurrentSource(state);
  if (!audio) return () => undefined;

  const playPromise = audio.play();
  if (playPromise) {
    playPromise
      .then(() => {
        state.unlocked = true;
        fadeVolume(state, audio.volume || 0.001, 0.34, 850);
      })
      .catch(() => {
        state.unlocked = false;
      });
  } else {
    fadeVolume(state, audio.volume || 0.001, 0.34, 850);
  }

  const fadeOutTimer = window.setTimeout(() => {
    if (!state.audio) return;
    fadeVolume(state, state.audio.volume, 0, 1200, () => {
      if (!state.audio) return;
      state.audio.pause();
      state.audio.currentTime = 0;
    });
  }, Math.max(durationMs - 1350, 0));

  const hardStopTimer = window.setTimeout(() => {
    stopPostLoginSplashSound();
  }, durationMs + 450);

  state.timers.push(fadeOutTimer, hardStopTimer);

  return () => stopPostLoginSplashSound();
};

export const stopPostLoginSplashSound = () => {
  const state = getState();
  if (!state) return;

  clearTimers(state);
  resetAudioElement(state);
  state.unlocked = false;
  state.sourceIndex = 0;
};
