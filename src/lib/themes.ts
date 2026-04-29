
export interface ThemeConfig {
  id: string;
  name: string;
  primary: string;
  primaryHover: string;
  bg: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  shadowRgb: string;
}

export const THEMES: Record<string, ThemeConfig> = {
  blue: {
    id: 'blue',
    name: 'Azul Clínico',
    primary: '#0047AB',
    primaryHover: '#003580',
    bg: '#0B1120',
    card: '#1E293B',
    border: '#334155',
    text: '#FFFFFF',
    textMuted: '#E1E1E1',
    shadowRgb: '0, 71, 171'
  },
  green: {
    id: 'green',
    name: 'Verde Saúde',
    primary: '#10B981',
    primaryHover: '#059669',
    bg: '#062016',
    card: '#064E3B',
    border: '#065F46',
    text: '#FFFFFF',
    textMuted: '#D1FAE5',
    shadowRgb: '16, 185, 129'
  },
  purple: {
    id: 'purple',
    name: 'Roxo Premium',
    primary: '#8B5CF6',
    primaryHover: '#7C3AED',
    bg: '#1E1B4B',
    card: '#312E81',
    border: '#3730A3',
    text: '#FFFFFF',
    textMuted: '#E0E7FF',
    shadowRgb: '139, 92, 246'
  }
};

export const applyTheme = (themeId: string) => {
  const theme = THEMES[themeId] || THEMES.blue;
  const root = document.documentElement;
  
  root.style.setProperty('--theme-primary', theme.primary);
  root.style.setProperty('--theme-primary-hover', theme.primaryHover);
  root.style.setProperty('--theme-bg', theme.bg);
  root.style.setProperty('--theme-card', theme.card);
  root.style.setProperty('--theme-border', theme.border);
  root.style.setProperty('--theme-text', theme.text);
  root.style.setProperty('--theme-text-muted', theme.textMuted);
  root.style.setProperty('--theme-shadow-rgb', theme.shadowRgb);
};
