import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Loader2, Eye, EyeOff, Fingerprint } from 'lucide-react';
import Logo from '../components/Logo';
import { loginWithBiometrics, isBiometricsSupported, registerBiometrics } from '../lib/webauthn';

// Coloque o vídeo exclusivo em: public/login-bg.mp4
// No Vite, arquivos dentro de /public são servidos pela raiz do site.
const LOGIN_BACKGROUND_VIDEO = '/login-bg.mp4';

export default function Login() {
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const normalizeRedirect = (value: string | null | undefined) => {
    if (!value || !value.startsWith('/') || value.startsWith('//')) return '';
    if (value.startsWith('/login')) return '';
    return value;
  };

  const urlParams = new URLSearchParams(location.search);
  const urlRedirect = normalizeRedirect(urlParams.get('redirectTo'));
  let storedRedirect = '';
  try {
    storedRedirect = normalizeRedirect(sessionStorage.getItem('pendingRedirect'));
  } catch {
    storedRedirect = '';
  }

  const from = normalizeRedirect(location.state?.from?.pathname || '/dashboard') || '/dashboard';
  const search = location.state?.from?.search || '';
  const stateRedirect = normalizeRedirect(from + search);
  const fullRedirect = urlRedirect || storedRedirect || stateRedirect || '/dashboard';

  const POST_LOGIN_SPLASH_KEY = 'fch_post_login_splash_pending';

  const setPostLoginSplashPayload = (payload: { target?: string; role?: string | null; name?: string | null } = {}) => {
    try {
      sessionStorage.setItem(POST_LOGIN_SPLASH_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  };

  const clearPostLoginSplashPayload = () => {
    try {
      sessionStorage.removeItem(POST_LOGIN_SPLASH_KEY);
    } catch {
      // ignore
    }
  };

  const hasPostLoginSplashPayload = () => {
    try {
      return Boolean(sessionStorage.getItem(POST_LOGIN_SPLASH_KEY));
    } catch {
      return false;
    }
  };

  const clearPendingRedirect = () => {
    try {
      sessionStorage.removeItem('pendingRedirect');
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!authLoading && user && !hasPostLoginSplashPayload()) {
      // If already logged in, redirect based on role
      const checkRoleAndRedirect = async () => {
        const { data: profileData } = await supabase
          .from('perfis')
          .select('tipo_usuario, status_aprovacao, nome_completo')
          .eq('id', user.id)
          .maybeSingle();
        
        const isAdmin = profileData?.tipo_usuario === 'admin' || user.email?.toLowerCase() === 'hogolezcano92@gmail.com';
        const isPhysio = profileData?.tipo_usuario === 'fisioterapeuta';
        const isApproved = profileData?.status_aprovacao === 'aprovado';

        let redirectTarget = fullRedirect || '/dashboard';

        if (isAdmin && fullRedirect === '/dashboard') {
          redirectTarget = '/admin';
        } else if (isPhysio && !isApproved) {
          redirectTarget = '/aguardando-aprovacao';
        }

        clearPendingRedirect();

        navigate(redirectTarget, { replace: true });
      };
      checkRoleAndRedirect();
    }
  }, [user, authLoading, navigate, fullRedirect]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Por favor, digite seu e-mail para redefinir a senha.');
      return;
    }

    if (countdown > 0) return;

    setResetLoading(true);
    setError('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      const { toast } = await import('sonner');
      toast.success('E-mail de redefinição enviado! Verifique sua caixa de entrada.');
    } catch (err: any) {
      console.error("Erro ao enviar e-mail de redefinição:", err);
      
      if (err.message?.includes('security purposes')) {
        const seconds = parseInt(err.message.match(/\d+/)?.[0] || '60');
        setCountdown(seconds);
        setError(`Por segurança, aguarde ${seconds} segundos antes de tentar novamente.`);
      } else {
        setError('Erro ao enviar e-mail de redefinição: ' + err.message);
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const oauthTarget = fullRedirect || '/dashboard';
      const redirectUrl = `${window.location.origin}/login?redirectTo=${encodeURIComponent(oauthTarget)}`;

      setPostLoginSplashPayload({ target: oauthTarget });

      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });
      if (googleError) throw googleError;
    } catch (err: any) {
      console.error("Erro no login com Google:", err);
      clearPostLoginSplashPayload();
      setError('Erro ao entrar com Google: ' + err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    isBiometricsSupported().then(setIsBiometricSupported);
  }, []);

  const handleBiometricLogin = async () => {
    if (!email) {
      setError('Por favor, digite seu e-mail para usar o login biométrico.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      setPostLoginSplashPayload({ target: fullRedirect || '/dashboard' });
      await loginWithBiometrics(email.trim().toLowerCase());
      // On success, the helper will redirect or use the magic link
    } catch (err: any) {
      clearPostLoginSplashPayload();
      console.error("Erro no login biométrico:", err);
      setError(err.message || 'Erro ao entrar com biometria.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterBiometrics = async () => {
    try {
      await registerBiometrics();
      const { toast } = await import('sonner');
      toast.success('Biometria ativada com sucesso!');
      setShowBiometricPrompt(false);
    } catch (err: any) {
      console.error("Erro ao registrar biometria:", err);
      const { toast } = await import('sonner');
      toast.error(err.message || 'Erro ao ativar biometria.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanEmail = email.trim().toLowerCase();

    try {
      setPostLoginSplashPayload({ target: fullRedirect || '/dashboard' });

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (loginError) {
        clearPostLoginSplashPayload();
        if (loginError.message.includes('Email not confirmed')) {
          setError('Por favor, confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.');
        } else if (loginError.message.includes('Invalid login credentials')) {
          setError('E-mail ou senha incorretos.');
        } else {
          setError('Erro no login: ' + loginError.message);
        }
        setLoading(false);
        return;
      }

      // Force profile refresh to get the latest role
      await refreshProfile();
      
      const { toast } = await import('sonner');
      toast.success('Login realizado com sucesso!');

      // A biometria continua funcionando, mas não abrimos o modal de ativação aqui
      // para não cobrir a animação premium pós-login.
      
      // Get profile to check role and approval status
      const { data: profileData } = await supabase
        .from('perfis')
        .select('tipo_usuario, status_aprovacao, nome_completo')
        .eq('id', data.user?.id)
        .maybeSingle();

      const isAdmin = profileData?.tipo_usuario === 'admin' || cleanEmail.toLowerCase() === 'hogolezcano92@gmail.com';
      const isPhysio = profileData?.tipo_usuario === 'fisioterapeuta';
      const isApproved = profileData?.status_aprovacao === 'aprovado';

      let redirectTarget = '/dashboard';

      if (isPhysio && !isApproved) {
        redirectTarget = '/aguardando-aprovacao';
      } else if (fullRedirect && fullRedirect !== '/dashboard') {
        redirectTarget = fullRedirect;
      } else if (isAdmin) {
        redirectTarget = '/admin';
      }

      clearPendingRedirect();
      setPostLoginSplashPayload({
        target: redirectTarget,
        role: profileData?.tipo_usuario,
        name: profileData?.nome_completo || data.user?.user_metadata?.nome_completo || data.user?.user_metadata?.full_name || cleanEmail,
      });
      // O AuthGate mostra a animação por 6 segundos e só depois redireciona.
    } catch (err: any) {
      console.error("Erro no login:", err);
      clearPostLoginSplashPayload();
      setError('Ocorreu um erro inesperado. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {showBiometricPrompt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              onClick={() => setShowBiometricPrompt(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Fingerprint className="text-blue-500" size={40} />
              </div>
              <h3 className="text-xl font-black text-white mb-2">Ativar Biometria?</h3>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                Use o Face ID, Touch ID ou o bloqueio de tela do seu dispositivo para entrar de forma rápida e segura.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={handleRegisterBiometrics}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-500 transition-all active:scale-95"
                >
                  Ativar Agora
                </button>
                <button
                  onClick={() => {
                    setShowBiometricPrompt(false);
                    // Continue to dashboard after dismissing
                    navigate('/dashboard', { replace: true });
                  }}
                  className="w-full py-4 bg-white/5 text-slate-400 rounded-2xl font-bold text-sm hover:bg-white/10 transition-all"
                >
                  Lembrar mais tarde
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      
      <section className="fch-login-video-shell fch-login-immersive min-h-[100svh] w-full relative overflow-hidden isolate flex items-center justify-center px-4 py-5 sm:px-6 lg:px-8">
        {/* Vídeo de fundo premium do login em tela cheia */}
        <video
          className="fch-login-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        >
          <source src={LOGIN_BACKGROUND_VIDEO} type="video/mp4" />
        </video>
        <div className="fch-login-video-overlay" aria-hidden="true" />
        <div className="fch-login-video-vignette" aria-hidden="true" />

        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="fch-login-content relative z-10 w-full max-w-[340px] mx-auto"
        >
          <div className="fch-login-brand mb-4 sm:mb-5 scale-[1.18] origin-center">
            <Logo size="sm" variant="dark" className="dark:hidden justify-center" />
            <Logo size="sm" variant="light" className="hidden dark:flex justify-center" />
          </div>

          <div className="text-center mb-4 sm:mb-5">
            <h2 className="fch-login-title text-[1.68rem] leading-[0.98] sm:text-[2.08rem] font-display font-black tracking-tight">
              Bem-vindo de volta
            </h2>
            <p className="fch-login-subtitle mt-2 text-xs sm:text-sm font-semibold">
              Acesse sua conta para continuar.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-2">
              <label className="fch-login-label block text-[9px] font-black uppercase tracking-[0.28em] ml-1">E-mail</label>
              <div className="relative group">
                <div 
                  className="absolute flex items-center justify-center pointer-events-none z-20"
                  style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px' }}
                >
                  <Mail className="fch-login-field-icon transition-colors" size={17} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="fch-login-input w-full pr-4 py-2.5 rounded-[1.15rem] text-[16px] sm:text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all !pl-[50px]"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="fch-login-label block text-[9px] font-black uppercase tracking-[0.28em] ml-1">Senha</label>
              <div className="relative group">
                <div 
                  className="absolute flex items-center justify-center pointer-events-none z-20"
                  style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px' }}
                >
                  <Lock className="fch-login-field-icon transition-colors" size={17} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="fch-login-input w-full pr-11 py-2.5 rounded-[1.15rem] text-[16px] sm:text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all !pl-[50px]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="fch-login-eye absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-100 text-xs bg-red-500/30 p-4 rounded-2xl border border-red-300/30 font-bold backdrop-blur-md"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="fch-login-primary w-full py-2.5 text-white rounded-[1.15rem] font-black text-xs shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2.5"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Entrar na Conta'}
            </button>

            {isBiometricSupported && (
              <button
                type="button"
                onClick={handleBiometricLogin}
                disabled={loading}
                className="fch-login-secondary w-full py-2.5 rounded-[1.15rem] font-black text-xs transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                <Fingerprint size={18} className="text-blue-500 dark:text-blue-300" />
                Entrar com Face ID / Biometria
              </button>
            )}

            <div className="fch-login-divider relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t"></span>
              </div>
              <div className="relative flex justify-center text-[9px] uppercase tracking-[0.28em] font-black">
                <span className="px-3">ou</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="fch-login-secondary w-full py-2.5 rounded-[1.15rem] font-black text-xs transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading || loading || countdown > 0}
                className="fch-login-forgot text-[11px] font-black transition-all disabled:opacity-50"
              >
                {resetLoading 
                  ? 'Enviando e-mail...' 
                  : countdown > 0 
                    ? `Aguarde ${countdown}s` 
                    : 'Esqueceu sua senha?'}
              </button>
            </div>
          </form>

          <p className="fch-login-register text-center mt-4 text-xs font-semibold">
            Não tem uma conta? <Link to="/register" className="font-black transition-colors">Cadastrar-se</Link>
          </p>
        </motion.div>
      </section>
    </>
  );
}
