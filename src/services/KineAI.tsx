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
  Bot
} from 'lucide-react';
import { kineAIService } from '../services/kineAI';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';

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

export default function KineAI({ externalForceOpen, onClose }: KineAIProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (externalForceOpen !== undefined) {
      setIsOpen(externalForceOpen);
    }
  }, [externalForceOpen]);

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Olá! Sou a **KineAI**, sua super assistente inteligente do FisioCareHub. Como posso ajudar você hoje? 🌟',
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
  }, [messages]);

  const handleSendMessage = async (text: string = inputText) => {
    if (!text.trim() || loading) return;

    // Check for commands
    if (text.startsWith('/')) {
      const command = text.toLowerCase().trim();
      if (command === '/triagem') {
        navigate('/triage');
        setIsOpen(false);
        return;
      }
      if (command === '/perfil') {
        navigate('/profile');
        setIsOpen(false);
        return;
      }
      if (command === '/agenda') {
        navigate('/appointments');
        setIsOpen(false);
        return;
      }
      if (command === '/ajuda') {
        const helpText = "Aqui estão alguns comandos que posso executar:\n\n- **/triagem**: Iniciar triagem de sintomas\n- **/perfil**: Ver meu perfil\n- **/agenda**: Ver meus agendamentos\n- **/ajuda**: Mostrar esta lista";
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

      const aiResponse = await kineAIService.chat(text, history);
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Erro no chat KineAI:", error);
    } finally {
      setLoading(false);
    }
  };

  const quickCommands = [
    { label: 'Fazer Triagem', icon: BrainCircuit, cmd: '/triagem' },
    { label: 'Minha Agenda', icon: Calendar, cmd: '/agenda' },
    { label: 'Meu Perfil', icon: User, cmd: '/perfil' },
    { label: 'Ajuda', icon: HelpCircle, cmd: '/ajuda' },
  ];

  return (
    <>
      {/* Botão Flutuante - Only show if NOT controlled externally */}
      {!externalForceOpen && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className={cn(
            "fixed bottom-6 right-6 z-[40] w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all",
            isOpen ? "opacity-0 pointer-events-none" : "bg-gradient-to-br from-sky-500 to-blue-600 text-white"
          )}
        >
          <div className="relative">
            <Sparkles className="w-8 h-8" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
          </div>
        </motion.button>
      )}

      {/* Janela do Chat */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for KineAI */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] z-[40]"
            />
            
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9, x: 50 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, y: 100, scale: 0.9, x: 50 }}
              className={cn(
                "fixed bottom-6 right-6 z-[41] bg-slate-900 rounded-[2.5rem] shadow-2xl border border-white/10 flex flex-col overflow-hidden transition-all duration-300",
                isExpanded ? "w-[90vw] h-[80vh] md:w-[600px] md:h-[700px]" : "w-[90vw] h-[500px] md:w-[400px] md:h-[600px]"
              )}
            >
            {/* Header */}
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-6 flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30">
                  <Bot className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-black text-xl tracking-tight leading-none">KineAI</h3>
                  <p className="text-xs font-bold text-sky-100 uppercase tracking-widest mt-1">Super Assistente</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all hidden md:block"
                >
                  {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>
                <button 
                  onClick={handleClose}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950/50"
            >
              {messages.map((msg) => (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className={cn(
                    "p-4 rounded-3xl text-sm leading-relaxed shadow-sm",
                    msg.role === 'user' 
                      ? "bg-sky-500 text-white rounded-tr-none" 
                      : "bg-slate-800 text-white border border-white/10 rounded-tl-none"
                  )}>
                    <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-strong:text-inherit prose-p:m-0">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </motion.div>
              ))}
              {loading && (
                <div className="flex items-center gap-3 text-sky-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-xs font-black uppercase tracking-widest">KineAI está pensando...</span>
                </div>
              )}
            </div>

            {/* Quick Commands */}
            <div className="px-6 py-3 bg-slate-900 border-t border-white/5 flex gap-2 overflow-x-auto no-scrollbar">
              {quickCommands.map((cmd) => (
                <button
                  key={cmd.label}
                  onClick={() => handleSendMessage(cmd.cmd)}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-white/5 text-slate-300 rounded-full text-xs font-black hover:bg-white/10 transition-all border border-white/5 shadow-sm"
                >
                  <cmd.icon size={14} />
                  {cmd.label}
                </button>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-6 bg-slate-900 border-t border-white/5">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="relative flex items-center"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Pergunte qualquer coisa ou use /ajuda..."
                  className="w-full pl-6 pr-16 py-4 bg-slate-800 border-2 border-white/5 rounded-2xl text-sm font-medium text-white placeholder:text-slate-500 focus:border-sky-500 transition-all outline-none"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || loading}
                  className="absolute right-2 p-3 bg-sky-500 text-white rounded-xl hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-sky-500/20"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  </>
);
}
