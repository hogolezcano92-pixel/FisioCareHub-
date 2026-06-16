import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Send, 
  MessageCircle, 
  Loader2, 
  Calendar, 
  User, 
  HelpCircle,
  Maximize2,
  Minimize2,
  Mic,
  MicOff
} from 'lucide-react';
import { kineAIService } from '../services/kineAI';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

interface KineAIProps {
  externalForceOpen?: boolean;
  onClose?: () => void;
}

// Componente Visual do Novo Ícone da KineAI (Gemini-like original, premium e responsivo)
export const KineIcon = ({ size = "md", active = false, className }: { size?: "xs" | "sm" | "md" | "lg", active?: boolean, className?: string }) => {
  const dimensions = {
    xs: "w-7 h-7 rounded-[0.65rem]",
    sm: "w-10 h-10 rounded-2xl",
    md: "w-14 h-14 rounded-[1.25rem]",
    lg: "w-20 h-20 rounded-[1.75rem]"
  }[size];

  const sparkleSize = {
    xs: "w-[72%] h-[72%]",
    sm: "w-[74%] h-[74%]",
    md: "w-[76%] h-[76%]",
    lg: "w-[78%] h-[78%]"
  }[size];

  const rawId = React.useId().replace(/:/g, '');
  const starGradientId = `kine-star-gradient-${rawId}`;
  const starGlowId = `kine-star-glow-${rawId}`;
  const bgGradientId = `kine-bg-gradient-${rawId}`;
  const glassGradientId = `kine-glass-gradient-${rawId}`;

  return (
    <div className={cn("relative flex items-center justify-center shrink-0", dimensions, className)}>
      {/* Halo premium externo */}
      <motion.div
        aria-hidden="true"
        animate={{
          scale: active ? [1, 1.22, 1] : [1, 1.08, 1],
          opacity: active ? [0.35, 0.68, 0.35] : [0.18, 0.32, 0.18],
        }}
        transition={{ repeat: Infinity, duration: active ? 1.8 : 4.5, ease: "easeInOut" }}
        className="absolute -inset-2 rounded-[inherit] bg-[radial-gradient(circle,rgba(34,211,238,0.38),rgba(124,58,237,0.24),transparent_68%)] blur-xl"
      />

      {/* Tile escuro igual ao mockup: premium no tema claro e no dark */}
      <div className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden rounded-[inherit] border border-white/20 bg-[#07142d] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_14px_34px_-16px_rgba(37,99,235,0.75),0_8px_18px_-14px_rgba(15,23,42,0.95)] dark:border-white/10 dark:bg-[#050b1d]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" fill="none" aria-hidden="true">
          <defs>
            <radialGradient id={bgGradientId} cx="50%" cy="40%" r="72%">
              <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.96" />
              <stop offset="42%" stopColor="#0f1d48" stopOpacity="0.98" />
              <stop offset="100%" stopColor="#030712" stopOpacity="1" />
            </radialGradient>
            <linearGradient id={glassGradientId} x1="12" y1="8" x2="88" y2="92" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
              <stop offset="42%" stopColor="#ffffff" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill={`url(#${bgGradientId})`} />
          <circle cx="24" cy="18" r="22" fill="#8b5cf6" opacity="0.16" />
          <circle cx="76" cy="76" r="24" fill="#22d3ee" opacity="0.12" />
          <path d="M10 0H100V58C78 38 46 30 10 34V0Z" fill={`url(#${glassGradientId})`} />
        </svg>

        {/* Partículas discretas no fundo */}
        <span className="absolute left-[24%] top-[28%] h-0.5 w-0.5 rounded-full bg-cyan-200/70 shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
        <span className="absolute right-[27%] top-[31%] h-0.5 w-0.5 rounded-full bg-violet-200/70 shadow-[0_0_8px_rgba(167,139,250,0.7)]" />
        <span className="absolute bottom-[27%] right-[31%] h-0.5 w-0.5 rounded-full bg-sky-200/60 shadow-[0_0_8px_rgba(56,189,248,0.7)]" />

        {/* Estrela IA original inspirada no estilo premium da imagem */}
        <motion.svg
          className={cn("relative z-10 drop-shadow-[0_0_14px_rgba(34,211,238,0.85)]", sparkleSize)}
          viewBox="0 0 100 100"
          fill="none"
          animate={{
            scale: active ? [0.96, 1.07, 0.96] : [0.98, 1.02, 0.98],
            rotate: active ? [0, 1.5, -1.5, 0] : [0, 0.65, -0.65, 0],
          }}
          transition={{ repeat: Infinity, duration: active ? 1.6 : 4.2, ease: "easeInOut" }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={starGradientId} x1="22" y1="12" x2="76" y2="86" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f5d0fe" />
              <stop offset="20%" stopColor="#a855f7" />
              <stop offset="53%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
            <linearGradient id={`kine-star-shine-${rawId}`} x1="20" y1="16" x2="78" y2="82" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="42%" stopColor="#ffffff" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <filter id={starGlowId} x="-30" y="-30" width="160" height="160" colorInterpolationFilters="sRGB">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.25 0 0 0 0 0.66 0 0 0 0 1 0 0 0 0.92 0" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            d="M50 5C55.7 34.2 65.8 44.3 95 50C65.8 55.7 55.7 65.8 50 95C44.3 65.8 34.2 55.7 5 50C34.2 44.3 44.3 34.2 50 5Z"
            fill={`url(#${starGradientId})`}
            filter={`url(#${starGlowId})`}
          />
          <path
            d="M50 12C55.1 36.2 63.8 44.9 88 50C63.8 55.1 55.1 63.8 50 88C44.9 63.8 36.2 55.1 12 50C36.2 44.9 44.9 36.2 50 12Z"
            fill={`url(#kine-star-shine-${rawId})`}
            opacity="0.22"
          />
          <path
            d="M50 5C55.7 34.2 65.8 44.3 95 50C65.8 55.7 55.7 65.8 50 95C44.3 65.8 34.2 55.7 5 50C34.2 44.3 44.3 34.2 50 5Z"
            stroke="rgba(255,255,255,0.72)"
            strokeWidth="1.2"
          />
          <path d="M50 14C52.5 30.5 60.5 42.5 78 49.5" stroke="rgba(255,255,255,0.72)" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
        </motion.svg>

        {/* Brilho horizontal sutil nas pontas, igual ao mockup */}
        <div className="absolute left-[14%] right-[14%] top-1/2 z-[9] h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent blur-[1px]" />
      </div>

      {active && (
        <motion.div
          aria-hidden="true"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1.45, opacity: [0, 0.28, 0] }}
          transition={{ repeat: Infinity, duration: 1.55 }}
          className="absolute inset-0 rounded-[inherit] border border-cyan-300/50"
        />
      )}
    </div>
  );
};

