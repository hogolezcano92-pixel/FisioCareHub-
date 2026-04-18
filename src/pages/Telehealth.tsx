import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Video, 
  Mic, 
  MicOff, 
  VideoOff, 
  PhoneOff, 
  MessageSquare, 
  Users, 
  Settings, 
  Maximize,
  ArrowLeft,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export default function Telehealth() {
  const location = useLocation();
  const navigate = useNavigate();
  const [room, setRoom] = useState<string>('');
  const [isJoined, setIsJoined] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roomName = params.get('room') || 'FisioCare-Geral';
    setRoom(roomName);
    
    // Simulate loading/joining
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [location.search]);

  const handleJoin = () => {
    setIsJoined(true);
    toast.success('Você entrou na sala de atendimento!');
  };

  const handleLeave = () => {
    toast.info('Atendimento encerrado.');
    navigate('/chat');
  };

  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 bg-blue-500/10 rounded-3xl flex items-center justify-center animate-pulse border border-blue-500/20">
          <Video className="text-blue-400" size={32} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-blue-500" size={24} />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Preparando sala segura...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden relative">
      {/* Header */}
      <header className="px-6 py-4 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
              Teleconsulta: {room}
              <span className="flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <ShieldCheck size={10} className="text-emerald-400" />
                <span className="text-[7px] text-emerald-400 font-black uppercase tracking-widest">Protegido</span>
              </span>
            </h2>
            <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">Criptografia de ponta a ponta ativa</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg flex items-center gap-2">
            <Users size={14} className="text-slate-500" />
            <span className="text-xs font-bold text-white">2</span>
          </div>
        </div>
      </header>

      {/* Video Content */}
      <main className="flex-1 relative bg-slate-900 flex items-center justify-center p-4">
        {!isJoined ? (
          <div className="max-w-md w-full glass-card p-10 text-center space-y-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
            <div className="relative mx-auto w-40 h-40">
              <div className="absolute inset-0 bg-blue-600/20 rounded-full animate-ping opacity-25"></div>
              <div className="relative w-full h-full bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-700 shadow-inner overflow-hidden">
                {isVideoOn ? (
                  <img src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=200" className="w-full h-full object-cover" alt="Preview" referrerPolicy="no-referrer" />
                ) : (
                  <VideoOff size={48} className="text-slate-600" />
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-2xl font-black text-white tracking-tight">Pronto para começar?</h3>
              <p className="text-slate-400 text-xs font-medium leading-relaxed">Verifique sua câmera e microfone antes de entrar na sala de atendimento.</p>
            </div>

            <div className="flex justify-center gap-4">
              <button 
                onClick={() => setIsMicOn(!isMicOn)}
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border",
                  isMicOn ? "bg-white/5 text-slate-300 border-white/10" : "bg-red-500/10 text-red-400 border-red-500/20"
                )}
              >
                {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              <button 
                onClick={() => setIsVideoOn(!isVideoOn)}
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border",
                  isVideoOn ? "bg-white/5 text-slate-300 border-white/10" : "bg-red-500/10 text-red-400 border-red-500/20"
                )}
              >
                {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
              </button>
            </div>

            <button 
              onClick={handleJoin}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-900/40 transition-all flex items-center justify-center gap-2 group"
            >
              Entrar Agora
              <ArrowLeft className="rotate-180 group-hover:translate-x-1 transition-transform" size={16} />
            </button>
          </div>
        ) : (
          <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User Video (Small) */}
            <div className="relative bg-slate-800 rounded-3xl overflow-hidden border border-white/5 group shadow-2xl">
              <div className="absolute top-4 left-4 z-10">
                <span className="px-3 py-1 bg-slate-900/60 backdrop-blur-md rounded-lg text-[10px] font-black text-white uppercase tracking-widest border border-white/10">Você</span>
              </div>
              {isVideoOn ? (
                <img 
                  src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=2070" 
                  className="w-full h-full object-cover" 
                  alt="My Video" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-900">
                  <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-700">
                    <VideoOff size={32} className="text-slate-600" />
                  </div>
                </div>
              )}
              {!isMicOn && (
                <div className="absolute bottom-4 right-4 bg-red-500 p-2 rounded-xl shadow-lg">
                  <MicOff size={14} className="text-white" />
                </div>
              )}
            </div>

            {/* Remote Video (Large) */}
            <div className="relative bg-[#0F172A] rounded-3xl overflow-hidden border border-white/5 group shadow-2xl">
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-600/60 backdrop-blur-md rounded-lg text-[10px] font-black text-white uppercase tracking-widest border border-blue-500/30">Dra. Amanda Oliveira</span>
              </div>
              <img 
                src="https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=2070" 
                className="w-full h-full object-cover" 
                alt="Physio Video" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-4 right-4">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/40"></div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Controls Footer */}
      <footer className="h-24 bg-slate-900/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-center px-6 z-20">
        <div className="flex items-center gap-3 sm:gap-6">
          <button 
            onClick={() => setIsMicOn(!isMicOn)}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border shadow-lg",
              isMicOn ? "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10" : "bg-red-500/10 text-red-500 border-red-500/20"
            )}
          >
            {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          
          <button 
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border shadow-lg",
              isVideoOn ? "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10" : "bg-red-500/10 text-red-500 border-red-500/20"
            )}
          >
            {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          <button 
            onClick={handleLeave}
            className="w-16 h-12 bg-red-600 hover:bg-red-700 text-white rounded-2xl flex items-center justify-center transition-all shadow-xl shadow-red-900/30 border border-red-500/20"
          >
            <PhoneOff size={24} />
          </button>

          <div className="w-px h-8 bg-white/10 mx-2 hidden sm:block"></div>

          <button className="w-12 h-12 bg-white/5 text-slate-400 hover:text-white rounded-2xl flex items-center justify-center transition-all border border-transparent hover:border-white/10 hidden sm:flex">
            <MessageSquare size={20} />
          </button>
          
          <button className="w-12 h-12 bg-white/5 text-slate-400 hover:text-white rounded-2xl flex items-center justify-center transition-all border border-transparent hover:border-white/10 hidden sm:flex">
            <Maximize size={20} />
          </button>
          
          <button className="w-12 h-12 bg-white/5 text-slate-400 hover:text-white rounded-2xl flex items-center justify-center transition-all border border-transparent hover:border-white/10">
            <Settings size={20} />
          </button>
        </div>
      </footer>
    </div>
  );
}
