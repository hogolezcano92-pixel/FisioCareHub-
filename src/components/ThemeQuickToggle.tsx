import { useMemo, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { THEMES } from '../lib/themes';

const LAST_DARK_THEME_KEY = 'fch_last_dark_theme';

interface ThemeQuickToggleProps {
  className?: string;
}

export default function ThemeQuickToggle({ className }: ThemeQuickToggleProps) {
  const { theme, updateTheme } = useAuth();
  const [isChanging, setIsChanging] = useState(false);

  const isLight = useMemo(() => {
    const currentTheme = THEMES[theme];
    if (currentTheme?.mode) return currentTheme.mode === 'light';

    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') === 'light';
    }

    return theme === 'light';
  }, [theme]);

  const toggleTheme = async () => {
    if (isChanging) return;

    const currentTheme = THEMES[theme];
    let nextTheme = 'light';

    if (isLight) {
      const savedDarkTheme = localStorage.getItem(LAST_DARK_THEME_KEY);
      nextTheme = savedDarkTheme && THEMES[savedDarkTheme]?.mode === 'dark' ? savedDarkTheme : 'blue';
    } else {
      if (currentTheme?.mode === 'dark') {
        localStorage.setItem(LAST_DARK_THEME_KEY, theme);
      }
      nextTheme = 'light';
    }

    try {
      setIsChanging(true);
      await updateTheme(nextTheme);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      disabled={isChanging}
      title={isLight ? 'Ativar modo escuro' : 'Ativar tema claro'}
      aria-label={isLight ? 'Ativar modo escuro' : 'Ativar tema claro'}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition-all duration-200 active:scale-95 disabled:cursor-wait disabled:opacity-70',
        'border-violet-100 bg-white text-slate-700 shadow-sm shadow-violet-100/70 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700',
        'dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:shadow-none dark:hover:bg-white/10 dark:hover:text-amber-300',
        className
      )}
    >
      {isLight ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
