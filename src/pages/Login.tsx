import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import Logo from '../components/Logo';

import SplashScreen from '../components/SplashScreen';
import { AnimatePresence } from 'motion/react';

export default function Login() {
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user && !isAuthenticating) {
      // If already logged in, redirect based on role
      const checkRoleAndRedirect = async () => {
        const { data: profileData } = await supabase
          .from('perfis')
          .select('tipo_usuario, status_aprovacao')
          .eq('id', user.id)
          .maybeSingle();
        
        const isAdmin = profileData?.tipo_usuario === 'admin' || user.email?.toLowerCase() === 'hogolezcano92@gmail.com';
        const isPhysio = profileData?.tipo_usuario === 'fisioterapeuta';
        const isApproved = profileData?.status_aprovacao === 'aprovado';

        if (isAdmin) {
          navigate('/admin', { replace: true });
        } else if (isPhysio && !isApproved) {
          navigate('/aguardando-aprovacao', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      };
      checkRoleAndRedirect();
    }
  }, [user, authLoading, navigate, isAuthenticating]);

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
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (googleError) throw googleError;
    } catch (err: any) {
      console.error("Erro no login com Google:", err);
      setError('Erro ao entrar com Google: ' + err.message);
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setIsAuthenticating(true);
    setError('');

    const cleanEmail = email.trim();

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (loginError) {
        setIsAuthenticating(false);
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
      
      // Get profile to check role and approval status
      const { data: profileData } = await supabase
        .from('perfis')
        .select('tipo_usuario, status_aprovacao')
        .eq('id', data.user?.id)
        .maybeSingle();

      const isAdmin = profileData?.tipo_usuario === 'admin' || cleanEmail.toLowerCase() === 'hogolezcano92@gmail.com';
      const isPhysio = profileData?.tipo_usuario === 'fisioterapeuta';
      const isApproved = profileData?.status_aprovacao === 'aprovado';

      // Check for redirect in URL
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirectTo');
      
      if (redirectTo) {
        navigate(redirectTo, { replace: true });
      } else if (isAdmin) {
        navigate('/admin', { replace: true });
      } else if (isPhysio && !isApproved) {
        navigate('/aguardando-aprovacao', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      console.error("Erro no login:", err);
      setError('Ocorreu um erro inesperado. Verifique sua conexão.');
      setIsAuthenticating(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isAuthenticating && <SplashScreen />}
      </AnimatePresence>
      
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-8">
        <div className="w-full max-w-[420px]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="bg-white p-8 sm:p-10 rounded-2xl shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_2px_4px_rgba(0,0,0,0.03),0_12px_24px_rgba(0,0,0,0.04)]"
          >
            <div className="text-center mb-8">
              <div className="flex justify-center mb-5">
                <Logo size="lg" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Bem-vindo de volta</h2>
              <p className="text-sm text-slate-500 mt-1.5">Acesse sua conta para continuar.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm placeholder:text-slate-400"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm placeholder:text-slate-400"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-lg">
                  <div className="w-1 h-1 mt-1.5 rounded-full bg-red-500 shrink-0" />
                  <p className="text-sm text-red-700 leading-relaxed">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-slate-900 text-white rounded-lg font-medium text-sm hover:bg-slate-800 active:bg-slate-950 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Entrar'}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-100"></span>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-slate-400 font-medium uppercase tracking-wider">ou</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
                Continuar com Google
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading || loading || countdown > 0}
                  className="text-sm text-slate-500 font-medium hover:text-slate-700 disabled:opacity-50 transition-colors"
                >
                  {resetLoading 
                    ? 'Enviando e-mail...' 
                    : countdown > 0 
                      ? `Aguarde ${countdown}s` 
                      : 'Esqueceu sua senha?'}
                </button>
              </div>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-center text-sm text-slate-500">
                Não tem uma conta?{' '}
                <Link to="/register" className="text-blue-600 font-medium hover:text-blue-700 transition-colors">
                  Criar conta
                </Link>
              </p>
            </div>
          </motion.div>

          <p className="text-center mt-6 text-xs text-slate-400">
            Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade.
          </p>
        </div>
      </div>
    </>
  );
}
