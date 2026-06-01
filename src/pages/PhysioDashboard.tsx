import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Users,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Loader2,
  ChevronRight,
  ClipboardList,
  DollarSign,
  Activity,
  Star,
  Award,
  Quote,
  TrendingUp,
} from 'lucide-react';
import { FinancialDashboard } from '../components/FisioCare/FinancialDashboard';
import ActivityTimeline from '../components/FisioCare/ActivityTimeline';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import FloatingHelpMenu from '../components/FloatingHelpMenu';
import ApprovalWelcomeModal from '../components/ApprovalWelcomeModal';
import ProGuard from '../components/ProGuard';
import ProductStoreCarousel from '../components/ProductStoreCarousel';
import ClinicalUpdatesCarousel from '../components/FisioCare/ClinicalUpdatesCarousel';


const PAID_APPOINTMENT_PAYMENT_STATUSES = ['pago_app', 'pago_manual', 'paid', 'pago', 'confirmado'];

const hasConfirmedPayment = (appointment: any) => {
  const paymentStatus = String(appointment?.status_pagamento || appointment?.payment_status || '').toLowerCase();
  return PAID_APPOINTMENT_PAYMENT_STATUSES.includes(paymentStatus);
};

type ActiveTab = 'requests' | 'agenda' | 'financeiro' | 'historico' | 'avaliacoes';

type Review = {
  id: string;
  agendamento_id: string | null;
  paciente_id: string | null;
  paciente_nome: string | null;
  paciente_avatar_url: string | null;
  nota_profissional: number | null;
  nota_plataforma: number | null;
  estrelas: number | null;
  comentario: string | null;
  created_at: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  service_name: string | null;
  service_type: string | null;
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Data não informada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data não informada';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatTime = (value?: string | null) => {
  if (!value) return '';
  return value.slice(0, 5);
};

const getRating = (review: Review) => Number(review.nota_profissional || review.estrelas || 0);

const RatingStars = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-1">
    {Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        size={16}
        className={index < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}
      />
    ))}
  </div>
);

