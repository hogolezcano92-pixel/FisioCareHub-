import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  X, 
  MessageCircle, 
  HelpCircle, 
  Calendar, 
  Search, 
  ChevronDown, 
  User, 
  Stethoscope, 
  Bot,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  AlertCircle,
  Crown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import KineAI, { KineIcon } from './KineAI';
import { toast } from 'sonner';

interface FAQ {
  question: string;
  answer: string;
  category: 'paciente' | 'fisioterapeuta';
}

const faqs: FAQ[] = [
  // Patients
  {
    category: 'paciente',
    question: 'Como agendar uma consulta?',
    answer: 'Para agendar uma consulta, você pode navegar até "Buscar Fisio", escolher o profissional desejado e selecionar um horário disponível na agenda dele.'
  },
  {
    category: 'paciente',
    question: 'Como funciona a Teleconsulta?',
    answer: 'A teleconsulta é realizada diretamente pela nossa plataforma. No horário agendado, acesse "Minhas Consultas" e clique em "Entrar na Sala" para iniciar a vídeo chamada.'
  },
  {
    category: 'paciente',
    question: 'Como realizo a triagem inteligente?',
    answer: 'Acesse o menu "Triagem IA" no seu painel. Nossa inteligência artificial fará algumas perguntas para entender seu caso e sugerir os melhores especialistas.'
  },
  {
    category: 'paciente',
    question: 'Os pagamentos são seguros?',
    answer: 'Sim, todos os pagamentos são processados via gateway seguro integrado, garantindo total segurança dos seus dados bancários e a confirmação imediata do agendamento.'
  },
  
  // Physiotherapists
  {
    category: 'fisioterapeuta',
    question: 'Como configurar meus horários?',
    answer: 'Acesse "Minha Agenda" e clique em "Configurações de Horário". Lá você pode definir seus dias e turnos de atendimento.'
  },
  {
    category: 'fisioterapeuta',
    question: 'Como recebo meus pagamentos?',
    answer: 'Os repasses das consultas são feitos de acordo com o processamento do gateway de faturamento, seguindo os prazos de compensação estabelecidos para sua conta vinculada.'
  },
  {
    category: 'fisioterapeuta',
    question: 'Como adicionar exercícios para meus pacientes?',
    answer: 'No perfil do paciente, acesse a aba "Exercícios" e selecione "Atribuir Novo Plano". Você pode escolher da nossa biblioteca ou criar um personalizado.'
  }
];

