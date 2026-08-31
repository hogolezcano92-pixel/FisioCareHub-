import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smartphone, 
  Download, 
  Share, 
  PlusSquare, 
  Check, 
  X, 
  MoreVertical, 
  Compass,
  CheckCircle2
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function checkIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function openInstallAppGuide() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fch-open-install-guide'));
  }
}

export function useIsAppInstalled() {
  const [installed, setInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return checkIsStandalone();
  });

  useEffect(() => {
    const checkStatus = () => setInstalled(checkIsStandalone());
    checkStatus();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = () => checkStatus();
    const handleAppInstalled = () => setInstalled(true);

    try {
      mediaQuery.addEventListener('change', handleMediaChange);
    } catch {
      mediaQuery.addListener(handleMediaChange);
    }
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      try {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } catch {
        mediaQuery.removeListener(handleMediaChange);
      }
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return installed;
}

export default function InstallAppGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ios' | 'android'>('android');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Detect platform on mount
  useEffect(() => {
    const isStandalone = checkIsStandalone();
    setIsInstalled(isStandalone);

    const ua = navigator.userAgent || '';
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOSDevice) {
      setActiveTab('ios');
    } else {
      setActiveTab('android');
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleOpenEvent = () => {
      setIsOpen(true);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('fch-open-install-guide', handleOpenEvent);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('fch-open-install-guide', handleOpenEvent);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;

    try {
      setIsInstalling(true);
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setIsOpen(false);
      }
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Erro ao executar instalação nativa:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  if (isInstalled && !isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 sm:p-7 border-b border-slate-100 dark:border-white/5 relative">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3.5 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-xl">
                  <Smartphone size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Instale o FisioCareHub
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Web App Oficial</span>
                  </div>
                </div>
              </div>

              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                Tenha acesso rápido ao FisioCareHub diretamente pela tela inicial do seu celular.
              </p>
            </div>

            {/* Platform Selection Tabs */}
            <div className="p-4 sm:px-7 pb-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-white/5">
              <div className="grid grid-cols-2 gap-2 bg-slate-200/80 dark:bg-slate-800/80 p-1.5 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('ios')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-sm transition-all duration-200 ${
                    activeTab === 'ios'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="text-base">🍎</span>
                  <span>iPhone</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('android')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-sm transition-all duration-200 ${
                    activeTab === 'android'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="text-base">🤖</span>
                  <span>Android</span>
                </button>
              </div>
            </div>

            {/* Body Content */}
            <div className="p-6 sm:p-7 overflow-y-auto space-y-6 flex-1">
              {/* iPhone Content */}
              {activeTab === 'ios' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-1">
                    <h4 className="text-sm font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Como instalar no iPhone
                    </h4>
                    <span className="text-xs font-bold text-slate-400">Safari iOS</span>
                  </div>

                  <div className="space-y-3">
                    {/* Step 1 */}
                    <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                        1
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          Abra o FisioCareHub pelo Safari.
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Compass size={13} className="text-blue-500" />
                          Certifique-se de estar usando o navegador Safari.
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                        2
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                          Toque no botão Compartilhar 
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-black">
                            <Share size={12} /> ⬆️
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Localizado na barra inferior do Safari no iPhone.
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                        3
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                          Selecione 
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black">
                            <PlusSquare size={12} /> “Adicionar à Tela de Início”
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Role a lista para baixo até encontrar a opção.
                        </p>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                        4
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          Toque em 
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-600 text-white text-xs font-black">
                            <Check size={12} /> “Adicionar”
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          No canto superior direito para finalizar.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Android Content */}
              {activeTab === 'android' && (
                <div className="space-y-5">
                  {deferredPrompt ? (
                    /* Native Prompt Available */
                    <div className="space-y-4 text-center py-2">
                      <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Download size={32} />
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-base font-black text-slate-900 dark:text-white">
                          Instalação direta disponível
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                          Seu navegador suporta instalação com 1 clique direto para a tela inicial.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleNativeInstall}
                        disabled={isInstalling}
                        className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-base shadow-xl shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
                      >
                        <Download size={20} />
                        {isInstalling ? 'Instalando...' : 'Instalar agora'}
                      </button>
                    </div>
                  ) : (
                    /* Manual Step-by-Step Guide for Android */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-1">
                        <h4 className="text-sm font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                          Como instalar no Android
                        </h4>
                        <span className="text-xs font-bold text-slate-400">Chrome / Navegador</span>
                      </div>

                      <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-slate-800 dark:text-slate-200 text-sm font-medium leading-relaxed">
                        Abra o menu <strong className="font-black text-blue-600 dark:text-blue-400 inline-flex items-center gap-0.5"><MoreVertical size={14} /> ⋮</strong> do navegador e selecione <strong>‘Instalar aplicativo’</strong> ou <strong>‘Adicionar à tela inicial’</strong>.
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                            1
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              Abra o menu <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-xs font-bold"><MoreVertical size={12} /> ⋮</span> no topo do navegador
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Geralmente localizado no canto superior direito.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                            2
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              Toque em “Instalar aplicativo” ou “Adicionar à tela inicial”
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              O navegador criará um atalho de aplicativo nativo.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                            3
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              Confirme a instalação
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Pronto! O FisioCareHub estará acessível na sua tela inicial.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Notice */}
            <div className="p-4 sm:px-7 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                <span>Rápido, leve e não ocupa espaço de armazenamento.</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
