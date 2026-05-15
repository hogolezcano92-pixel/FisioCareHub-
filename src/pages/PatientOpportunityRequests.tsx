import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  MapPin,
  MessageCircle,
  Plus,
  RefreshCcw,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import {
  CreateOpportunityInput,
  opportunitiesService,
  OpportunityServiceType,
  OpportunityStatus,
  PatientOpportunity,
} from '../services/opportunitiesService';

const serviceLabel: Record<OpportunityServiceType, string> = {
  domicilio: 'Domiciliar',
  online: 'Online',
  ambos: 'Online ou Domiciliar',
};

const statusLabel: Record<OpportunityStatus, string> = {
  aberta: 'Aberta',
  em_negociacao: 'Em negociação',
  convertida: 'Convertida',
  cancelada: 'Cancelada',
  encerrada: 'Encerrada',
};

const formatDateTime = (value?: string) => {
  if (!value) return 'Agora';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const initialForm: CreateOpportunityInput = {
  titulo: '',
  descricao: '',
  queixa_principal: '',
  tipo_atendimento: 'ambos',
  cidade: '',
  estado: '',
  bairro: '',
  preferencia_horario: '',
  observacoes_privadas: '',
  visivel_para_profissionais: true,
};

export default function PatientOpportunityRequests() {
  const { profile } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [requests, setRequests] = React.useState<PatientOpportunity[]>([]);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState<CreateOpportunityInput>(initialForm);
  const [feedback, setFeedback] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    setForm(prev => ({
      ...prev,
      cidade: prev.cidade || profile?.cidade || profile?.localizacao || '',
      estado: prev.estado || profile?.estado || '',
    }));
  }, [profile]);

  const fetchRequests = React.useCallback(async () => {
    try {
      setLoading(true);
      setFeedback(null);
      const data = await opportunitiesService.getMyPatientRequests();
      setRequests(data);
    } catch (err: any) {
      console.error('[PATIENT_REQUESTS_LOAD_ERROR]', err);
      setFeedback({
        type: 'error',
        text: err.message || 'Não foi possível carregar suas solicitações.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const updateForm = (field: keyof CreateOpportunityInput, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      ...initialForm,
      cidade: profile?.cidade || profile?.localizacao || '',
      estado: profile?.estado || '',
    });
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.queixa_principal?.trim()) {
      setFeedback({ type: 'error', text: 'Informe a queixa principal para publicar a solicitação.' });
      return;
    }

    try {
      setCreating(true);
      setFeedback(null);

      const created = await opportunitiesService.createPatientRequest({
        ...form,
        titulo: form.titulo?.trim() || `Atendimento para ${form.queixa_principal.trim()}`,
      });

      setRequests(prev => [created, ...prev]);
      resetForm();
      setShowForm(false);
      setFeedback({
        type: 'success',
        text: 'Solicitação publicada. Fisioterapeutas Pro poderão demonstrar interesse pelo FisioCareHub.',
      });
    } catch (err: any) {
      console.error('[PATIENT_REQUEST_CREATE_ERROR]', err);
      setFeedback({
        type: 'error',
        text: err.message || 'Não foi possível criar a solicitação.',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: OpportunityStatus) => {
    try {
      setUpdatingId(id);
      setFeedback(null);

      const updated = await opportunitiesService.updatePatientRequestStatus(id, status);
      setRequests(prev => prev.map(item => item.id === id ? { ...item, ...updated } : item));

      setFeedback({
        type: 'success',
        text: status === 'cancelada' ? 'Solicitação cancelada.' : 'Solicitação atualizada.',
      });
    } catch (err: any) {
      console.error('[PATIENT_REQUEST_STATUS_ERROR]', err);
      setFeedback({
        type: 'error',
        text: err.message || 'Não foi possível atualizar a solicitação.',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 space-y-8">
      <section className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-slate-900 p-8 sm:p-10 shadow-2xl shadow-blue-950/20">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute left-1/3 bottom-0 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300 border border-emerald-400/20 mb-4">
              <ShieldCheck size={14} />
              Atendimento seguro dentro do app
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Minhas Solicitações de Atendimento
            </h1>

            <p className="mt-3 max-w-2xl text-slate-300 font-medium leading-relaxed">
              Publique uma necessidade e permita que fisioterapeutas Pro demonstrem interesse. O contato, agendamento e pagamento continuam dentro do FisioCareHub.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={fetchRequests}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 py-4 text-xs font-black uppercase tracking-widest text-white border border-white/10 hover:bg-white/15 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCcw size={16} />}
              Atualizar
            </button>

            <button
              onClick={() => setShowForm(prev => !prev)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
            >
              <Plus size={16} />
              Nova solicitação
            </button>
          </div>
        </div>
      </section>

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

      {showForm && (
        <motion.form
          onSubmit={handleCreateRequest}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[3rem] border border-white/10 bg-slate-900/80 p-6 sm:p-8 shadow-xl space-y-6"
        >
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Publicar necessidade</h2>
            <p className="mt-1 text-sm text-slate-400 font-medium">
              Informe apenas dados clínicos e de localização aproximada. Não coloque telefone, WhatsApp, e-mail ou endereço completo.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <label className="space-y-2 md:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Título</span>
              <input
                value={form.titulo || ''}
                onChange={e => updateForm('titulo', e.target.value)}
                placeholder="Ex: Preciso de fisioterapia para dor lombar"
                className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Queixa principal *</span>
              <input
                value={form.queixa_principal}
                onChange={e => updateForm('queixa_principal', e.target.value)}
                placeholder="Ex: dor no joelho, pós-operatório, dor cervical..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Descrição</span>
              <textarea
                value={form.descricao || ''}
                onChange={e => updateForm('descricao', e.target.value)}
                rows={4}
                placeholder="Descreva o que você procura, há quanto tempo sente os sintomas e qual objetivo do atendimento."
                className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 resize-none"
              />
            </label>

            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo de atendimento</span>
              <select
                value={form.tipo_atendimento}
                onChange={e => updateForm('tipo_atendimento', e.target.value as OpportunityServiceType)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold text-white outline-none focus:border-blue-500/50"
              >
                <option value="ambos" className="bg-slate-900">Online ou Domiciliar</option>
                <option value="domicilio" className="bg-slate-900">Domiciliar</option>
                <option value="online" className="bg-slate-900">Online</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Preferência de horário</span>
              <input
                value={form.preferencia_horario || ''}
                onChange={e => updateForm('preferencia_horario', e.target.value)}
                placeholder="Ex: Noite, manhã, finais de semana"
                className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50"
              />
            </label>

            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cidade</span>
              <input
                value={form.cidade || ''}
                onChange={e => updateForm('cidade', e.target.value)}
                placeholder="São Paulo"
                className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50"
              />
            </label>

            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Estado</span>
              <input
                value={form.estado || ''}
                onChange={e => updateForm('estado', e.target.value.toUpperCase().slice(0, 2))}
                placeholder="SP"
                maxLength={2}
                className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50 uppercase"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Bairro / região aproximada</span>
              <input
                value={form.bairro || ''}
                onChange={e => updateForm('bairro', e.target.value)}
                placeholder="Ex: Butantã, Pinheiros, Centro..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50"
              />
            </label>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={form.visivel_para_profissionais ?? true}
              onChange={e => updateForm('visivel_para_profissionais', e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-900 text-blue-600"
            />
            <span>
              <span className="block text-sm font-black text-emerald-200">Permitir que fisioterapeutas Pro vejam esta solicitação</span>
              <span className="block mt-1 text-xs font-semibold text-slate-300">
                Eles não verão telefone, e-mail, WhatsApp nem endereço completo. O contato será pelo FisioCareHub.
              </span>
            </span>
          </label>

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="rounded-2xl bg-white/10 border border-white/10 px-6 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-white/15 transition-all"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={creating}
              className="rounded-2xl bg-blue-600 px-6 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              Publicar solicitação
            </button>
          </div>
        </motion.form>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-black text-white tracking-tight">Solicitações publicadas</h2>
          <span className="rounded-full bg-white/5 border border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            {requests.length} registro(s)
          </span>
        </div>

        {loading ? (
          <div className="min-h-[360px] rounded-[3rem] border border-white/10 bg-slate-900/60 flex flex-col items-center justify-center text-center">
            <Loader2 className="animate-spin text-blue-400 mb-4" size={40} />
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Carregando solicitações...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="min-h-[360px] rounded-[3rem] border border-dashed border-white/10 bg-slate-900/40 flex flex-col items-center justify-center text-center p-10">
            <MessageCircle className="text-slate-600 mb-4" size={48} />
            <h3 className="text-xl font-black text-white mb-2">Nenhuma solicitação publicada</h3>
            <p className="max-w-md text-sm text-slate-400 font-medium">
              Crie uma solicitação para que fisioterapeutas Pro possam demonstrar interesse dentro da plataforma.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {requests.map((item, index) => (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-5 shadow-xl"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={cn(
                        "rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest border",
                        item.status === 'aberta'
                          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                          : item.status === 'cancelada'
                            ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                            : "bg-blue-500/10 text-blue-300 border-blue-500/20"
                      )}>
                        {statusLabel[item.status]}
                      </span>

                      <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-300">
                        {serviceLabel[item.tipo_atendimento]}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-white tracking-tight line-clamp-2">
                      {item.titulo || 'Solicitação de atendimento'}
                    </h3>
                  </div>

                  <div className="h-11 w-11 rounded-2xl bg-white/5 flex items-center justify-center text-blue-300 border border-white/10 shrink-0">
                    {item.visivel_para_profissionais ? <Eye size={20} /> : <EyeOff size={20} />}
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
                        {item.preferencia_horario || formatDateTime(item.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-blue-500/10 border border-blue-500/20 p-3">
                    <p className="text-xs font-bold text-blue-200">
                      {item.visivel_para_profissionais
                        ? 'Visível para fisioterapeutas Pro.'
                        : 'Oculta para fisioterapeutas. Você pode criar outra solicitação visível quando quiser.'}
                    </p>
                  </div>
                </div>

                {item.status === 'aberta' && (
                  <div className="mt-5 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'cancelada')}
                      disabled={updatingId === item.id}
                      className="flex-1 rounded-2xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-xs font-black uppercase tracking-widest text-rose-300 hover:bg-rose-500/15 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {updatingId === item.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                      Cancelar
                    </button>

                    <a
                      href="/chat"
                      className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                    >
                      <MessageCircle size={16} />
                      Ver conversas
                    </a>
                  </div>
                )}
              </motion.article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
