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
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [city, setCity] = useState('');
  const [serviceType, setServiceType] = useState<'domicilio' | 'online' | 'ambos'>('ambos');
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

      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const isNewUser = !userSnap.exists();
      
      if (isNewUser) {
        const userPath = `users/${user.uid}`;
        const userDocData = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || 'Usuário',
          role,
          gender: role === 'physiotherapist' ? gender : '',
          specialty: role === 'physiotherapist' ? specialty : '',
          city: role === 'physiotherapist' ? city : '',
          serviceType: role === 'physiotherapist' ? serviceType : '',
          createdAt: new Date().toISOString(),
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
          bio: '',
          documents: [],
          status: role === 'physiotherapist' ? 'pending_approval' : 'active'
        };

        try {
          await setDoc(doc(db, 'users', user.uid), userDocData);
          if (role === 'physiotherapist') {
            await setDoc(doc(db, 'physiotherapists', user.uid), {
              ...userDocData,
              status: 'pending_approval',
              approved: false,
              rating: 5.0,
              reviews: 0,
              experience: 'Iniciante',
              availability: 'Segunda a Sexta',
              price: 0
            });
          }
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Parallelize profile update and Firestore document creation
      const profilePromise = updateProfile(user, { displayName: name });
      const userDocData = {
        uid: user.uid,
        email,
        name,
        role,
        gender: role === 'physiotherapist' ? gender : '',
        specialty: role === 'physiotherapist' ? specialty : '',
        city: role === 'physiotherapist' ? city : '',
        serviceType: role === 'physiotherapist' ? serviceType : '',
        createdAt: new Date().toISOString(),
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
        bio: '',
        documents: [],
        status: role === 'physiotherapist' ? 'pending_approval' : 'active'
      };

      const firestorePromise = setDoc(doc(db, 'users', user.uid), userDocData);
      
      let physioPromise = Promise.resolve();
      if (role === 'physiotherapist') {
        physioPromise = setDoc(doc(db, 'physiotherapists', user.uid), {
          ...userDocData,
          status: 'pending_approval',
          approved: false,
          rating: 5.0,
          reviews: 0,
          experience: 'Iniciante',
          availability: 'Segunda a Sexta',
          price: 0
        });
      }

      // Wait for essential data to be saved
      await Promise.all([profilePromise, firestorePromise, physioPromise]);

      // Send Welcome Email
      try {
        await fetch('/api/notify/appointment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email,
            subject: 'Bem-vindo(a) ao FisioCareHub!',
            body: `
              <div style="font-family: sans-serif; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
                <h2 style="color: #2563eb; margin-bottom: 16px;">Olá, ${name}!</h2>
                <p>Seja muito bem-vindo(a) ao <strong>FisioCareHub</strong>, sua plataforma completa para fisioterapia.</p>
                <p>Estamos muito felizes em ter você conosco. ${role === 'physiotherapist' ? 'Seu perfil está em análise e em breve você receberá uma atualização.' : 'Agora você já pode buscar por profissionais e agendar suas consultas.'}</p>
                <div style="margin-top: 24px; padding: 16px; background-color: #f8fafc; border-radius: 8px;">
                  <p style="margin: 0; font-weight: bold; color: #475569;">O que você pode fazer agora:</p>
                  <ul style="margin-top: 8px; color: #64748b;">
                    ${role === 'physiotherapist' 
                      ? '<li>Aguardar a aprovação do seu perfil</li><li>Explorar o painel do fisioterapeuta</li><li>Configurar sua bio e especialidades</li>'
                      : '<li>Buscar fisioterapeutas por especialidade</li><li>Agendar sua primeira consulta</li><li>Acompanhar seu histórico de saúde</li>'}
                  </ul>
                </div>
                <p style="margin-top: 24px;">Se precisar de qualquer ajuda, nossa equipe de suporte está à disposição.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="font-size: 12px; color: #94a3b8; text-align: center;">FisioCareHub - Conectando saúde e bem-estar.</p>
              </div>
            `
          })
        });
      } catch (emailErr) {
        console.error("Erro ao enviar e-mail de boas-vindas:", emailErr);
      }

      import('sonner').then(({ toast }) => toast.success('Conta criada com sucesso! Bem-vindo(a).'));

      // Send email verification in the background (non-blocking)
      sendEmailVerification(user).catch(authErr => {
        console.error("Erro ao enviar e-mail de verificação:", authErr);
      });

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
      } else if (err.code === 'auth/network-request-failed') {
        setError('Erro de conexão com o Firebase. Verifique sua internet ou se há algum bloqueador de anúncios (AdBlock) impedindo a conexão.');
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
          {role === 'physiotherapist' && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Como você prefere ser chamado(a)?</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-sm font-bold border transition-all",
                    gender === 'male' ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  Dr.
                </button>
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-sm font-bold border transition-all",
                    gender === 'female' ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  Dra.
                </button>
              </div>
            </div>
          )}
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

          {role === 'physiotherapist' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Especialidade</label>
                <input
                  type="text"
                  required
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                  placeholder="Ex: Ortopedia, Neuro..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Cidade</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                  placeholder="Sua cidade"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Atendimento</label>
                <select
                  value={serviceType}
                  onChange={(e: any) => setServiceType(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                >
                  <option value="domicilio">A Domicílio</option>
                  <option value="online">Online</option>
                  <option value="ambos">Ambos</option>
                </select>
              </div>
            </motion.div>
          )}

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