const NOISE_SVG = "data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E";

export default function KineAI({ externalForceOpen, onClose }: KineAIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (externalForceOpen !== undefined) {
      setIsOpen(externalForceOpen);
    }
  }, [externalForceOpen]);

  // Voice Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.lang = 'pt-BR';
      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => prev + (prev ? ' ' : '') + transcript);
        setIsRecording(false);
      };
      rec.onend = () => setIsRecording(false);
      rec.onerror = () => setIsRecording(false);
      setRecognition(rec);
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognition?.stop();
    } else {
      if (!recognition) {
        toast.error("Reconhecimento de voz não suportado neste navegador.");
        return;
      }
      setIsRecording(true);
      recognition.start();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Olá! Sou a **KineAI**, sua assistente clínica do FisioCareHub. Posso ajudar pacientes com orientações seguras e apoiar fisioterapeutas com raciocínio clínico, SOAP, exercícios, reabilitação, sinais de alerta e dúvidas do app. Como posso ajudar hoje? 🌟',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSendMessage = async (text: string = inputText) => {
    if (!text.trim() || loading) return;

    // Check for commands
    if (text.startsWith('/')) {
      const command = text.toLowerCase().trim();
      if (command === '/triagem') {
        navigate('/triage');
        handleClose();
        return;
      }
      if (command === '/agenda') {
        navigate('/appointments');
        handleClose();
        return;
      }
      if (command === '/ajuda') {
        const helpText = "Aqui estão alguns comandos que posso executar:\n\n- **/triagem**: Iniciar triagem de sintomas\n- **/agenda**: Ver meus agendamentos\n- **/ajuda**: Mostrar esta lista\n\nVocê também pode ditar seus sintomas ou pedir para falar com um humano!";
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: '/ajuda', timestamp: new Date() }]);
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: helpText, timestamp: new Date() }]);
        setInputText('');
        return;
      }
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'model' ? 'assistant' as const : 'user' as const,
        content: m.text
      }));

      const { response: aiResponse, intent } = await kineAIService.processSupportQuery(text, history);
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMsg]);

      // Handle Handoff
      if (intent === 'handoff') {
        if (user) {
          toast.info("Transferindo para um atendente humano...");
          setTimeout(() => {
            navigate('/chat?support=true');
            handleClose();
          }, 1500);
        } else {
          toast.info("Para falar com um atendente, você precisa entrar na sua conta.");
          setTimeout(() => {
            navigate('/login', { state: { from: { pathname: '/chat', search: '?support=true' } } });
            handleClose();
          }, 2000);
        }
      }

    } catch (error) {
      console.error("Erro no chat KineAI:", error);
      toast.error("Ocorreu um erro ao processar sua mensagem.");
    } finally {
      setLoading(false);
    }
  };

  const quickPills = [
    { label: 'Dor Lombar', cmd: 'Sou paciente e estou com dor lombar. Quais sinais de alerta devo observar e o que posso fazer com segurança?' },
    { label: 'Raciocínio Clínico', cmd: 'Sou fisioterapeuta. Me ajude a organizar o raciocínio clínico de um caso musculoesquelético.' },
    { label: 'SOAP', cmd: 'Sou fisioterapeuta. Me ajude a montar um registro SOAP completo e profissional.' },
    { label: 'Encontrar Fisio', cmd: 'Quero encontrar um fisioterapeuta domiciliar' },
    { label: 'Falar com Humano', cmd: 'Gostaria de falar com um atendente humano' },
  ];

  return (
    <>
      {/* Botão Flutuante */}
      {!externalForceOpen && (
        <motion.button
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className={cn(
            "fixed bottom-28 right-5 z-[40] transition-all md:bottom-6 md:right-6",
            isOpen ? "opacity-0 scale-0 pointer-events-none" : "opacity-100 scale-100"
          )}
        >
          <KineIcon size="lg" active={false} />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 z-50 shadow-lg shadow-emerald-900/40" />
        </motion.button>
      )}

      {/* Janela Glassmorphism Chat */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-slate-900/15 dark:bg-slate-950/40 backdrop-blur-md z-[45]"
            >
              {/* Subtle background energy glow */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-300/20 via-blue-200/10 to-transparent dark:from-blue-500/10 dark:via-transparent dark:to-transparent pointer-events-none" />
              <div 
                className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                style={{ backgroundImage: `url("${NOISE_SVG}")` }}
              />
            </motion.div>
            
            <div className="fixed inset-0 flex items-center justify-center z-[50] pointer-events-none p-4 pb-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className={cn(
                  "pointer-events-auto flex flex-col overflow-hidden",
                  "bg-white/95 dark:bg-[#0A0D14]/85 backdrop-blur-[40px] border border-violet-200/70 dark:border-white/10 rounded-[2.5rem]",
                  "shadow-[0_30px_80px_-24px_rgba(99,102,241,0.45),0_0_24px_rgba(34,211,238,0.10)] dark:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8),0_0_20px_rgba(34,211,238,0.1)]",
                  "w-full max-w-[420px] transition-all duration-500",
                  isExpanded ? "md:max-w-[700px] h-[85vh]" : "h-[70vh] max-h-[650px]"
                )}
              >
                {/* Modern Glass Header */}
              <div className="relative p-7 border-b border-violet-100/90 dark:border-white/5">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-200/35 via-blue-100/25 to-transparent dark:from-blue-600/10 dark:via-cyan-500/5 dark:to-transparent pointer-events-none" />
                
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <KineIcon size="md" active={loading} />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-[#0A0D14] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-slate-950 dark:text-white tracking-tight leading-tight">KineAI</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-[0.25em]">SaaS Inteligente</span>
                        <div className="w-1 h-1 bg-slate-300 dark:bg-white/20 rounded-full" />
                        <span className="text-[9px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">v2.4.0</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl text-slate-500 dark:text-white/50 hover:text-slate-950 dark:hover:text-white transition-all hidden md:block"
                    >
                      {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                    <button 
                      onClick={handleClose}
                      className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl text-slate-500 dark:text-white/50 hover:text-slate-950 dark:hover:text-white transition-all"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Enhanced Chat Content */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar scroll-smooth"
              >
                {messages.map((msg, idx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.05 }}
                    key={msg.id}
                    className={cn(
                      "flex gap-3 group",
                      msg.role === 'user' ? "flex-row-reverse items-end" : "flex-row items-start"
                    )}
                  >
                    {msg.role === 'model' && (
                      <div className="flex-shrink-0 mt-1">
                        <KineIcon size="sm" active={false} />
                      </div>
                    )}
                    <div className={cn(
                      "flex flex-col gap-1",
                      msg.role === 'user' ? "items-end" : "items-start"
                    )}>
                      <div className={cn(
                        "max-w-[88%] p-5 rounded-[2rem] text-[15px] leading-relaxed transition-all duration-300",
                        msg.role === 'user' 
                          ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-none shadow-xl shadow-blue-900/20" 
                          : "bg-white/90 dark:bg-white/[0.03] backdrop-blur-xl text-slate-800 dark:text-slate-100 border border-violet-200/80 dark:border-white/10 rounded-bl-none shadow-sm hover:bg-white dark:hover:bg-white/[0.05]"
                      )}>
                        <div className={cn(
                          "prose prose-sm max-w-none prose-p:leading-relaxed prose-p:m-0 text-inherit",
                          msg.role === 'model' ? "prose-strong:text-cyan-700 dark:prose-strong:text-cyan-400" : "prose-strong:text-white"
                        )}>
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400/70 dark:text-white/20 uppercase tracking-widest px-1 transition-opacity opacity-0 group-hover:opacity-100">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </motion.div>
                ))}
                
                {loading && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-3"
                  >
                    <KineIcon size="sm" active={true} />
                    <div className="flex gap-2 p-4 px-6 bg-white/90 dark:bg-white/[0.03] backdrop-blur-md rounded-[1.5rem] rounded-tl-none border border-violet-200/80 dark:border-white/10 shadow-inner">
                      <motion.div animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Action Pills Section */}
              <div className="px-8 pb-4 relative">
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-2 mask-gradient-x">
                  {quickPills.map((pill) => (
                    <button
                      key={pill.label}
                      onClick={() => handleSendMessage(pill.cmd)}
                      className="flex-shrink-0 px-5 py-2.5 bg-white/90 dark:bg-white/5 border border-violet-200/90 dark:border-white/10 hover:border-cyan-500/50 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 text-slate-700 dark:text-white/60 hover:text-cyan-700 dark:hover:text-cyan-300 rounded-2xl text-[11px] font-bold tracking-tight transition-all backdrop-blur-2xl ring-1 ring-violet-100 dark:ring-white/5 shadow-sm"
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Premium Input Area */}
              <div className="p-8 pt-4 bg-slate-50/80 dark:bg-white/[0.02] border-t border-violet-100/90 dark:border-white/5">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2 bg-white border border-violet-200/90 dark:bg-white/[0.03] dark:border-white/10 rounded-[2.5rem] p-1.5 h-[62px] shadow-2xl focus-within:border-cyan-500/50 focus-within:bg-white dark:focus-within:bg-white/[0.05] transition-all group box-border w-full"
                >
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={cn(
                      "w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full transition-all",
                      isRecording 
                        ? "bg-rose-500/90 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]" 
                        : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10"
                    )}
                  >
                    {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                  
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Pergunte sobre sua saúde..."
                    className="flex-1 min-w-0 bg-transparent text-[14px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 outline-none px-1"
                  />
                  
                  <button
                    type="submit"
                    disabled={!inputText.trim() || loading}
                    className="w-11 h-11 flex-shrink-0 flex items-center justify-center bg-cyan-500 text-[#0A0D14] rounded-full hover:bg-cyan-400 disabled:opacity-20 disabled:grayscale transition-all shadow-lg hover:shadow-cyan-500/30 group-active:scale-95"
                  >
                    <Send size={18} className="translate-x-0.5" />
                  </button>
                </form>
                
                <div className="mt-6 flex items-center justify-center gap-2 opacity-30 dark:opacity-10 select-none grayscale contrast-200">
                  <div className="h-[1px] w-8 bg-slate-400 dark:bg-white" />
                  <span className="text-[9px] font-black text-slate-500 dark:text-white uppercase tracking-[0.5em]">FisioCare Intelligence</span>
                  <div className="h-[1px] w-8 bg-slate-400 dark:bg-white" />
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
      </AnimatePresence>
    </>
  );
}

