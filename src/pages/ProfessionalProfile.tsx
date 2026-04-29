import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Star, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Calendar as CalendarIcon, 
  MessageSquare, 
  ChevronLeft,
  Loader2,
  Stethoscope,
  Award,
  ShieldCheck,
  Wallet,
  Zap,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn, resolveStorageUrl } from '../lib/utils';
import { triggerWhatsAppNotification } from '../services/notificationService';

export default function ProfessionalProfile() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user, profile: currentUserProfile } = useAuth();
  const navigate = useNavigate();
  const [physio, setPhysio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingData, setBookingData] = useState({
    data: '',
    hora: '',
    tipo: 'Avaliação inicial',
    observacoes: '',
    valor: 0
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [configServicos, setConfigServicos] = useState<any>(null);
  const [activeServices, setActiveServices] = useState<any[]>([]);
  const [activePackages, setActivePackages] = useState<any[]>([]);
  const [lowestPrice, setLowestPrice] = useState<number | null>(null);

  useEffect(() => {
    if (searchParams.get('status') === 'canceled') {
      toast.error('Pagamento cancelado. Tente novamente se desejar agendar.');
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchPhysio = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // Use '*' for resilience against missing columns while still fetching what's available
        const { data, error } = await supabase
          .from('perfis')
          .select('*')
          .eq('id', id)
          .eq('tipo_usuario', 'fisioterapeuta')
          .single();

        if (error) {
          console.error('Erro ao buscar perfil:', error);
          throw new Error('Profissional não encontrado');
        }
        
        setPhysio(data);

        // Fetch service settings (pricing and specific availability)
        const { data: settings, error: settingsError } = await supabase
          .from('configuracao_servicos')
          .select('*')
          .eq('physio_id', id)
          .single();
        
        if (!settingsError && settings) {
          console.log('Valores de serviços carregados:', settings);
          setConfigServicos(settings);
        }

        // Fetch active services (new dynamic table)
        console.log('Fetching services for physio:', id);
        const { data: svcs, error: svcsError } = await supabase
          .from('physiotherapist_services')
          .select('*')
          .eq('physiotherapist_id', id)
          .eq('is_active', true)
          .order('name', { ascending: true });
        
        if (svcsError) console.error('Error fetching services:', svcsError);

        let finalServices: any[] = [];
        let minPrice: number | null = null;
        
        if (!svcsError && svcs && svcs.length > 0) {
          console.log('Using dynamic services:', svcs.length);
          finalServices = svcs;
          const prices = svcs.map(s => Number(s.base_price)).filter(p => p > 0);
          if (prices.length > 0) minPrice = Math.min(...prices);
        } else if (settings) {
          // Fallback for legacy services if new table is empty but legacy settings exist
          console.log('Dynamic services empty, falling back to legacy settings');
          const legacyServices = [
            { id: 'legacy_av', name: 'Avaliação inicial', base_price: settings.avaliacao_inicial },
            { id: 'legacy_fis', name: 'Sessão de fisioterapia', base_price: settings.sessao_fisioterapia },
            { id: 'legacy_reab', name: 'Reabilitação', base_price: settings.reabilitacao },
            { id: 'legacy_rpg', name: 'RPG', base_price: settings.rpg },
            { id: 'legacy_pil', name: 'Pilates', base_price: settings.pilates },
            { id: 'legacy_dom', name: 'Fisioterapia domiciliar', base_price: settings.domiciliar },
            { id: 'legacy_tele', name: 'Teleconsulta', base_price: settings.teleconsulta || 0 },
          ].filter(s => Number(s.base_price) > 0);
          
          finalServices = legacyServices;
          const prices = legacyServices.map(s => Number(s.base_price));
          if (prices.length > 0) minPrice = Math.min(...prices);
        }

        // Hard fallback if still empty to ensure UI is not broken
        if (finalServices.length === 0) {
          console.log('All service sources empty, using hard default');
          finalServices = [{ id: 'default', name: 'Consulta / Avaliação', base_price: 0 }];
          minPrice = 0;
        }

        setActiveServices(finalServices);
        setLowestPrice(minPrice);
        
        // Ensure booking data matches available services
        if (finalServices.length > 0) {
          const initialSvc = finalServices.find(s => s.name.toLowerCase().includes('avaliação')) || finalServices[0];
          setBookingData(prev => ({
            ...prev,
            tipo: `service:${initialSvc.name}|${initialSvc.base_price}`,
            valor: Number(initialSvc.base_price) || 0
          }));
        }

        // Fetch active service packages
        console.log('Fetching packages for physio:', id);
        const { data: pkgs, error: pkgsError } = await supabase
          .from('service_packages')
          .select('*')
          .eq('physiotherapist_id', id)
          .eq('is_active', true)
          .order('total_price', { ascending: true });
        
        if (pkgsError) console.error('Error fetching packages:', pkgsError);
        if (!pkgsError && pkgs) {
          console.log('Packages loaded:', pkgs.length);
          setActivePackages(pkgs);
        }

      } catch (err: any) {
        console.error('Erro ao buscar dados:', err);
        toast.error(err.message || 'Erro ao carregar perfil');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchPhysio();
  }, [id, navigate]);

  const handleConfirmarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Você precisa estar logado para agendar');
      navigate('/login', { state: { from: `/physio/${id}` } });
      return;
    }

    if (!bookingData.data || !bookingData.hora) {
      toast.error('Selecione data e hora');
      return;
    }

    setBookingLoading(true);
    try {
      // 1. BUSCA DE DADOS DO PACIENTE
      const { data: patientProfile, error: profileError } = await supabase
        .from('perfis')
        .select('nome_completo, email, cpf')
        .eq('id', user.id)
        .single();
        
      if (profileError || !patientProfile) {
        throw new Error('Perfil de paciente não encontrado. Verifique seus dados cadastrais.');
      }

      // 2. CRIAÇÃO DO AGENDAMENTO
      const sqlDate = bookingData.data;
      const sqlTime = bookingData.hora.length === 5 ? `${bookingData.hora}:00` : bookingData.hora;
      const sqlTimestamp = `${sqlDate}T${sqlTime}`;

      // Extract clean type name from composite value
      const [typePrefix, restData] = (bookingData.tipo || '').split(':');
      const [fullServiceName] = (restData || 'Serviço').split('|');
      const finalTipoName = typePrefix === 'package' ? `Pacote: ${fullServiceName}` : fullServiceName;

      const { data: newApp, error: appError } = await supabase
        .from('agendamentos')
        .insert({
          paciente_id: user.id,
          fisio_id: id,
          data: sqlDate,
          hora: sqlTime,
          data_servico: sqlTimestamp,
          tipo: finalTipoName,
          observacoes: bookingData.observacoes,
          valor: bookingData.valor || 0,
          status: 'pendente_pagamento'
        })
        .select()
        .single();

      if (appError || !newApp) {
        console.error("Erro ao criar agendamento:", appError);
        throw new Error('Falha ao registrar o agendamento.');
      }

      // 3. TRIGGER WHATSAPP NOTIFICATION
      triggerWhatsAppNotification('created', newApp.id);

      // REDIRECIONAMENTO PARA A PÁGINA DE PAGAMENTO INTERMEDIÁRIA
      toast.success('Agendamento registrado! Redirecionando para o pagamento...');
      setTimeout(() => {
        navigate(`/pagamento/${newApp.id}`);
      }, 1500);

    } catch (err: any) {
      console.error('Erro no agendamento:', err);
      toast.error(err.message || 'Erro ao processar sua solicitação');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Carregando Perfil...</p>
      </div>
    );
  }

  if (!physio) return null;

  // Formatting strings for labels
  const educationList = physio.formacao_academica || [];
  const tagsList = physio.tags_especialidades || [];
  const servicesList = physio.servicos_ofertados || [];
  const showDomessticular = configServicos?.domiciliar > 0 || physio.tipo_servico === 'domicilio' || physio.tipo_servico === 'ambos';
  const showTeleconsulta = configServicos?.teleconsulta > 0 || physio.tipo_servico === 'online' || physio.tipo_servico === 'ambos';

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      {/* Header / Cover */}
      <div className="h-64 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-8 left-8 p-3 bg-white/10 backdrop-blur-md text-white rounded-2xl hover:bg-white/20 transition-all border border-white/10"
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-32 relative z-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Profile Info */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] shadow-2xl border border-white/10">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="relative">
                  <img 
                    src={resolveStorageUrl(physio.avatar_url) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${physio.id}`}
                    alt={physio.nome_completo}
                    className="w-40 h-40 rounded-[2.5rem] object-cover border-4 border-white/10 shadow-2xl"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-full shadow-lg border-4 border-slate-900">
                    <CheckCircle2 size={20} />
                  </div>
                </div>

                  <div className="flex-1 space-y-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-black text-white tracking-tight">Dr. {physio.nome_completo || physio.nome}</h1>
                        {(physio.aprovado || physio.verificado || physio.status_aprovacao === 'aprovado') && (
                          <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-600/20 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-500/30">
                            <ShieldCheck size={12} />
                            Verificado
                          </div>
                        )}
                      </div>
                      <p className="text-blue-400 font-black text-xs uppercase tracking-[0.2em]">
                        {physio.especialidade || physio.especialidade_principal || 'Fisioterapeuta'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-1.5 text-amber-400">
                        <Star size={18} fill="currentColor" />
                        <span className="text-sm font-black text-white">4.9</span>
                        <span className="text-xs text-slate-400 font-bold">(120 avaliações)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <MapPin size={18} />
                        <span className="text-sm font-bold">{physio.localizacao || physio.cidade || 'São Paulo, SP'}</span>
                      </div>
                    </div>

                    {servicesList.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {servicesList.map((service: string) => (
                          <span 
                            key={service} 
                            className="px-3 py-1 bg-transparent text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-full border border-white/10"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    )}

                    {tagsList.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Especialidades</span>
                        <div className="flex flex-wrap gap-2">
                          {tagsList.map((tag: string) => (
                            <span key={tag} className="px-3 py-1 bg-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-full border border-white/10">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
              </div>

              {(physio.bio || physio.sobre) && (
                <div className="mt-10 pt-10 border-t border-white/5 space-y-4">
                  <h2 className="text-xl font-black text-white tracking-tight">Sobre o Profissional</h2>
                  <div className="text-slate-300 font-medium leading-[1.6] text-left space-y-4">
                    {(physio.bio || physio.sobre).split('\n').map((para: string, idx: number) => (
                      para.trim() ? <p key={idx}>{para}</p> : <br key={idx} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {educationList.length > 0 && (
                <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-xl space-y-4">
                  <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center">
                    <Award size={24} />
                  </div>
                  <h3 className="text-lg font-black text-white tracking-tight">Formação Acadêmica</h3>
                  <ul className="space-y-3">
                    {educationList.map((item: string, idx: number) => (
                      <li key={idx} className="flex gap-3">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                        <p className="text-sm text-slate-300 font-medium">{item}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(showDomessticular || showTeleconsulta || servicesList.length > 0) && (
                <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-xl space-y-4">
                  <div className="w-12 h-12 bg-emerald-600/20 text-emerald-400 rounded-2xl flex items-center justify-center">
                    <Stethoscope size={24} />
                  </div>
                  <h3 className="text-lg font-black text-white tracking-tight">Serviços Oferecidos</h3>
                  <ul className="space-y-3">
                    {showDomessticular && (
                      <li className="flex gap-3">
                        <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full mt-2 flex-shrink-0" />
                        <p className="text-sm text-slate-300 font-medium">Atendimento Domiciliar</p>
                      </li>
                    )}
                    {showTeleconsulta && (
                      <li className="flex gap-3">
                        <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full mt-2 flex-shrink-0" />
                        <p className="text-sm text-slate-300 font-medium">Teleconsulta (Online)</p>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Booking Card */}
          <div className="space-y-6">
            <div className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] shadow-2xl border border-white/10 sticky top-8">
              <div className="text-center space-y-4 mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-500/30">
                  <Wallet size={14} />
                  Investimento
                </div>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-slate-400 text-lg font-bold">R$</span>
                  <span className="text-5xl font-black text-white tracking-tighter">
                    {lowestPrice !== null 
                      ? lowestPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                      : '---'}
                  </span>
                  <span className="text-slate-400 text-sm font-bold">/sessão</span>
                </div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                  Valores variam por tipo de serviço
                </p>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={() => setShowBookingModal(true)}
                  className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2"
                >
                  <CalendarIcon size={20} />
                  Agendar Consulta
                </button>
                <button 
                  onClick={() => navigate(`/chat?user=${physio.id}`)}
                  className="w-full py-5 bg-white/5 text-slate-300 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10 flex items-center justify-center gap-2"
                >
                  <MessageSquare size={20} />
                  Enviar Mensagem
                </button>
              </div>

              <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                <div className="flex items-center gap-3 text-slate-400">
                  <Clock size={18} className="text-blue-400" />
                  <span className="text-xs font-bold">Resposta em até 2 horas</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                  <ShieldCheck size={18} className="text-blue-400" />
                  <span className="text-xs font-bold">Garantia de atendimento</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {showBookingModal && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBookingModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 rounded-[3rem] shadow-2xl p-8 overflow-hidden border border-white/10"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-white tracking-tight">Agendar Consulta</h2>
                <button onClick={() => setShowBookingModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-all text-slate-400">
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleConfirmarAgendamento} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Data</label>
                    <input 
                      type="date"
                      required
                      value={bookingData.data}
                      onChange={(e) => setBookingData({...bookingData, data: e.target.value})}
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Hora</label>
                    <input 
                      type="time"
                      required
                      value={bookingData.hora}
                      onChange={(e) => setBookingData({...bookingData, hora: e.target.value})}
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Selecione o Serviço ou Pacote</label>
                  
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {/* Serviços Avulsos */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Sessões Avulsas</p>
                      {activeServices.map(svc => {
                        const isSelected = bookingData.tipo === `service:${svc.name}|${svc.base_price}`;
                        return (
                          <button
                            key={svc.id}
                            type="button"
                            onClick={() => {
                              const value = `service:${svc.name}|${svc.base_price}`;
                              setBookingData({ ...bookingData, tipo: value, valor: Number(svc.base_price) || 0 });
                            }}
                            className={cn(
                              "w-full p-4 rounded-2xl border transition-all text-left flex justify-between items-center group",
                              isSelected 
                                ? "bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/20" 
                                : "bg-white/5 border-white/10 hover:border-white/20"
                            )}
                          >
                            <div className="flex flex-col">
                              <span className={cn("font-bold text-sm", isSelected ? "text-white" : "text-white")}>{svc.name}</span>
                              <span className={cn("text-[10px] font-bold uppercase", isSelected ? "text-blue-200" : "text-slate-500")}>Sessão Avulsa</span>
                            </div>
                            <span className={cn("font-black text-sm", isSelected ? "text-white" : "text-blue-400")}>
                              R$ {Number(svc.base_price).toFixed(2)}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Pacotes */}
                    {activePackages.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Pacotes de Tratamento</p>
                        {activePackages.map(pkg => {
                          const isSelected = bookingData.tipo === `package:${pkg.name}|${pkg.total_price}`;
                          return (
                            <button
                              key={pkg.id}
                              type="button"
                              onClick={() => {
                                const value = `package:${pkg.name}|${pkg.total_price}`;
                                setBookingData({ ...bookingData, tipo: value, valor: Number(pkg.total_price) || 0 });
                              }}
                              className={cn(
                                "w-full p-4 rounded-2xl border transition-all text-left flex justify-between items-center group relative overflow-hidden",
                                isSelected 
                                  ? "bg-emerald-600 border-emerald-500 shadow-lg shadow-emerald-900/20" 
                                  : "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40"
                              )}
                            >
                              <div className="flex flex-col relative z-10">
                                <div className="flex items-center gap-2">
                                  <span className={cn("font-bold text-sm", isSelected ? "text-white" : "text-white")}>{pkg.name}</span>
                                  <span className={cn(
                                    "text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase",
                                    isSelected ? "bg-white text-emerald-600" : "bg-emerald-600 text-white"
                                  )}>Pacote</span>
                                </div>
                                <span className={cn("text-[10px] font-bold uppercase", isSelected ? "text-emerald-100" : "text-emerald-500/70")}>
                                  {pkg.sessions_quantity} sessões (R$ {(pkg.total_price/pkg.sessions_quantity).toFixed(2)}/cada)
                                </span>
                              </div>
                              <span className={cn("font-black text-sm relative z-10", isSelected ? "text-white" : "text-emerald-400")}>
                                R$ {Number(pkg.total_price).toFixed(2)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Observações</label>
                  <textarea 
                    value={bookingData.observacoes}
                    onChange={(e) => setBookingData({...bookingData, observacoes: e.target.value})}
                    placeholder="Conte brevemente o motivo do agendamento..."
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold text-white h-32 resize-none"
                  />
                </div>

                <div className="p-4 bg-blue-600/10 rounded-2xl border border-blue-500/20 flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400">Total da Sessão:</span>
                  <span className="text-lg font-black text-blue-400">R$ {(bookingData.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <button 
                  type="submit"
                  disabled={bookingLoading}
                  className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {bookingLoading ? <Loader2 className="animate-spin" /> : 'Confirmar Solicitação'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
