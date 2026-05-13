import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Lock, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const extractHashParams = (hash: string) => {
    const raw = hash.startsWith('#') ? hash.slice(1) : hash;
    return new URLSearchParams(raw);
  };

  useEffect(() => {
    const setupRecoverySession = async () => {
      setCheckingLink(true);
      setError('');
      try {
        const query = new URLSearchParams(location.search);
        const hashParams = extractHashParams(window.location.hash);
        const code = query.get('code');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const hashType = hashParams.get('type');

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (accessToken && refreshToken && hashType === 'recovery') {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setSessionError) throw setSessionError;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setRecoveryReady(false);
          setError('Link de recuperação inválido ou expirado. Solicite um novo link.');
          return;
        }

        setRecoveryReady(true);
      } catch (err: any) {
        console.error('Erro ao validar link de recuperação:', err);
        setRecoveryReady(false);
        setError(err?.message || 'Não foi possível validar o link de recuperação.');
      } finally {
        setCheckingLink(false);
      }
    };

    setupRecoverySession();
  }, [location.search]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (!recoveryReady) {
      setError('Sessão de recuperação não encontrada. Solicite um novo link.');
      return;
    }

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      setSuccess(true);
      const { toast } = await import('sonner');
      toast.success('Senha atualizada com sucesso');
      
      setTimeout(() => navigate('/login'), 1800);
    } catch (err: any) {
      console.error("Erro ao redefinir senha:", err);
      const message = String(err?.message || '');
      if (message.toLowerCase().includes('expired')) {
        setError('Link de recuperação expirado. Solicite um novo link.');
      } else if (message.toLowerCase().includes('session')) {
        setError('Sessão de recuperação inválida. Abra novamente o link recebido por e-mail.');
      } else {
        setError('Erro ao redefinir senha: ' + message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingLink) {
    return (
      <div className="max-w-md mx-auto pt-20">
        <div className="bg-slate-900/50 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl border border-white/10 text-center">
          <Loader2 className="animate-spin mx-auto text-blue-400 mb-4" />
          <p className="text-slate-300 font-semibold">Validando link de recuperação...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto pt-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900/50 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl border border-white/10 text-center"
        >
          <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Senha Redefinida!</h2>
          <p className="text-slate-300 mb-8 font-medium">
            Sua senha foi atualizada com sucesso. Você será redirecionado para a tela de login em instantes.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20"
          >
            Ir para Login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pt-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] shadow-2xl border border-white/10"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            <Lock size={32} />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">Nova Senha</h2>
          <p className="text-base text-slate-300 mt-2 font-medium">Digite sua nova senha de acesso.</p>
        </div>

        <form onSubmit={handleReset} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">Nova Senha</label>
            <div className="relative">
              <Lock 
                className="absolute pointer-events-none z-20" 
                style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#94a3b8' }}
              />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white !pl-[60px]"
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">Confirmar Nova Senha</label>
            <div className="relative">
              <Lock 
                className="absolute pointer-events-none z-20" 
                style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#94a3b8' }}
              />
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white !pl-[60px]"
                placeholder="Repita a nova senha"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20">
              <AlertCircle size={18} className="shrink-0" />
              <p className="font-bold">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !recoveryReady}
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : (recoveryReady ? 'Redefinir Senha' : 'Link inválido')}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
