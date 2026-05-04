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
    md: "w-12 h-12",
    lg: "w-16 h-16"
  }[size];

  const iconSize = {
    sm: 16,
    md: 24,
    lg: 32
  }[size];

  return (
    <div className={cn("relative flex items-center justify-center", dimensions)}>
      {/* Camada de Brilho de Fundo (Glow) */}
      <motion.div
        animate={{
          scale: active ? [1, 1.2, 1] : [1, 1.1, 1],
          opacity: active ? [0.5, 0.8, 0.5] : [0.3, 0.5, 0.3],
        }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="absolute inset-0 bg-cyan-400 rounded-full blur-xl"
      />

      {/* Anel Externo Rotativo */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
        className={cn(
          "absolute inset-0 border-2 border-dashed border-cyan-500/30 rounded-full",
          size === "sm" ? "border-1" : "border-2"
        )}
      />

      {/* Anel Interno Contrário */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
        className="absolute inset-2 border border-white/20 rounded-full shadow-[0_0_15px_rgba(0,255,255,0.2)]"
      />

      {/* Núcleo Central (Core) */}
      <div className="relative w-full h-full bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-400 rounded-2xl flex items-center justify-center shadow-lg border border-white/30 overflow-hidden">
        <motion.div
          animate={{
            y: [0, -2, 0],
          }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <BrainCircuit size={iconSize} className="text-white drop-shadow-md" />
        </motion.div>
        
        {/* Efeito de Vidro no Core */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
      </div>

      {/* Faíscas de Energia */}
      {active && (
        <motion.div
          animate={{ scale: [1, 1.5], opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="absolute inset-0 border-2 border-cyan-400 rounded-2xl"
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
              initial={{ opacity: 0, y: 100, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, y: 100, scale: 0.9, x: 20 }}
              className={cn(
                "fixed bottom-6 right-6 z-[50] flex flex-col overflow-hidden",
                "bg-slate-900/80 backdrop-blur-xl border border-white/20 rounded-[2rem] shadow-2xl transition-all duration-500 ease-out",
                isExpanded ? "w-[95vw] h-[85vh] md:w-[650px] md:h-[750px]" : "w-[90vw] h-[600px] md:w-[420px] md:h-[650px]"
              )}
            >
              {/* Header Evoluído */}
              <div className="relative p-6 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-cyan-500 opacity-90 -z-10" />
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <Waves className="w-32 h-32 text-white" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative group">
                      <KineIcon size="md" active={loading} />
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-white tracking-tight">KineAI</h3>
                      <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] mt-0.5">Assistente de Reabilitação</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="p-2 hover:bg-white/10 rounded-xl text-white/80 transition-all hidden md:block"
                    >
                      {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                    <button 
                      onClick={handleClose}
                      className="p-2 hover:bg-white/10 rounded-xl text-white/80 transition-all"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Chat Content */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth custom-scrollbar"
              >
                {messages.map((msg) => (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    key={msg.id}
                    className={cn(
                      "flex flex-col group",
                      msg.role === 'user' ? "items-end" : "items-start"
                    )}
                  >
                    <div className={cn(
                      "max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed shadow-lg transition-all border",
                      msg.role === 'user' 
                        ? "bg-gradient-to-br from-blue-600/90 to-blue-700/90 text-white rounded-tr-none border-white/10 shadow-blue-900/20" 
                        : "bg-slate-800/40 backdrop-blur-md text-slate-100 border-white/5 rounded-tl-none ring-1 ring-white/5 shadow-slate-950/20"
                    )}>
                      <div className={cn(
                        "prose prose-sm max-w-none prose-p:leading-relaxed prose-p:m-0 text-inherit",
                        msg.role === 'model' ? "prose-strong:text-cyan-400" : "prose-strong:text-white"
                      )}>
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 mt-2 ml-1 mr-1 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </motion.div>
                ))}
                
                {loading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-10 h-10 bg-slate-800/40 rounded-xl flex items-center justify-center border border-white/5 overflow-hidden">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
                        className="absolute inset-0 border border-cyan-500/20 rounded-full scale-150"
                      />
                      <BrainCircuit className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="flex gap-1.5 p-3 px-4 bg-slate-800/40 rounded-2xl rounded-tl-none border border-white/5">
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Botões de Ação (Pills) */}
              <div className="px-6 py-4 flex gap-2 overflow-x-auto no-scrollbar mask-gradient-x">
                {quickPills.map((pill) => (
                  <button
                    key={pill.label}
                    onClick={() => handleSendMessage(pill.cmd)}
                    className="flex-shrink-0 px-4 py-2 bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/10 text-slate-300 hover:text-cyan-300 rounded-full text-[10px] font-black uppercase tracking-widest transition-all backdrop-blur-md"
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Input de Texto Evoluído */}
              <div className="p-6 pt-2 bg-slate-900/40 border-t border-white/10 backdrop-blur-xl">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-3"
                >
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={cn(
                      "w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl transition-all border",
                      isRecording 
                        ? "bg-rose-500 border-rose-400 text-white animate-pulse" 
                        : "bg-slate-800/50 border-white/10 text-slate-400 hover:text-white hover:bg-slate-700/50"
                    )}
                  >
                    {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                  
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="/ajuda ou ditar prontuário..."
                      className="w-full pl-5 pr-14 py-4 bg-slate-800/40 border border-white/10 rounded-2xl text-[13px] font-medium text-white placeholder:text-slate-500 focus:border-cyan-500/50 ring-0 outline-none transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim() || loading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:grayscale transition-all shadow-lg"
                    >
                      <Send size={18} className="translate-x-0.5 -translate-y-0.5 rotate-[15deg] text-cyan-200" />
                    </button>
                  </div>
                </form>
                
                <div className="mt-4 flex items-center justify-center gap-1.5 opacity-30 select-none">
                  <Sparkles size={10} className="text-cyan-400" />
                  <span className="text-[8px] font-black text-white uppercase tracking-[0.3em]">FisioCareHub KineAI</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