export default function FloatingHelpMenu({ hideButton = false }: { hideButton?: boolean }) {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showKineAI, setShowKineAI] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [ticketLoading, setTicketLoading] = useState(false);

  useEffect(() => {
    const handleToggleHelp = (e: any) => {
      setShowHelpCenter(true);
      if (e.detail?.search) {
        setSearchTerm(e.detail.search);
      }
      if (e.detail?.profile) {
        setActiveProfile(e.detail.profile);
      }
    };
    window.addEventListener('toggle-help-center', handleToggleHelp);
    return () => window.removeEventListener('toggle-help-center', handleToggleHelp);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCompact(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const [activeProfile, setActiveProfile] = useState<'paciente' | 'fisioterapeuta'>(() => {
    const saved = localStorage.getItem('help_preferred_profile');
    if (saved === 'paciente' || saved === 'fisioterapeuta') return saved;
    return profile?.tipo_usuario === 'fisioterapeuta' ? 'fisioterapeuta' : 'paciente';
  });
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  useEffect(() => {
    if (user && profile?.tipo_usuario) {
      setActiveProfile(profile.tipo_usuario as 'paciente' | 'fisioterapeuta');
    }
  }, [user, profile]);

  useEffect(() => {
    localStorage.setItem('help_preferred_profile', activeProfile);
  }, [activeProfile]);

  const handleCreateTicket = async (category: string, subject: string, description: string) => {
    if (!user) {
      toast.error('Você precisa estar logado para abrir um ticket.');
      return;
    }

    setTicketLoading(true);
    try {
      // 1. Create the ticket
      const { data: ticketArray, error: error } = await supabase
        .from('suporte_tickets')
        .insert({
          usuario_id: user.id,
          categoria: category,
          assunto: subject,
          descricao: description,
          status: 'aberto'
        })
        .select();

      const ticketData = ticketArray && ticketArray.length > 0 ? ticketArray[0] : null;

      if (error) throw error;
      if (!ticketData) throw new Error("Falha ao criar ticket.");

      // 2. Fetch all admins to notify them
      const { data: admins } = await supabase
        .from('perfis')
        .select('id')
        .eq('tipo_usuario', 'admin');

      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          titulo: 'Novo Ticket de Suporte',
          mensagem: `${user.email} abriu um ticket: ${subject}`,
          tipo: 'support_request',
          link: '/admin', // Redireciona o admin para o painel de controle
          metadata: { ticket_id: ticketData.id }
        }));

        await supabase.from('notificacoes').insert(notifications);
      }

      toast.success('Solicitação enviada! Nossa equipe entrará em contato em breve.');
    } catch (err: any) {
      console.error('Erro ao criar ticket:', err);
      toast.error('Erro ao enviar solicitação.');
    } finally {
      setTicketLoading(false);
    }
  };

  // Click outside FAB to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.fab-container')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredFaqs = useMemo(() => {
    return faqs.filter(faq => 
      faq.category === activeProfile && 
      (faq.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
       faq.answer.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [activeProfile, searchTerm]);

  const toggleFAB = () => setIsOpen(!isOpen);

  const openHelpCenter = () => {
    setShowHelpCenter(true);
    setIsOpen(false);
  };

  const openKineAI = () => {
    setShowKineAI(true);
    setIsOpen(false);
  };

  return (
    <>
      {/* FAB Main Button */}
      {!hideButton && (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3 fab-container">
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                className="flex flex-col items-end gap-3 mb-2"
              >
                {/* Option: KineAI */}
                <motion.button
                  whileHover={{ scale: 1.05, x: -5 }}
                  onClick={openKineAI}
                  className="flex items-center gap-3 bg-slate-900 border border-white/10 p-3 pr-5 rounded-2xl shadow-xl group"
                >
                  <div className="w-10 h-10 bg-slate-800 text-white rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform relative overflow-hidden">
                    <KineIcon size="xs" />
                  </div>
                  <span className="text-sm font-black text-white whitespace-nowrap">Falar com KineAI</span>
                </motion.button>
  
                {/* Option: Help Center */}
                <motion.button
                  whileHover={{ scale: 1.05, x: -5 }}
                  onClick={openHelpCenter}
                  className="flex items-center gap-3 bg-slate-900 border border-white/10 p-3 pr-5 rounded-2xl shadow-xl group"
                >
                  <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
                    <HelpCircle size={20} />
                  </div>
                  <span className="text-sm font-black text-white whitespace-nowrap">Central de Ajuda</span>
                </motion.button>
                
                {/* Option: Schedule (Conditional) */}
                {(profile?.tipo_usuario === 'paciente' || !user) && (
                  <motion.button
                    whileHover={{ scale: 1.05, x: -5 }}
                    onClick={() => window.location.href = '/buscar-fisio'}
                    className="flex items-center gap-3 bg-slate-900 border border-white/10 p-3 pr-5 rounded-2xl shadow-xl group"
                  >
                    <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                      <Calendar size={20} />
                    </div>
                    <span className="text-sm font-black text-white whitespace-nowrap">Agendar Consulta</span>
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
  
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleFAB}
            className={cn(
              "h-14 flex items-center justify-center gap-2 px-5 py-3 rounded-full transition-all duration-500",
              "bg-blue-950/80 backdrop-blur-md border border-white/10 shadow-xl text-white",
              isOpen ? "w-14 px-0 bg-slate-800" : (isCompact ? "w-14 px-0" : "w-auto")
            )}
          >
            <motion.div
              animate={{ rotate: isOpen ? 45 : 0 }}
              className="flex items-center justify-center"
            >
              {isOpen ? <Plus size={24} /> : <MessageCircle size={24} className="text-blue-400" />}
            </motion.div>
            
            <AnimatePresence>
              {!isOpen && !isCompact && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden whitespace-nowrap text-sm font-black tracking-tight"
                >
                  Ajuda
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      )}

      {/* Help Center Drawer/Modal */}
      <AnimatePresence>
        {showHelpCenter && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHelpCenter(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[110]"
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-[450px] bg-slate-900 border-l border-white/10 shadow-2xl z-[120] flex flex-col pt-[env(safe-area-inset-top)]"
            >
              {/* Header */}
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Central de Ajuda</h2>
                  <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Como podemos ajudar?</p>
                </div>
                <button 
                  onClick={() => setShowHelpCenter(false)}
                  className="p-3 hover:bg-white/5 rounded-2xl text-slate-400 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                {/* Profile Selector - Only show for public/unauthenticated users */}
                {!user && (
                  <div className="bg-slate-800/50 p-2 rounded-[1.5rem] flex gap-2">
                    <button
                      onClick={() => setActiveProfile('paciente')}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all",
                        activeProfile === 'paciente' 
                          ? "bg-blue-600 text-white shadow-lg" 
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      <User size={16} />
                      Paciente
                    </button>
                    <button
                      onClick={() => setActiveProfile('fisioterapeuta')}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all",
                        activeProfile === 'fisioterapeuta' 
                          ? "bg-blue-600 text-white shadow-lg" 
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      <Stethoscope size={16} />
                      Fisioterapeuta
                    </button>
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search 
                    className="absolute pointer-events-none z-20" 
                    style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#94a3b8' }}
                  />
                  <input
                    type="text"
                    placeholder="Digite sua dúvida..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800 border-2 border-white/5 rounded-2xl pr-4 py-4 text-white placeholder:text-slate-600 focus:border-blue-600 transition-all outline-none font-bold !pl-[60px]"
                  />
                </div>

                {/* Financial Section - SEPARATED BY ROLE */}
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                    <ShieldCheck size={14} className="text-blue-500" />
                    {activeProfile === 'paciente' ? 'Financeiro e Consultas' : 'Financeiro e Assinatura'}
                  </h3>
                  
                  {activeProfile === 'paciente' ? (
                    <div className="space-y-4">
                      {/* Cancellation Section */}
                      <div className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-3">
                        <div className="flex items-center gap-3 text-white font-black text-sm">
                          <AlertCircle size={18} className="text-amber-400" />
                          Como funciona o cancelamento
                        </div>
                        <ul className="text-[11px] text-slate-400 space-y-2 leading-relaxed">
                          <li className="flex gap-2">
                            <ArrowRight size={10} className="mt-1 flex-shrink-0 text-blue-400" />
                            O cancelamento de consulta deve ser solicitado via suporte.
                          </li>
                          <li className="flex gap-2">
                            <ArrowRight size={10} className="mt-1 flex-shrink-0 text-blue-400" />
                            Dependendo do prazo do agendamento, pode haver ou não direito a reembolso.
                          </li>
                          <li className="flex gap-2">
                            <ArrowRight size={10} className="mt-1 flex-shrink-0 text-blue-400" />
                            Após análise de nossa equipe, o suporte confirma o cancelamento.
                          </li>
                        </ul>
                      </div>

                      {/* Refund Section */}
                      <div className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-3">
                        <div className="flex items-center gap-3 text-white font-black text-sm">
                          <CreditCard size={18} className="text-blue-400" />
                          Como solicitar reembolso
                        </div>
                        <div className="space-y-2">
                          <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                            1. Clique no botão abaixo "Solicitar Ajuda Financeira".<br/>
                            2. A categoria será "Financeiro (Reembolso)".<br/>
                            3. Descreva o motivo do pedido e o agendamento correspondente.<br/>
                            4. O pedido entrará em análise e você será notificado.
                          </p>
                          <button 
                            disabled={ticketLoading}
                            onClick={() => handleCreateTicket('financeiro', 'Solicitação de Reembolso', 'Gostaria de solicitar o reembolso de uma consulta.')}
                            className="w-full py-4 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
                          >
                            {ticketLoading ? 'Enviando...' : 'Solicitar ajuda financeira'}
                          </button>
                        </div>
                      </div>

                      {/* Estorno Section */}
                      <div className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-3">
                        <div className="flex items-center gap-3 text-white font-black text-sm">
                          <ArrowRight size={18} className="text-emerald-400" />
                          Como funciona o estorno
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Se o reembolso for aprovado, o estorno é processado automaticamente. O valor é devolvido pelo mesmo método usado (PIX, Cartão, etc). O prazo final depende do seu banco ou operadora.
                        </p>
                      </div>

                      {/* Flow Summary */}
                      <div className="p-5 bg-blue-600/5 border border-blue-500/20 rounded-3xl">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 text-center">Resumo do Fluxo</p>
                        <div className="flex flex-col gap-2">
                          {[
                            'Solicitação via suporte',
                            'Análise da equipe',
                            'Aprovação ou Recusa',
                            'Processamento do estorno',
                            'Notificação final'
                          ].map((step, i) => (
                            <div key={i} className="flex items-center gap-3 text-[10px] font-bold text-slate-300">
                              <span className="w-5 h-5 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 text-[8px]">{i + 1}</span>
                              {step}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Physio Side */}
                      <div className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-4">
                        <div className="flex items-center gap-3 text-white font-black text-sm">
                          <Crown size={18} className="text-amber-400" />
                          Cancelamento e Reembolso
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Cancelamentos e reembolsos de consultas de seus pacientes são sempre iniciados pelo suporte técnico. Você será notificado para validação em casos específicos, mas a decisão final cabe ao suporte da plataforma.
                        </p>
                        <div className="pt-4 border-t border-white/5 space-y-2">
                          <p className="text-[10px] font-black text-slate-500 uppercase">Estornos e Repasses</p>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            Estornos processados podem impactar seus repasses pendentes. Caso sua assinatura possua fidelidade, o cancelamento direto deve ser solicitado abaixo.
                          </p>
                        </div>
                        <button 
                          disabled={ticketLoading}
                          onClick={() => handleCreateTicket('assinatura', 'Cancelamento de Assinatura', 'Desejo cancelar minha assinatura profissional.')}
                          className="w-full py-4 bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50"
                        >
                          {ticketLoading ? 'Processando...' : 'Solicitar Cancelamento de Assinatura'}
                        </button>
                      </div>

                      <div className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-3">
                        <div className="flex items-center gap-3 text-white font-black text-sm">
                          <ShieldCheck size={18} className="text-blue-400" />
                          Regras de Assinatura
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Reembolsos de assinatura são aplicáveis apenas para erros técnicos ou cobranças indevidas comprovadas. Solicite análise via canal financeiro.
                        </p>
                        <button 
                          onClick={() => handleCreateTicket('financeiro', 'Reembolso de Assinatura', 'Erro técnico/Cobrança indevida de assinatura.')}
                          className="text-blue-400 text-[10px] font-black uppercase hover:underline"
                        >
                          Solicitar Ajuda Financeira
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Perguntas Populares */}
                {!searchTerm && (
                  <div className="flex flex-wrap gap-2">
                    {activeProfile === 'paciente' ? (
                      <>
                        <button onClick={() => setSearchTerm('agendar')} className="px-4 py-2 bg-blue-600/10 text-blue-400 rounded-full text-xs font-black border border-blue-500/20 hover:bg-blue-600/20 transition-all">#Agendamentos</button>
                        <button onClick={() => setSearchTerm('triagem')} className="px-4 py-2 bg-blue-600/10 text-blue-400 rounded-full text-xs font-black border border-blue-500/20 hover:bg-blue-600/20 transition-all">#TriagemIA</button>
                        <button onClick={() => setSearchTerm('teleconsulta')} className="px-4 py-2 bg-blue-600/10 text-blue-400 rounded-full text-xs font-black border border-blue-500/20 hover:bg-blue-600/20 transition-all">#Telehealth</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setSearchTerm('agenda')} className="px-4 py-2 bg-blue-600/10 text-blue-400 rounded-full text-xs font-black border border-blue-500/20 hover:bg-blue-600/20 transition-all">#Agenda</button>
                        <button onClick={() => setSearchTerm('pagamento')} className="px-4 py-2 bg-blue-600/10 text-blue-400 rounded-full text-xs font-black border border-blue-500/20 hover:bg-blue-600/20 transition-all">#Financeiro</button>
                        <button onClick={() => setSearchTerm('exercícios')} className="px-4 py-2 bg-blue-600/10 text-blue-400 rounded-full text-xs font-black border border-blue-500/20 hover:bg-blue-600/20 transition-all">#Prescrição</button>
                      </>
                    )}
                  </div>
                )}

                {/* FAQ List */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Perguntas Frequentes</h3>
                  {filteredFaqs.length > 0 ? (
                    filteredFaqs.map((faq, idx) => (
                      <div 
                        key={idx}
                        className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden transition-all hover:bg-white/[0.07]"
                      >
                        <button
                          onClick={() => setExpandedFaq(expandedFaq === faq.question ? null : faq.question)}
                          className="w-full p-6 flex items-center justify-between text-left"
                        >
                          <span className="text-[15px] font-black text-white pr-4">{faq.question}</span>
                          <ChevronDown 
                            size={20} 
                            className={cn(
                              "text-blue-400 transition-transform duration-300",
                              expandedFaq === faq.question && "rotate-180"
                            )} 
                          />
                        </button>
                        <AnimatePresence>
                          {expandedFaq === faq.question && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-6 pb-6 text-slate-400 text-sm leading-relaxed font-medium">
                                {faq.answer}
                                {faq.question.includes('agendar') && (
                                  <div className="mt-4">
                                    <button 
                                      onClick={() => window.location.href='/buscar-fisio'}
                                      className="flex items-center gap-2 text-blue-400 font-bold hover:gap-3 transition-all"
                                    >
                                      Ir para agendamento <ArrowRight size={16} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 px-6">
                      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search size={24} className="text-slate-600" />
                      </div>
                      <p className="text-white font-black">Nenhum resultado encontrado</p>
                      <p className="text-slate-500 text-sm mt-2 font-medium">Experimente usar palavras-chave mais simples.</p>
                    </div>
                  )}
                </div>

                {/* Support Fallback */}
                <div className="bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/20 p-8 rounded-[2.5rem] space-y-6">
                  <div className="space-y-2 text-center">
                    <h4 className="text-white font-black text-lg">Ainda com dúvidas?</h4>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed">Nossa equipe de suporte está pronta para te ajudar agora mesmo.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => {
                        window.open("https://wa.me/5511984040563", "_blank");
                      }}
                      className="w-full flex items-center gap-4 p-4 bg-emerald-500 text-white rounded-2xl font-black hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <MessageCircle size={20} />
                      </div>
                      <span>Falar no WhatsApp</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowHelpCenter(false);
                        setShowKineAI(true);
                      }}
                      className="w-full flex items-center gap-4 p-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                    >
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <KineIcon size="xs" />
                      </div>
                      <span>Falar com KineAI</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/5 text-center">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">FisioCareHub • Suporte Inteligente</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* KineAI Component Integration */}
      {showKineAI && (
        <KineAI externalForceOpen={showKineAI} onClose={() => setShowKineAI(false)} />
      )}
    </>
  );
}
