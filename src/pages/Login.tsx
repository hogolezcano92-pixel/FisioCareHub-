import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Mail, Lock, Loader2, Chrome } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Por favor, digite seu e-mail para redefinir a senha.');
      return;
    }

    setResetLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      import('sonner').then(({ toast }) => toast.success('E-mail de redefinição enviado! Verifique sua caixa de entrada.'));
    } catch (err: any) {
      console.error("Erro ao enviar e-mail de redefinição:", err);
      if (err.code === 'auth/user-not-found') {
        setError('E-mail não encontrado em nossa base.');
      } else {
        setError('Erro ao enviar e-mail de redefinição. Tente novamente.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const isNewUser = !userSnap.exists();
      
      if (isNewUser) {
        const userPath = `users/${user.uid}`;
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            name: user.displayName || 'Usuário',
            role: 'patient', // Default role for Google login if not registered
            createdAt: new Date().toISOString(),
            photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
            bio: '',
            documents: []
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, userPath);
        }
      }
      
      const welcomeMsg = isNewUser ? 'Bem-vindo ao FisioCareHub!' : `Bem-vindo de volta, ${user.displayName || 'Usuário'}!`;
      import('sonner').then(({ toast }) => toast.success(welcomeMsg));
      
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      import('sonner').then(({ toast }) => toast.success('Login realizado com sucesso!'));
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Erro no login:", err);
      
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos. Verifique se digitou corretamente ou se já possui uma conta.');
      } else if (err.code === 'auth/invalid-email') {
        setError('E-mail inválido.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('O login por e-mail está desativado no momento.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas sem sucesso. Tente novamente mais tarde.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Erro de conexão com o Firebase. Verifique sua internet ou se há algum bloqueador de anúncios (AdBlock) impedindo a conexão.');
      } else {
        setError(err.message || 'Ocorreu um erro ao entrar em sua conta.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900">Bem-vindo de volta</h2>
          <p className="text-base text-slate-500 mt-2">Acesse sua conta para continuar.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-base font-semibold text-slate-700 mb-2">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-base"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-base font-semibold text-slate-700 mb-2">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-base"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-4 rounded-2xl">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Entrar'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetLoading || loading}
              className="text-base text-blue-600 font-semibold hover:underline disabled:opacity-50 transition-all"
            >
              {resetLoading ? 'Enviando e-mail...' : 'Esqueci minha senha / Recuperar acesso'}
            </button>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500 font-medium">Ou continue com</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-5 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <Chrome size={24} className="text-blue-600" />
            Entrar com Google
          </button>
        </form>

        <p className="text-center mt-8 text-base text-slate-500">
          Não tem uma conta? <Link to="/register" className="text-blue-600 font-bold hover:underline">Cadastrar</Link>
        </p>
      </motion.div>
    </div>
  );
}