export default function PhysioDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<ActiveTab>((searchParams.get('tab') as ActiveTab) || 'requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [filter, setFilter] = useState({
    location: '',
    specialty: '',
  });

  useEffect(() => {
    if (profile && profile.status_aprovacao === 'aprovado' && !profile.plan_intro_seen && profile.tipo_usuario === 'fisioterapeuta') {
      setShowWelcome(true);
    }
  }, [profile]);

  useEffect(() => {
    const tab = searchParams.get('tab') as ActiveTab;
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const reviewStats = (() => {
    const total = reviews.length;
    const professionalRatings = reviews
      .map(getRating)
      .filter((rating) => rating > 0);
    const platformRatings = reviews
      .map((review) => Number(review.nota_plataforma || 0))
      .filter((rating) => rating > 0);

    const averageProfessional = professionalRatings.length
      ? professionalRatings.reduce((sum, rating) => sum + rating, 0) / professionalRatings.length
      : 0;

    const averagePlatform = platformRatings.length
      ? platformRatings.reduce((sum, rating) => sum + rating, 0) / platformRatings.length
      : 0;

    return {
      total,
      averageProfessional,
      averagePlatform,
      lastReview: reviews[0],
    };
  })();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: reqData, error: reqError } = await supabase
        .from('solicitacoes_atendimento')
        .select(`
          *,
          paciente:perfis!paciente_id(nome_completo, avatar_url)
        `)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });

      if (!reqError) setRequests(reqData || []);

      let appQuery = supabase
        .from('agendamentos')
        .select(`
          *,
          paciente:perfis!paciente_id(nome_completo, avatar_url)
        `)
        .eq('fisio_id', user?.id);

      appQuery = appQuery.in('status_pagamento', PAID_APPOINTMENT_PAYMENT_STATUSES);

      const { data: appData, error: appError } = await appQuery.order('data', { ascending: true });
      if (!appError) setAppointments((appData || []).filter(hasConfirmedPayment));

      const { data: actData } = await supabase
        .from('historico_atividades')
        .select('*')
        .eq('usuario_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setActivities(actData || []);

      const { data: reviewsData, error: reviewsError } = await supabase.rpc('physio_reviews_dashboard', {
        limit_count: 50,
      });

      if (reviewsError) {
        console.warn('Não foi possível carregar avaliações do fisioterapeuta:', reviewsError.message);
        setReviews([]);
      } else {
        setReviews((reviewsData || []) as Review[]);
      }
    } catch (err) {
      console.error('Erro ao buscar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('solicitacoes_atendimento')
        .update({
          status: 'aceito',
          fisio_id: user?.id,
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Solicitação aceita! O paciente será notificado.');
      fetchData();
    } catch (err) {
      console.error('Erro ao aceitar solicitação:', err);
      toast.error('Erro ao aceitar solicitação');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('solicitacoes_atendimento')
        .update({ status: 'recusado' })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Solicitação recusada');
      fetchData();
    } catch (err) {
      console.error('Erro ao recusar solicitação:', err);
      toast.error('Erro ao recusar solicitação');
    }
  };

  const tabButtonClass = (tab: ActiveTab) => cn(
    'flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap',
    activeTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:text-slate-200'
  );

  return (
    <div className="dashboard-light-page min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col gap-6 bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-white tracking-tight">
                {activeTab === 'avaliacoes' ? 'Reputação Profissional' : 'Dashboard do Profissional'}
              </h1>
              <p className="text-slate-400 font-medium">
                {activeTab === 'avaliacoes'
                  ? 'Veja as avaliações recebidas dos pacientes, sua nota média e os comentários reais sobre seus atendimentos.'
                  : 'Gerencie solicitações, agenda, reputação e histórico em um só lugar.'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:flex p-1.5 bg-white/5 rounded-2xl border border-white/10 overflow-x-auto">
              <button onClick={() => navigate('/dashboard/fisio?tab=requests')} className={tabButtonClass('requests')}>
                <Users size={16} /> Solicitações
                {requests.length > 0 && (
                  <span className="ml-1 w-5 h-5 bg-white text-blue-600 rounded-full flex items-center justify-center text-[10px] font-black">
                    {requests.length}
                  </span>
                )}
              </button>
              <button onClick={() => navigate('/dashboard/fisio?tab=agenda')} className={tabButtonClass('agenda')}>
                <Calendar size={16} /> Minha Agenda
              </button>
              <button onClick={() => navigate('/dashboard/fisio?tab=avaliacoes')} className={tabButtonClass('avaliacoes')}>
                <Star size={16} /> Reputação
                {reviews.length > 0 && (
                  <span className="ml-1 w-5 h-5 bg-white text-blue-600 rounded-full flex items-center justify-center text-[10px] font-black">
                    {reviews.length}
                  </span>
                )}
              </button>
              <button onClick={() => navigate('/dashboard/fisio?tab=financeiro')} className={tabButtonClass('financeiro')}>
                <DollarSign size={16} /> Financeiro
              </button>
              <button onClick={() => navigate('/dashboard/fisio?tab=historico')} className={tabButtonClass('historico')}>
                <Activity size={16} /> Histórico
              </button>
            </div>
          </div>


          {activeTab !== 'avaliacoes' && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <QuickActionCard
              icon={<Users size={34} />}
              label="Pacientes"
              onClick={() => navigate('/patients')}
            />
            <QuickActionCard
              icon={<Calendar size={34} />}
              label="Agenda"
              onClick={() => navigate('/dashboard/fisio?tab=agenda')}
            />
            <QuickActionCard
              icon={<Activity size={34} />}
              label="Exercícios"
              onClick={() => navigate('/exercises')}
            />
            <QuickActionCard
              icon={<ClipboardList size={34} />}
              label="Prontuários"
              onClick={() => navigate('/records')}
            />
            <QuickActionCard
              icon={<DollarSign size={34} />}
              label="Financeiro"
              onClick={() => navigate('/dashboard/fisio?tab=financeiro')}
            />
            <QuickActionCard
              icon={<Star size={34} />}
              label="Reputação"
              description={reviews.length > 0 ? `${reviewStats.averageProfessional.toFixed(1)} ★ • ${reviews.length} avaliações` : 'Avaliações dos pacientes'}
              highlight
              badge={reviews.length > 0 ? String(reviews.length) : undefined}
              onClick={() => navigate('/dashboard/fisio?tab=avaliacoes')}
            />
            </div>
          )}

          {activeTab !== 'avaliacoes' && reviews.length > 0 && (
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-5 rounded-[2rem] bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Award size={20} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nota profissional</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-white">{reviewStats.averageProfessional.toFixed(1)}</span>
                  <span className="text-slate-500 font-bold mb-1">/ 5</span>
                </div>
              </div>

              <div className="p-5 rounded-[2rem] bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <TrendingUp size={20} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Avaliações recebidas</span>
                </div>
                <span className="text-3xl font-black text-white">{reviewStats.total}</span>
              </div>

              <div className="p-5 rounded-[2rem] bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Star size={20} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nota da plataforma</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-white">{reviewStats.averagePlatform.toFixed(1)}</span>
                  <span className="text-slate-500 font-bold mb-1">/ 5</span>
                </div>
              </div>
            </div>
          )}
        </div>


        {activeTab !== 'avaliacoes' && (
          <>
            <ClinicalUpdatesCarousel />
            <ProductStoreCarousel audience="physio" />
          </>
        )}

        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Carregando dados...</p>
            </div>
          ) : activeTab === 'requests' ? (
            <RequestsTab
              requests={requests}
              filter={filter}
              setFilter={setFilter}
              handleAcceptRequest={handleAcceptRequest}
              handleRejectRequest={handleRejectRequest}
            />
          ) : activeTab === 'avaliacoes' ? (
            <ReviewsTab reviews={reviews} stats={reviewStats} />) : activeTab === 'financeiro' ? (
            <ProGuard requiredPlan="pro">
              <FinancialDashboard />
            </ProGuard>
          ) : activeTab === 'historico' ? (
            <div className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center">
                  <Activity size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Histórico de Atividades</h2>
                  <p className="text-slate-400 text-xs font-medium">Acompanhe suas interações recentes no sistema.</p>
                </div>
              </div>
              <ActivityTimeline activities={activities} />
            </div>
          ) : (
            <ProGuard requiredPlan="pro">
              <AgendaTab appointments={appointments} />
            </ProGuard>
          )}
        </div>
      </div>
      <FloatingHelpMenu />
      {showWelcome && <ApprovalWelcomeModal onClose={() => setShowWelcome(false)} />}
    </div>
  );
}


