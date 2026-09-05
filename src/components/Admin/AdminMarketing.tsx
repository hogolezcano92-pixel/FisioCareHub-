import { useEffect, useState } from 'react';
import { Megaphone, Send, Users, Mail, Bell, Loader2, CheckCircle2, AlertCircle, History, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

type Audience = 'todos' | 'fisioterapeutas' | 'pacientes' | 'pro' | 'free';

const audienceLabels: Record<Audience, string> = {
  todos: 'Todos os usuários',
  fisioterapeutas: 'Fisioterapeutas',
  pacientes: 'Pacientes',
  pro: 'Usuários PRO',
  free: 'Usuários gratuitos',
};

export default function AdminMarketing() {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('https://fisiocarehub.company');
  const [audience, setAudience] = useState<Audience>('fisioterapeutas');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendInApp, setSendInApp] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  const loadCampaigns = async () => {
    const { data } = await supabase
      .from('marketing_campaigns')
      .select('id,title,subject,target_audience,status,total_recipients,sent_count,failed_count,created_at,sent_at')
      .order('created_at', { ascending: false })
      .limit(12);
    setCampaigns(data || []);
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !subject.trim() || !message.trim()) {
      setResult({ ok: false, error: 'Preencha título, assunto e mensagem.' });
      return;
    }
    if (!sendEmail && !sendInApp) {
      setResult({ ok: false, error: 'Selecione pelo menos um canal de envio.' });
      return;
    }

    if (!window.confirm(`Enviar esta campanha para: ${audienceLabels[audience]}?\n\nO envio será realizado imediatamente.`)) return;

    setSending(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('admin-marketing', {
        body: {
          title,
          subject,
          message,
          link: link.trim() || null,
          targetAudience: audience,
          sendEmail,
          sendInApp,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Não foi possível enviar a campanha.');

      setResult({ ok: true, ...data });
      setTitle('');
      setSubject('');
      setMessage('');
      await loadCampaigns();
    } catch (error: any) {
      console.error('Erro ao enviar campanha de marketing:', error);
      setResult({ ok: false, error: error?.message || 'Erro ao enviar campanha.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/15 text-violet-300 flex items-center justify-center">
            <Megaphone size={24} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white">Marketing</h2>
            <p className="text-sm text-white/50">Envie campanhas para estimular o uso e as indicações do FisioCareHub.</p>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.25fr_.75fr] gap-6">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 lg:p-8 space-y-6">
          <div className="grid md:grid-cols-2 gap-5">
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/45">Título interno</span>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Volte a usar o FisioCareHub" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-violet-400" />
            </label>
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/45">Assunto do e-mail</span>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex.: 🚀 Aproveite o FisioCareHub" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-violet-400" />
            </label>
          </div>

          <label className="space-y-2 block">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/45">Mensagem</span>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={9} placeholder="Escreva uma mensagem curta, motivadora e com uma chamada para ação..." className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-white outline-none focus:border-violet-400" />
          </label>

          <label className="space-y-2 block">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/45">Link do botão (opcional)</span>
            <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://fisiocarehub.company" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-violet-400" />
          </label>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/45">Público</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(Object.keys(audienceLabels) as Audience[]).map(item => (
                  <button key={item} type="button" onClick={() => setAudience(item)} className={cn('rounded-xl border px-3 py-2.5 text-xs font-bold transition-all', audience === item ? 'border-violet-400 bg-violet-500/15 text-violet-200' : 'border-white/10 bg-white/5 text-white/55 hover:text-white')}>
                    {audienceLabels[item]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/45">Canais</span>
              <div className="mt-2 space-y-2">
                <button type="button" onClick={() => setSendInApp(v => !v)} className={cn('w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-xs font-bold', sendInApp ? 'border-blue-400/40 bg-blue-500/10 text-blue-200' : 'border-white/10 bg-white/5 text-white/45')}>
                  <Bell size={17} /> Notificação dentro do app
                  {sendInApp && <CheckCircle2 className="ml-auto" size={16} />}
                </button>
                <button type="button" onClick={() => setSendEmail(v => !v)} className={cn('w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-xs font-bold', sendEmail ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/5 text-white/45')}>
                  <Mail size={17} /> E-mail
                  {sendEmail && <CheckCircle2 className="ml-auto" size={16} />}
                </button>
              </div>
            </div>
          </div>

          {result && (
            <div className={cn('rounded-2xl border p-4 text-sm', result.ok ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200' : 'border-rose-400/20 bg-rose-500/10 text-rose-200')}>
              <div className="flex items-start gap-3">
                {result.ok ? <CheckCircle2 size={19} /> : <AlertCircle size={19} />}
                <div>
                  <p className="font-bold">{result.ok ? 'Campanha enviada!' : 'Não foi possível enviar.'}</p>
                  <p className="mt-1 opacity-80">
                    {result.ok
                      ? `${result.sentCount} envios realizados · ${result.failedCount} falhas · público: ${result.audienceCount}`
                      : result.error}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button type="button" disabled={sending} onClick={handleSend} className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-4 text-sm font-black text-white shadow-xl shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-3">
            {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            {sending ? 'Enviando campanha...' : 'Enviar campanha agora'}
          </button>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
            <div className="flex items-center gap-3 mb-5">
              <Users size={18} className="text-blue-300" />
              <div>
                <h3 className="font-black text-white">Estratégia recomendada</h3>
                <p className="text-xs text-white/45">Mensagens curtas + ação clara.</p>
              </div>
            </div>
            <div className="space-y-3 text-xs leading-5 text-white/65">
              <p><strong className="text-white">🚀 Engajamento:</strong> incentive o profissional a abrir o app e experimentar uma funcionalidade.</p>
              <p><strong className="text-white">🤝 Indicação:</strong> peça para indicar o FisioCareHub a outros fisioterapeutas e pacientes.</p>
              <p><strong className="text-white">💎 PRO:</strong> destaque recursos Premium e o trial de 60 dias.</p>
              <p><strong className="text-white">👋 Reativação:</strong> envie uma mensagem personalizada para quem parou de usar.</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
            <div className="flex items-center gap-3 mb-5">
              <History size={18} className="text-violet-300" />
              <h3 className="font-black text-white">Últimas campanhas</h3>
            </div>
            <div className="space-y-3">
              {campaigns.length === 0 && <p className="text-xs text-white/40">Nenhuma campanha enviada ainda.</p>}
              {campaigns.map(c => (
                <div key={c.id} className="rounded-2xl border border-white/5 bg-black/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-bold text-white">{c.title}</p>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">{c.status}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-white/45">{audienceLabels[c.target_audience as Audience] || c.target_audience}</p>
                  <p className="mt-2 text-[11px] text-white/50">{c.sent_count} enviados · {c.failed_count} falhas</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
