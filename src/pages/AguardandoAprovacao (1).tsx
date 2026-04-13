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
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-12 relative z-10"
      >
        <Logo size="lg" />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', damping: 20 }}
        className="max-w-xl w-full bg-white/5 backdrop-blur-2xl rounded-[3rem] p-12 text-center border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative z-10"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-[3rem] pointer-events-none"></div>
        
        <div className="relative">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
            className={`w-28 h-28 ${isRejected ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'} rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 border shadow-2xl`}
          >
            {isRejected ? <ShieldAlert size={56} className="drop-shadow-lg" /> : <Clock size={56} className="animate-pulse drop-shadow-lg" />}
          </motion.div>

          <h1 className="text-4xl font-black text-white mb-6 tracking-tight leading-tight">
            {isRejected ? (
              <>Cadastro <span className="text-rose-400 italic">Rejeitado</span></>
            ) : (
              <>Cadastro em <span className="text-blue-400 italic">Análise</span></>
            )}
          </h1>
          
          <p className="text-slate-400 font-medium leading-relaxed mb-12 text-lg">
            {isRejected 
              ? 'Infelizmente seu cadastro não foi aprovado pela nossa equipe administrativa. Entre em contato com o suporte para entender os motivos ou reenviar seus dados.'
              : 'Seu cadastro foi recebido com sucesso! Nossa equipe está validando seu CREFITO e documentos. Você receberá um e-mail assim que seu acesso for liberado.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a 
              href="https://wa.me/5511999999999" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-900/20 hover:bg-blue-500 hover:scale-[1.02] active:scale-95 transition-all border border-white/10"
            >
              <MessageCircle size={22} />
              Suporte WhatsApp
            </a>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-3 py-5 bg-white/5 text-white rounded-2xl font-black hover:bg-white/10 hover:scale-[1.02] active:scale-95 transition-all border border-white/10"
            >
              <LogOut size={22} />
              Sair da Conta
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-16 flex flex-col items-center gap-4 relative z-10"
      >
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sistema de Verificação Ativo</span>
        </div>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">
          FisioCareHub &copy; {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  );
}
