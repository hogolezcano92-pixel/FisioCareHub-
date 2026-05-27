
export interface ThemeConfig {
  id: string;
  name: string;
  primary: string;
  primaryHover: string;
  bg: string;
  card: string;
  cardHover: string;
  border: string;
  text: string;
  textMuted: string;
  shadowRgb: string;
  mode?: 'light' | 'dark';
}

export const THEMES: Record<string, ThemeConfig> = {
  light: {
    id: 'light',
    name: 'Claro Premium',
    primary: '#6D28D9',
    primaryHover: '#5B21B6',
    bg: '#FAF8FF',
    card: '#FFFFFF',
    cardHover: '#F5F3FF',
    border: '#DDD6FE',
    text: '#0F172A',
    textMuted: '#334155',
    shadowRgb: '109, 40, 217',
    mode: 'light'
  },
  blue: {
    id: 'blue',
    name: 'Azul Clínico',
    primary: '#0047AB',
    primaryHover: '#003580',
    bg: '#0B1120',
    card: '#161F32',
    cardHover: '#1E293B',
    border: '#2D3748',
    text: '#FFFFFF',
    textMuted: '#94A3B8',
    shadowRgb: '0, 71, 171',
    mode: 'dark'
  },
  green: {
    id: 'green',
    name: 'Verde Saúde',
    primary: '#10B981',
    primaryHover: '#059669',
    bg: '#02120B',
    card: '#062B1D',
    cardHover: '#0A3C29',
    border: '#0F5135',
    text: '#FFFFFF',
    textMuted: '#A7F3D0',
    shadowRgb: '16, 185, 129',
    mode: 'dark'
  },
  purple: {
    id: 'purple',
    name: 'Roxo Premium',
    primary: '#8B5CF6',
    primaryHover: '#7C3AED',
    bg: '#0F0B1E',
    card: '#1A1435',
    cardHover: '#221A47',
    border: '#2D225E',
    text: '#FFFFFF',
    textMuted: '#C4B5FD',
    shadowRgb: '139, 92, 246',
    mode: 'dark'
  }
};

export const applyTheme = (themeId: string) => {
  const theme = THEMES[themeId] || THEMES.blue;
  const root = document.documentElement;
  
  root.style.setProperty('--theme-primary', theme.primary);
  root.style.setProperty('--theme-primary-hover', theme.primaryHover);
  root.style.setProperty('--theme-bg', theme.bg);
  root.style.setProperty('--theme-card', theme.card);
  root.style.setProperty('--theme-card-hover', theme.cardHover);
  root.style.setProperty('--theme-border', theme.border);
  root.style.setProperty('--theme-text', theme.text);
  root.style.setProperty('--theme-text-muted', theme.textMuted);
  root.style.setProperty('--theme-shadow-rgb', theme.shadowRgb);

  const mode = theme.mode || 'dark';
  root.setAttribute('data-theme', mode);
  root.classList.toggle('dark', mode === 'dark');

  // Also update body background directly for instant feedback on the very edge of the viewport
  document.body.style.backgroundColor = theme.bg;
  document.body.style.color = theme.text;
};