function QuickActionCard({
  icon,
  label,
  description,
  badge,
  highlight = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  description?: string;
  badge?: string;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative min-h-[132px] rounded-[2rem] border p-5 text-left transition-all active:scale-[0.98] overflow-hidden',
        highlight
          ? 'bg-amber-500/10 border-amber-400/30 hover:bg-amber-500/15 hover:border-amber-300/60 shadow-lg shadow-amber-950/10'
          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-blue-400/30'
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      {badge ? (
        <span className="absolute right-4 top-4 min-w-7 h-7 px-2 rounded-full bg-white text-blue-600 text-xs font-black flex items-center justify-center shadow-lg">
          {badge}
        </span>
      ) : null}
      <div className={cn('relative mb-4', highlight ? 'text-amber-300' : 'text-slate-400 group-hover:text-blue-300')}>
        {icon}
      </div>
      <div className="relative space-y-1">
        <p className="text-sm sm:text-base font-black uppercase tracking-[0.22em] text-white">
          {label}
        </p>
        {description ? (
          <p className="text-xs font-bold text-slate-400 leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
    </button>
  );
}

function RequestsTab({ requests, filter, setFilter, handleAcceptRequest, handleRejectRequest }: any) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <MapPin className="absolute pointer-events-none z-20" style={{ left: 16, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Filtrar por localização..."
            value={filter.location}
            onChange={(e) => setFilter({ ...filter, location: e.target.value })}
            className="w-full p-4 pr-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 !pl-[60px]"
          />
        </div>
        <div className="flex-1 min-w-[200px] relative">
          <ClipboardList className="absolute pointer-events-none z-20" style={{ left: 16, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Filtrar por especialidade..."
            value={filter.specialty}
            onChange={(e) => setFilter({ ...filter, specialty: e.target.value })}
            className="w-full p-4 pr-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 !pl-[60px]"
          />
        </div>
      </div>

      <div className="grid gap-6">
        {requests.length > 0 ? requests.map((req: any) => (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-xl hover:shadow-2xl transition-all"
          >
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <img
                src={req.paciente?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.paciente_id}`}
                alt="Paciente"
                className="w-20 h-20 rounded-2xl object-cover bg-white/5 border border-white/10"
              />
              <div className="flex-1 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">{req.paciente?.nome_completo || 'Paciente'}</h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400"><MapPin size={14} className="text-blue-400" />{req.localizacao}</span>
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400"><Clock size={14} className="text-blue-400" />{formatDate(req.created_at)}</span>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-blue-600/20 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-500/30">
                    {req.especialidade || 'Geral'}
                  </div>
                </div>
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-slate-300 font-medium leading-relaxed italic">"{req.descricao}"</p>
                </div>
                <div className="flex flex-wrap gap-4 pt-4">
                  <button onClick={() => handleAcceptRequest(req.id)} className="flex-1 min-w-[140px] py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">
                    <CheckCircle2 size={18} /> Aceitar Atendimento
                  </button>
                  <button onClick={() => handleRejectRequest(req.id)} className="flex-1 min-w-[140px] py-4 bg-white/5 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10 flex items-center justify-center gap-2">
                    <XCircle size={18} /> Recusar
                  </button>
                  <button className="p-4 bg-white/5 text-slate-400 rounded-2xl hover:bg-white/10 transition-all border border-white/10">
                    <MessageSquare size={18} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )) : (
          <EmptyState icon={<Users size={32} />} title="Nenhuma solicitação pendente" description="Novas solicitações de pacientes aparecerão aqui." />
        )}
      </div>
    </div>
  );
}

function ReviewsTab({ reviews, stats }: { reviews: Review[]; stats: any }) {
  if (!reviews.length) {
    return (
      <EmptyState
        icon={<Star size={32} />}
        title="Nenhuma avaliação recebida ainda"
        description="Quando um paciente avaliar um atendimento concluído, a avaliação aparecerá aqui."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-amber-500/10 via-slate-900/70 to-blue-500/10 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl">
        <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400/10 text-amber-300 border border-amber-400/20 rounded-full text-[10px] font-black uppercase tracking-widest">
              <Award size={14} /> Sua reputação
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight">Avaliações dos seus pacientes</h2>
            <p className="text-slate-300 font-medium max-w-2xl">
              Acompanhe a percepção dos pacientes sobre seus atendimentos. A nota da plataforma ajuda o FisioCareHub a melhorar a experiência geral.
            </p>
          </div>
          <div className="text-right space-y-2">
            <div className="text-5xl font-black text-white">{stats.averageProfessional.toFixed(1)}</div>
            <RatingStars rating={stats.averageProfessional} />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stats.total} avaliações</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5">
        {reviews.map((review) => {
          const rating = getRating(review);
          const service = review.service_name || review.service_type || 'Atendimento fisioterapêutico';
          return (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-lg"
            >
              <div className="flex flex-col md:flex-row gap-5 md:items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <img
                    src={review.paciente_avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${review.paciente_id || review.id}`}
                    alt="Paciente"
                    className="w-14 h-14 rounded-2xl object-cover bg-white/5 border border-white/10"
                  />
                  <div className="space-y-3 flex-1">
                    <div>
                      <h3 className="text-lg font-black text-white tracking-tight">{review.paciente_nome || 'Paciente FisioCareHub'}</h3>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        {service} • {formatDate(review.appointment_date)} {formatTime(review.appointment_time)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <RatingStars rating={rating} />
                      <span className="text-sm font-black text-white">{rating.toFixed(1)}/5</span>
                      {review.nota_plataforma ? (
                        <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest">
                          Plataforma {review.nota_plataforma}/5
                        </span>
                      ) : null}
                    </div>
                    {review.comentario ? (
                      <div className="relative p-5 bg-white/5 rounded-2xl border border-white/10">
                        <Quote className="absolute top-4 right-4 text-slate-700" size={24} />
                        <p className="text-slate-200 font-medium leading-relaxed pr-8">“{review.comentario}”</p>
                      </div>
                    ) : (
                      <p className="text-slate-500 font-medium italic">Paciente não deixou comentário escrito.</p>
                    )}
                  </div>
                </div>
                <div className="flex md:flex-col gap-2 md:items-end">
                  <span className="px-3 py-2 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                    Avaliação real
                  </span>
                  <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Recebida em {formatDate(review.created_at)}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function AgendaTab({ appointments }: { appointments: any[] }) {
  return (
    <div className="grid gap-6">
      {appointments.length > 0 ? appointments.map((app) => (
        <div key={app.id} className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <img src={app.paciente?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${app.paciente_id}`} alt="Paciente" className="w-16 h-16 rounded-2xl object-cover bg-white/5 border border-white/10" />
            <div>
              <h4 className="text-lg font-black text-white tracking-tight">{app.paciente?.nome_completo || 'Paciente'}</h4>
              <div className="flex items-center gap-4 mt-1">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400"><Calendar size={14} className="text-blue-400" />{formatDate(app.data)}</span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400"><Clock size={14} className="text-blue-400" />{formatTime(app.hora)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={cn(
              'px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border',
              app.status === 'confirmado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              app.status === 'pago' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
              app.status === 'recusado' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
              'bg-amber-500/10 text-amber-400 border-amber-500/20'
            )}>
              {app.status === 'pendente_pagamento' ? 'Aguardando Pagamento' : app.status === 'pago' ? 'Pago (Aguardando Confirmação)' : app.status}
            </div>
            <button className="p-3 bg-white/5 text-slate-400 rounded-xl hover:bg-white/10 transition-all border border-white/10"><ChevronRight size={20} /></button>
          </div>
        </div>
      )) : (
        <EmptyState icon={<Calendar size={32} />} title="Agenda vazia" description="Você ainda não tem consultas agendadas." />
      )}
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="text-center py-20 bg-slate-900/50 backdrop-blur-xl rounded-[3rem] border border-dashed border-white/10 space-y-4">
      <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto text-slate-500">
        {icon}
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-black text-white">{title}</h3>
        <p className="text-slate-400 font-medium">{description}</p>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
