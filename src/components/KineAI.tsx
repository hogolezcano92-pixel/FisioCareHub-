import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  X, 
  Send, 
  MessageCircle, 
  Loader2, 
  BrainCircuit, 
  Calendar, 
  User, 
  HelpCircle,
  Maximize2,
  Minimize2,
  Bot,
  Mic,
  MicOff,
  Waves
} from 'lucide-react';
import { kineAIService } from '../services/kineAI';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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

// Componente Visual do Novo Ícone da KineAI (Quantum Core)
const KineIcon = ({ size = "md", active = false }: { size?: "sm" | "md" | "lg", active?: boolean }) => {
  const dimensions = {
    sm: "w-8 h-8",
    md: "w-14 h-14",
    lg: "w-20 h-20"
  }[size];

  const iconSize = {
    sm: 16,
    md: 28,
    lg: 40
  }[size];

  return (
    <div className={cn("relative flex items-center justify-center", dimensions)}>
      {/* Camada de Aura Quantum (Glow) */}
      <motion.div
        animate={{
          scale: active ? [1, 1.3, 1] : [1, 1.1, 1],
          opacity: active ? [0.4, 0.7, 0.4] : [0.2, 0.4, 0.2],
        }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        className="absolute inset-0 bg-cyan-400/30 rounded-full blur-2xl"
      />
      
      {/* Halo de Energia Violeta */}
      <motion.div
        animate={{
          rotate: [0, 180, 360],
          scale: active ? [1.1, 1.2, 1.1] : [1, 1.05, 1],
        }}
        transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
        className="absolute inset-[-4px] border border-violet-500/20 rounded-full blur-[2px]"
      />

      {/* Anéis Orbitais de Dados */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
        className={cn(
          "absolute inset-0 border-2 border-dashed border-cyan-500/40 rounded-full",
          size === "sm" ? "border-1" : "border-2"
        )}
      />

      <motion.div
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
        className="absolute inset-2 border border-white/10 rounded-full"
      />

      {/* Núcleo Central Cristalino */}
      <div className="relative w-full h-full bg-slate-900/40 backdrop-blur-3xl rounded-3xl flex items-center justify-center shadow-2xl border border-white/20 overflow-hidden ring-1 ring-white/10">
        {/* Gradiente Interno Animado */}
        <motion.div 
          animate={{
            background: [
              "radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)",
              "radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)",
              "radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)",
            ]
          }}
          transition={{ repeat: Infinity, duration: 5 }}
          className="absolute inset-0" 
        />
        
        <motion.div
          animate={{
            y: [0, -3, 0],
            scale: active ? [1, 1.1, 1] : 1
          }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          className="relative z-10"
        >
          <BrainCircuit size={iconSize} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
        </motion.div>
        
        {/* Specular highlights */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      </div>

      {/* Partículas de Pulso */}
      {active && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 2, opacity: [0, 0.5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute inset-0 border-2 border-cyan-400/30 rounded-3xl"
        />
      )}
    </div>
  );
};

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
      text: 'Olá! Sou a **KineAI**, sua assistente de reabilitação. Como posso ajudar com sua saúde ou suporte hoje? 🌟',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
        toast.info("Transferindo para suporte humano...");
        setTimeout(() => {
          navigate('/chat?support=true');
          handleClose();
        }, 2000);
      }

    } catch (error) {
      console.error("Erro no chat KineAI:", error);
      toast.error("Ocorreu um erro ao processar sua mensagem.");
    } finally {
      setLoading(false);
    }
  };

  const quickPills = [
    { label: 'Encontrar Fisio', cmd: 'Quero encontrar um fisioterapeuta domiciliar' },
    { label: 'Preço Sessão', cmd: 'Qual o valor médio das sessões de fisioterapia?' },
    { label: 'Dor Lombar', cmd: 'Quais exercícios são bons para dor lombar?' },
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
            "fixed bottom-6 right-6 z-[40] transition-all",
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
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[45]"
            />
            
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95, x: 20 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, y: 100, scale: 0.95, x: 20 }}
              className={cn(
                "fixed bottom-6 right-6 z-[50] flex flex-col overflow-hidden",
                "bg-[#0A0D14]/80 backdrop-blur-[32px] border border-white/10 rounded-[2.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.7)] transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)",
                isExpanded ? "w-[96vw] h-[88vh] md:w-[700px] md:h-[800px]" : "w-[92vw] h-[650px] md:w-[440px] md:h-[700px]"
              )}
            >
              {/* Modern Glass Header */}
              <div className="relative p-7 border-b border-white/5">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-cyan-500/5 to-transparent pointer-events-none" />
                
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <KineIcon size="md" active={loading} />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0A0D14] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-white tracking-tight leading-tight">KineAI</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-black text-cyan-400 uppercase tracking-[0.25em]">SaaS Inteligente</span>
                        <div className="w-1 h-1 bg-white/20 rounded-full" />
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">v2.4.0</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="p-2.5 hover:bg-white/5 rounded-2xl text-white/50 hover:text-white transition-all hidden md:block"
                    >
                      {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                    <button 
                      onClick={handleClose}
                      className="p-2.5 hover:bg-white/5 rounded-2xl text-white/50 hover:text-white transition-all"
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
                      "flex flex-col gap-2 group",
                      msg.role === 'user' ? "items-end" : "items-start"
                    )}
                  >
                    <div className={cn(
                      "max-w-[88%] p-5 rounded-[2rem] text-[15px] leading-relaxed transition-all duration-300",
                      msg.role === 'user' 
                        ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-none shadow-xl shadow-blue-900/20" 
                        : "bg-white/[0.03] backdrop-blur-xl text-slate-100 border border-white/10 rounded-bl-none shadow-sm hover:bg-white/[0.05]"
                    )}>
                      <div className={cn(
                        "prose prose-sm max-w-none prose-p:leading-relaxed prose-p:m-0 text-inherit",
                        msg.role === 'model' ? "prose-strong:text-cyan-400" : "prose-strong:text-white"
                      )}>
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-1 transition-opacity opacity-0 group-hover:opacity-100">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </motion.div>
                ))}
                
                {loading && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-4"
                  >
                    <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
                      <BrainCircuit className="w-5 h-5 text-cyan-400/80" />
                    </div>
                    <div className="flex gap-2 p-4 px-6 bg-white/[0.03] backdrop-blur-md rounded-[1.5rem] rounded-tl-none border border-white/10 shadow-inner">
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
                      className="flex-shrink-0 px-5 py-2.5 bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/10 text-white/60 hover:text-cyan-300 rounded-2xl text-[11px] font-bold tracking-tight transition-all backdrop-blur-2xl ring-1 ring-white/5"
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Premium Input Area */}
              <div className="p-8 pt-4 bg-white/[0.02] border-t border-white/5">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-4 bg-white/[0.03] border border-white/10 rounded-[2rem] p-2 pr-2.5 shadow-2xl focus-within:border-cyan-500/40 focus-within:bg-white/[0.05] transition-all group"
                >
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={cn(
                      "w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-[1.25rem] transition-all",
                      isRecording 
                        ? "bg-rose-500/90 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]" 
                        : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                    )}
                  >
                    {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                  
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Pergunte sobre sua reabilitação..."
                    className="flex-1 py-1 bg-transparent text-[15px] font-medium text-white placeholder:text-white/20 outline-none"
                  />
                  
                  <button
                    type="submit"
                    disabled={!inputText.trim() || loading}
                    className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-cyan-500 text-[#0A0D14] rounded-[1.25rem] hover:bg-cyan-400 disabled:opacity-20 disabled:grayscale transition-all shadow-lg hover:shadow-cyan-500/30 group-active:scale-95"
                  >
                    <Send size={20} className="translate-x-0.5" />
                  </button>
                </form>
                
                <div className="mt-6 flex items-center justify-center gap-2 opacity-10 select-none grayscale contrast-200">
                  <div className="h-[1px] w-8 bg-white" />
                  <span className="text-[9px] font-black text-white uppercase tracking-[0.5em]">FisioCare Intelligence</span>
                  <div className="h-[1px] w-8 bg-white" />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

