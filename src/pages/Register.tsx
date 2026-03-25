import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { User, Stethoscope, Mail, Lock, UserCircle, Loader2, Chrome } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Register() {
  const [role, setRole] = useState<'patient' | 'physiotherapist'>('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGoogleRegister = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user already exists in Firestore
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      
      if (!userSnap.exists()) {
        const userPath = `users/${user.uid}`;
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            name: user.displayName || 'Usuário',
            role,
            createdAt: new Date().toISOString(),
            photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
            bio: '',
            documents: []
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, userPath);
        }
      }
      
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Parallelize profile update and Firestore document creation
      const profilePromise = updateProfile(user, { displayName: name });
      const firestorePromise = setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email,
        name,
        role,
        createdAt: new Date().toISOString(),
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
        bio: '',
        documents: []
      });

      // Wait for essential data to be saved
      await Promise.all([profilePromise, firestorePromise]);

      // Send email verification in the background (non-blocking)
      sendEmailVerification(user).catch(authErr => {
        console.error("Erro ao enviar e-mail de verificação:", authErr);
      });

      alert("Conta criada com sucesso! Verifique seu e-mail (incluindo Spam) para confirmar seu cadastro.");
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Erro no cadastro:", err);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/invalid-email') {
        setError('E-mail inválido.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('O cadastro por e-mail está desativado no momento.');
      } else {
        try {
          const parsedError = JSON.parse(err.message);
          setError(`Erro no banco de dados: ${parsedError.error}`);
        } catch {
          setError(err.message || 'Ocorreu um erro ao criar sua conta.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900">Criar Conta</h2>
          <p className="text-slate-500 mt-2">Escolha seu perfil e comece agora.</p>
        </div>

        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setRole('patient')}
            className={cn(
              "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
              role === 'patient' 
                ? "border-blue-600 bg-blue-50 text-blue-600" 
                : "border-slate-100 text-slate-500 hover:border-slate-200"
            )}
          >
            <User size={24} />
            <span className="font-bold text-sm">Paciente</span>
          </button>
          <button
            onClick={() => setRole('physiotherapist')}
            className={cn(
              "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
              role === 'physiotherapist' 
                ? "border-blue-600 bg-blue-50 text-blue-600" 
                : "border-slate-100 text-slate-500 hover:border-slate-200"
            )}
          >
            <Stethoscope size={24} />
            <span className="font-bold text-sm">Fisioterapeuta</span>
          </button>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Completo</label>
            <div className="relative">
              <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                placeholder="Seu nome"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Criar Conta'}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">Ou continue com</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleRegister}
            disabled={loading}
            className="w-full py-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <Chrome size={20} className="text-blue-600" />
            Entrar com Google
          </button>
        </form>

        <p className="text-center mt-6 text-slate-500">
          Já tem uma conta? <Link to="/login" className="text-blue-600 font-bold hover:underline">Entrar</Link>
        </p>
      </motion.div>
    </div>
  );
}
