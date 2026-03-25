import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { 
  User, 
  Stethoscope, 
  FileText, 
  BrainCircuit, 
  Plus, 
  Search,
  Users,
  Clock,
  ChevronRight,
  Calendar as CalendarIcon,
  MessageSquare,
  MessageCircle,
  AlertCircle,
  Mail,
  Crown
} from 'lucide-react';
import { sendEmailVerification } from 'firebase/auth';
import { Link } from 'react-router-dom';
import { formatDate } from '../lib/utils';

export default function Dashboard() {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ records: 0, triages: 0 });

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        try {
          // Fetch user data first to get the role
          const userSnap = await getDoc(doc(db, 'users', user.uid));
          
          if (userSnap.exists()) {
            const data = userSnap.data();
            setUserData(data);

            // Fetch stats in parallel
            const recordsQuery = query(
              collection(db, 'records'), 
              where(data.role === 'patient' ? 'patientId' : 'physioId', '==', user.uid)
            );
            
            const triagesQuery = query(
              collection(db, 'triages'),
              where('patientId', '==', user.uid)
            );

            const [recordsSnap, triagesSnap] = await Promise.all([
              getDocs(recordsQuery),
              getDocs(triagesQuery)
            ]);

            setStats({
              records: recordsSnap.size,
              triages: triagesSnap.size
            });
          }
        } catch (err) {
          console.error("Erro ao carregar dados do dashboard:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [user]);

  if (loading) return <div className="flex justify-center pt-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  const isPhysio = userData?.role === 'physiotherapist';

  const resendVerification = async () => {
    if (user) {
      try {
        await sendEmailVerification(user);
        alert("E-mail de verificação reenviado!");
      } catch (err) {
        alert("Erro ao reenviar e-mail. Tente novamente mais tarde.");
      }
    }
  };

  return (
    <div className="space-y-8">
      {user && !user.emailVerified && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 text-amber-800">
            <AlertCircle size={24} />
            <div>
              <p className="font-bold">E-mail não verificado</p>
              <p className="text-sm">Verifique sua caixa de entrada para confirmar seu cadastro e liberar todas as funções.</p>
            </div>
          </div>
          <button
            onClick={resendVerification}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 transition-colors"
          >
            <Mail size={16} /> Reenviar E-mail
          </button>
        </motion.div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Olá, {userData?.name}!</h1>
          <p className="text-slate-500">Bem-vindo ao seu painel de {isPhysio ? 'fisioterapeuta' : 'paciente'}.</p>
        </div>
        <div className="flex gap-3">
          {isPhysio ? (
            <Link to="/records" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100">
              <Plus size={20} /> Novo Prontuário
            </Link>
          ) : (
            <Link to="/triage" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100">
              <BrainCircuit size={20} /> Nova Triagem IA
            </Link>
          )}
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <FileText size={24} />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.records}</div>
          <div className="text-slate-500 text-sm">Prontuários</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
            <CalendarIcon size={24} />
          </div>
          <div className="text-2xl font-bold text-slate-900">Agenda</div>
          <Link to="/appointments" className="text-blue-600 text-xs font-bold hover:underline">Ver horários</Link>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
            <MessageSquare size={24} />
          </div>
          <div className="text-2xl font-bold text-slate-900">Chat</div>
          <Link to="/chat" className="text-blue-600 text-xs font-bold hover:underline">Abrir conversa</Link>
        </div>
        {isPhysio && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="w-12 h-12 bg-white/10 text-blue-400 rounded-2xl flex items-center justify-center mb-4">
              <Crown size={24} />
            </div>
            <div className="text-2xl font-bold">Assinatura</div>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-slate-400 text-sm">
                {userData?.subscription?.plan ? `Plano ${userData.subscription.plan.toUpperCase()}` : 'Plano Gratuito'}
              </div>
              {(!userData?.subscription?.plan || userData?.subscription?.plan === 'free') && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/30">
                  LIMITADO
                </span>
              )}
            </div>
            <Link to="/subscription" className="text-blue-400 text-xs font-bold hover:text-blue-300 flex items-center gap-1">
              Gerenciar <ChevronRight size={14} />
            </Link>
          </div>
        )}
        {!isPhysio && (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
              <BrainCircuit size={24} />
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.triages}</div>
            <div className="text-slate-500 text-sm">Triagens IA</div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-8">
        <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText size={20} className="text-blue-600" />
              Atividades
            </h2>
            <Link to="/records" className="text-blue-600 text-sm font-bold hover:underline">Ver tudo</Link>
          </div>
          <div className="p-6">
            {stats.records === 0 ? (
              <div className="text-center py-10">
                <p className="text-slate-400">Nenhuma atividade.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-500 italic">Acesse prontuários para detalhes.</p>
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BrainCircuit size={20} className="text-purple-600" />
              Triagem IA
            </h2>
          </div>
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <BrainCircuit size={32} />
            </div>
            <h3 className="text-lg font-bold mb-2">Como você está?</h3>
            <p className="text-slate-500 text-sm mb-6">
              Nossa IA ajuda a orientar seu tratamento.
            </p>
            <Link to="/triage" className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors">
              Iniciar <ChevronRight size={18} />
            </Link>
          </div>
        </section>

        <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MessageCircle size={20} className="text-emerald-600" />
              Suporte
            </h2>
          </div>
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle size={32} />
            </div>
            <h3 className="text-lg font-bold mb-2">Dúvidas?</h3>
            <p className="text-slate-500 text-sm mb-6">
              Fale conosco diretamente pelo WhatsApp.
            </p>
            <a 
              href="https://wa.me/5511984040563" 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors"
            >
              WhatsApp <ChevronRight size={18} />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
