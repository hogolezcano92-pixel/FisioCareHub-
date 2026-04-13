import { motion } from 'motion/react';
import { ShieldAlert, Clock, LogOut, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

export default function AguardandoAprovacao() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const isRejected = profile?.status_aprovacao === 'rejeitado';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="mb-12">
        <Logo />
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 p-10 text-center border border-slate-100"
      >
        <div className={`w-24 h-24 ${isRejected ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'} rounded-[2rem] flex items-center justify-center mx-auto mb-8`}>
          {isRejected ? <ShieldAlert size={48} /> : <Clock size={48} />}
        </div>

        <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">
          {isRejected ? 'Cadastro Rejeitado' : 'Cadastro em Análise'}
        </h1>
        
        <p className="text-slate-500 font-medium leading-relaxed mb-10">
          {isRejected 
            ? 'Infelizmente seu cadastro não foi aprovado pela nossa equipe administrativa. Entre em contato com o suporte para mais informações.'
            : 'Seu cadastro está em análise e precisa ser aprovado pelo administrador antes de acessar o sistema completo.'}
        </p>

        <div className="space-y-4">
          <a 
            href="https://wa.me/5511999999999" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-5 bg-emerald-500 text-white rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all"
          >
            <MessageCircle size={20} />
            Falar com Suporte
          </a>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-3 w-full py-5 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all"
          >
            <LogOut size={20} />
            Sair da Conta
          </button>
        </div>
      </motion.div>

      <p className="mt-12 text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
        FisioCareHub &copy; {new Date().getFullYear()}
      </p>
    </div>
  );
}
