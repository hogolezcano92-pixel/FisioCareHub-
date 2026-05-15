import React from 'react';
import {
  Search,
  MapPin,
  Clock,
  Send,
  Loader2,
  RefreshCcw,
  Crown,
  ShieldCheck,
  MessageCircle,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Users,
  Lock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { opportunitiesService, PatientOpportunity, OpportunityServiceType } from '../services/opportunitiesService';

const formatDateTime = (value?: string) => {
  if (!value) return 'Agora';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const serviceLabel: Record<OpportunityServiceType, string> = {
  domicilio: 'Domiciliar',
  online: 'Online',
  ambos: 'Online ou Domiciliar',
};

export default function PhysioOpportunities() {
  const { profile, subscription } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [sendingId, setSendingId] = React.useState<string | null>(null);
  const [opportunities, setOpportunities] = React.useState<PatientOpportunity[]>([]);
  const [search, setSearch] = React.useState('');
  const [city, setCity] = React.useState('');
  const [state, setState] = React.useState('');
  const [serviceType, setServiceType] = React.useState<OpportunityServiceType | 'todos'>('todos');
  const [selected, setSelected] = React.useState<PatientOpportunity | null>(null);
  const [interestMessage, setInterestMessage] = React.useState('');
  const [feedback, setFeedback] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isPro =
    profile?.plano === 'pro'
    || profile?.is_pro === true
    || subscription?.status === 'ativo'
    || profile?.plano === 'admin';

  const fetchOpportunities = React.useCallback(async () => {
    try {
      setLoading(true);
      setFeedback(null);

      const data = await opportunitiesService.getOpenOpportunities({
        search,
        cidade: city,
        estado: state,
        tipo_atendimento: serviceType,
      });

      setOpportunities(data);
    } catch (err: any) {
      console.error('[PHYSIO_OPPORTUNITIES_LOAD_ERROR]', err);
      setFeedback({
        type: 'error',
        text: err.message || 'Não foi possível carregar oportunidades.',
      });
    } finally {
      setLoading(false);
    }
  }, [search, city, state, serviceType]);

  React.useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const handleSendInterest = async (item: PatientOpportunity) => {
    if (item.interesse_enviado || sendingId) return;

    try {
      setSendingId(item.id);
      setFeedback(null);

      await opportunitiesService.sendInterest({
        solicitacao_id: item.id,
        paciente_id: item.paciente_id,
        mensagem: interestMessage,
      });

      setOpportunities(prev => prev.map(op =>
        op.id === item.id ? { ...op, interesse_enviado: true } : op
      ));
      setSelected(prev => prev?.id === item.id ? { ...prev, interesse_enviado: true } : prev);
      setInterestMessage('');

      setFeedback({
        type: 'success',
        text: 'Interesse enviado. O paciente foi notificado e a conversa seguirá dentro do FisioCareHub.',
      });
    } catch (err: any) {
      console.error('[PHYSIO_OPPORTUNITY_INTEREST_ERROR]', err);
      setFeedback({
        type: 'error',
        text: err.message || 'Não foi possível enviar interesse.',
      });
    } finally {
      setSendingId(null);
    }
  };

  if (!isPro) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="relative overflow-hidden rounded-[3rem] border border-amber-500/20 bg-slate-900 p-8 sm:p-12 shadow-2xl">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative z-10 text-center max-w-2xl mx-auto">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-amber-500/10 text-amber-300 border border-amber-400/20">
              <Lock size={36} />
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Oportunidades são exclusivas para fisioterapeutas Pro
            </h1>

            <p className="mt-4 text-slate-300 leading-relaxed font-medium">
              Aqui os profissionais Pro visualizam pacientes que publicaram interesse em atendimento.
              O contato e o pagamento continuam dentro do FisioCareHub para proteger a comissão da plataforma.
            </p>

            <a
              href="/subscription"
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-7 py-4 text-sm font-black uppercase tracking-widest text-slate-950 shadow-xl shadow-amber-500/20 hover:bg-amber-400 transition-all"
            >
              <Crown size={18} />
              Ativar Plano Pro
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 space-y-8">
      <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-slate-900 p-8 sm:p-10 shadow-2xl shadow-blue-950/20">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute left-1/3 bottom-0 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300 border border-emerald-400/20 mb-4">
              <ShieldCheck size={14} />
              Marketplace Pro
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Oportunidades de Atendimento
            </h1>

            <p className="mt-3 max-w-2xl text-slate-300 font-medium leading-relaxed">
              Veja pacientes que procuram fisioterapia e demonstre interesse. Todo o contato, agendamento e pagamento permanecem dentro do FisioCareHub.
            </p>
          </div>

          <button
            onClick={fetchOpportunities}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 py-4 text-xs font-black uppercase tracking-widest text-white border border-white/10 hover:bg-white/15 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCcw size={16} />}
            Atualizar
          </button>
        </div>
      </div>

      {feedback && (
        <div className={cn(
          "rounded-2xl border p-4 text-sm font-bold flex items-start gap-3",
          feedback.type === 'success'
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
            : "bg-rose-500/10 border-rose-500/20 text-rose-300"
        )}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-4 xl:col-span-3 space-y-4">
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-5">
              <SlidersHorizontal className="text-blue-400" size={18} />
              <h2 className="text-sm font-black uppercase tracking-widest text-white">Filtros</h2>
            </div>

            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Buscar</span>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Dor, joelho, lombar..."
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-11 pr-4 text-sm font-bold text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cidade</span>
                  <input
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="São Paulo"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 px-4 text-sm font-bold text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">UF</span>
                  <input
                    value={state}
                    onChange={e => setState(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="SP"
                    maxLength={2}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 px-4 text-sm font-bold text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50 uppercase"
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo</span>
                <select
                  value={serviceType}
                  onChange={e => setServiceType(e.target.value as OpportunityServiceType | 'todos')}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 px-4 text-sm font-bold text-white outline-none focus:border-blue-500/50"
                >
                  <option value="todos" className="bg-slate-900">Todos</option>
                  <option value="domicilio" className="bg-slate-900">Domiciliar</option>
                  <option value="online" className="bg-slate-900">Online</option>
                  <option value="ambos" className="bg-slate-900">Ambos</option>
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-[2rem] border border-blue-500/20 bg-blue-500/10 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-2">Regra importante</p>
            <p className="text-xs font-semibold leading-relaxed text-slate-300">
              Não envie telefone, WhatsApp ou e-mail. Use o chat, agendamento e pagamento dentro do FisioCareHub.
            </p>
          </div>
        </aside>

        <main className="lg:col-span-8 xl:col-span-9">
          {loading ? (
            <div className="min-h-[420px] rounded-[3rem] border border-white/10 bg-slate-900/60 flex flex-col items-center justify-center text-center">
              <Loader2 className="animate-spin text-blue-400 mb-4" size={40} />
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Carregando oportunidades...</p>
            </div>
          ) : opportunities.length === 0 ? (
            <div className="min-h-[420px] rounded-[3rem] border border-dashed border-white/10 bg-slate-900/40 flex flex-col items-center justify-center text-center p-10">
              <Users className="text-slate-600 mb-4" size={48} />
              <h3 className="text-xl font-black text-white mb-2">Nenhuma oportunidade encontrada</h3>
              <p className="max-w-md text-sm text-slate-400 font-medium">
                Quando pacientes publicarem solicitações visíveis para profissionais Pro, elas aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {opportunities.map((item, index) => (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-5 shadow-xl hover:border-blue-500/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-300 border border-emerald-500/20">
                          {serviceLabel[item.tipo_atendimento]}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">{formatDateTime(item.created_at)}</span>
                      </div>

                      <h2 className="text-lg font-black text-white tracking-tight line-clamp-2">
                        {item.titulo || 'Paciente procurando atendimento'}
                      </h2>
                    </div>

                    <div className="h-11 w-11 rounded-2xl bg-white/5 flex items-center justify-center text-blue-300 border border-white/10 shrink-0">
                      <MessageCircle size={20} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Queixa principal</p>
                      <p className="text-sm font-semibold text-slate-200 leading-relaxed">{item.queixa_principal}</p>
                    </div>

                    {item.descricao && (
                      <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">{item.descricao}</p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-3 flex items-center gap-2">
                        <MapPin size={16} className="text-slate-500" />
                        <span className="text-xs font-bold text-slate-300 truncate">
                          {[item.bairro, item.cidade, item.estado].filter(Boolean).join(', ') || 'Local não informado'}
                        </span>
                      </div>

                      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-3 flex items-center gap-2">
                        <Clock size={16} className="text-slate-500" />
                        <span className="text-xs font-bold text-slate-300 truncate">
                          {item.preferencia_horario || 'Horário flexível'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(item);
                        setInterestMessage(`Olá! Vi sua solicitação sobre ${item.queixa_principal}. Tenho interesse em atender você pelo FisioCareHub. Podemos seguir por aqui para manter o agendamento e pagamento seguros na plataforma.`);
                      }}
                      className="flex-1 rounded-2xl bg-white/10 border border-white/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-white/15 transition-all"
                    >
                      Ver detalhes
                    </button>

                    <button
                      type="button"
                      disabled={item.interesse_enviado || sendingId === item.id}
                      onClick={() => handleSendInterest(item)}
                      className={cn(
                        "flex-1 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                        item.interesse_enviado
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          : "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20"
                      )}
                    >
                      {sendingId === item.id ? <Loader2 className="animate-spin" size={16} /> : item.interesse_enviado ? <CheckCircle2 size={16} /> : <Send size={16} />}
                      {item.interesse_enviado ? 'Interesse enviado' : 'Tenho interesse'}
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </main>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-2xl rounded-[3rem] border border-white/10 bg-slate-900 p-6 sm:p-8 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <span className="inline-flex rounded-full bg-blue-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-blue-300 border border-blue-500/20 mb-3">
                  {serviceLabel[selected.tipo_atendimento]}
                </span>
                <h2 className="text-2xl font-black text-white">{selected.titulo}</h2>
                <p className="text-sm text-slate-400 font-semibold mt-1">
                  {[selected.bairro, selected.cidade, selected.estado].filter(Boolean).join(', ') || 'Local não informado'}
                </p>
              </div>

              <button
                onClick={() => setSelected(null)}
                className="h-10 w-10 rounded-2xl bg-white/10 text-white hover:bg-white/15 transition-all"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Queixa principal</p>
                <p className="text-sm font-semibold text-slate-200 leading-relaxed">{selected.queixa_principal}</p>
              </div>

              {selected.descricao && (
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Descrição</p>
                  <p className="text-sm font-semibold text-slate-200 leading-relaxed whitespace-pre-wrap">{selected.descricao}</p>
                </div>
              )}

              <label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Mensagem de interesse
                </span>
                <textarea
                  value={interestMessage}
                  onChange={e => setInterestMessage(e.target.value)}
                  rows={5}
                  className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 text-sm font-semibold text-white outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 resize-none"
                  placeholder="Escreva uma mensagem curta para o paciente..."
                />
              </label>

              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4">
                <p className="text-xs font-bold text-amber-200 leading-relaxed">
                  Não compartilhe telefone, WhatsApp ou e-mail. O paciente deve contratar e pagar dentro do FisioCareHub para manter a comissão e a segurança do atendimento.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setSelected(null)}
                className="flex-1 rounded-2xl bg-white/10 border border-white/10 px-5 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-white/15 transition-all"
              >
                Fechar
              </button>

              <button
                disabled={selected.interesse_enviado || sendingId === selected.id}
                onClick={() => handleSendInterest(selected)}
                className={cn(
                  "flex-1 rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  selected.interesse_enviado
                    ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                    : "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20"
                )}
              >
                {sendingId === selected.id ? <Loader2 className="animate-spin" size={16} /> : selected.interesse_enviado ? <CheckCircle2 size={16} /> : <Send size={16} />}
                {selected.interesse_enviado ? 'Interesse já enviado' : 'Enviar interesse'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
