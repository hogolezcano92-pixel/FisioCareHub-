import { useEffect, useMemo, useState } from 'react';
import { Megaphone, Send, Users, Mail, Bell, Loader2, CheckCircle2, AlertCircle, History, Sparkles, Copy, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

type Audience = 'todos' | 'fisioterapeutas' | 'pacientes' | 'pro' | 'free';

type Template = {
  id: string;
  category: string;
  theme: string;
  title: string;
  subject: string;
  message: string;
  cta: string;
  tone: 'cyan' | 'violet';
  audiences: Audience[];
};

const audienceLabels: Record<Audience, string> = {
  todos: 'Todos os usuários',
  fisioterapeutas: 'Fisioterapeutas',
  pacientes: 'Pacientes',
  pro: 'Usuários PRO',
  free: 'Usuários gratuitos',
};

const APP_URL = 'https://fisiocarehub.company';

const templates: Template[] = [
  {
    id: 'comunidade', category: 'Relacionamento', theme: 'Comunidade e indicação',
    title: 'Fortaleça a fisioterapia compartilhando o FisioCareHub',
    subject: 'Fortaleça a fisioterapia compartilhando o FisioCareHub',
    message: 'Olá, {{nome}},\n\nBoas ferramentas ficam ainda melhores quando compartilhadas. Se você conhece colegas fisioterapeutas ou pacientes de reabilitação funcional que precisam de uma rotina de cuidados mais organizada, apresente o FisioCareHub.\n\nAjude a construir uma comunidade de saúde mais conectada, facilitando o acompanhamento diário de quem mais precisa.',
    cta: 'Indicar o FisioCareHub', tone: 'cyan', audiences: ['todos', 'fisioterapeutas', 'pacientes'],
  },
  {
    id: 'pro-trial', category: 'Conversão', theme: 'Trial de 60 dias',
    title: 'Experimente todo o potencial do FisioCareHub',
    subject: 'Seu acesso ao FisioCareHub pode ir muito mais longe 🚀',
    message: 'Olá, {{nome}},\n\nO FisioCareHub foi criado para deixar sua rotina mais simples, organizada e profissional.\n\nEscolha qualquer plano para ativar seu período de teste de 60 dias e explore as funcionalidades PRO antes de decidir qual experiência combina melhor com sua rotina.',
    cta: 'Ativar meu trial de 60 dias', tone: 'violet', audiences: ['free'],
  },
  {
    id: 'reativacao', category: 'Engajamento', theme: 'Reativação',
    title: 'Volte a aproveitar o FisioCareHub',
    subject: '{{nome}}, sua rotina pode ficar mais simples',
    message: 'Olá, {{nome}},\n\nSentimos sua falta no FisioCareHub. Sua plataforma continua pronta para ajudar na organização dos atendimentos, pacientes, agenda e rotina profissional.\n\nVolte quando quiser e retome de onde parou.',
    cta: 'Voltar ao FisioCareHub', tone: 'cyan', audiences: ['todos', 'fisioterapeutas', 'pacientes', 'free', 'pro'],
  },
  {
    id: 'funcionalidade', category: 'Produto', theme: 'Descoberta de recursos',
    title: 'Descubra uma funcionalidade do FisioCareHub',
    subject: 'Uma ferramenta do FisioCareHub que pode facilitar seu dia',
    message: 'Olá, {{nome}},\n\nVocê já explorou todos os recursos disponíveis no FisioCareHub? A plataforma reúne ferramentas para tornar sua rotina de fisioterapia mais organizada e conectada.\n\nAcesse agora e descubra uma funcionalidade que pode fazer diferença no seu atendimento.',
    cta: 'Explorar o FisioCareHub', tone: 'cyan', audiences: ['todos', 'fisioterapeutas', 'pacientes', 'free', 'pro'],
  },
  {
    id: 'agenda', category: 'Produto', theme: 'Agenda e organização',
    title: 'Organize sua agenda e seus atendimentos',
    subject: 'Mais organização para sua rotina profissional 📅',
    message: 'Olá, {{nome}},\n\nUma rotina organizada começa por uma agenda bem estruturada. Use o FisioCareHub para centralizar seus atendimentos e acompanhar sua rotina com mais praticidade.\n\nMenos tempo procurando informações. Mais tempo dedicado aos seus pacientes.',
    cta: 'Organizar minha rotina', tone: 'cyan', audiences: ['fisioterapeutas'],
  },
  {
    id: 'paciente', category: 'Relacionamento', theme: 'Paciente e cuidador',
    title: 'Facilite o acompanhamento dos seus pacientes',
    subject: 'Facilite o acompanhamento dos seus pacientes',
    message: 'Olá, {{nome}},\n\nO sucesso da fisioterapia contínua depende do engajamento de todos. Use o FisioCareHub para aproximar profissionais, pacientes e cuidadores e tornar o acompanhamento mais organizado.\n\nUma comunicação clara ajuda a manter o cuidado conectado à rotina do paciente.',
    cta: 'Acessar o FisioCareHub', tone: 'cyan', audiences: ['fisioterapeutas'],
  },
  {
    id: 'boas-vindas', category: 'Relacionamento', theme: 'Boas-vindas',
    title: 'Boas-vindas ao FisioCareHub',
    subject: 'Bem-vindo ao FisioCareHub, {{nome}}! 👋',
    message: 'Olá, {{nome}},\n\nÉ um prazer ter você no FisioCareHub. Aproveite sua experiência na plataforma, conheça os recursos disponíveis e organize sua rotina de fisioterapia em um só lugar.\n\nSe você gostar da experiência, compartilhe o FisioCareHub com outros profissionais ou pacientes que também possam se beneficiar.',
    cta: 'Conhecer minha plataforma', tone: 'violet', audiences: ['todos', 'fisioterapeutas', 'pacientes'],
  },
  {
    id: 'pro-recursos', category: 'Conversão', theme: 'Recursos PRO',
    title: 'Leve sua rotina profissional para outro nível',
    subject: 'Mais recursos para uma rotina profissional mais completa 💎',
    message: 'Olá, {{nome}},\n\nOs recursos PRO foram pensados para quem quer aproveitar uma experiência mais completa no FisioCareHub, com ferramentas que ajudam a centralizar e organizar a rotina profissional.\n\nExplore os recursos disponíveis e veja como eles podem se encaixar no seu dia a dia.',
    cta: 'Conhecer os recursos PRO', tone: 'violet', audiences: ['free'],
  },
];

export default function AdminMarketing() {
  const [templateId, setTemplateId] = useState(templates[0].id);
  const [title, setTitle] = useState(templates[0].title);
  const [subject, setSubject] = useState(templates[0].subject);
  const [message, setMessage] = useState(templates[0].message);
  const [cta, setCta] = useState(templates[0].cta);
  const [link, setLink] = useState(APP_URL);
  const [audience, setAudience] = useState<Audience>('fisioterapeutas');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendInApp, setSendInApp] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [preview, setPreview] = useState(false);

  const selectedTemplate = useMemo(() => templates.find(t => t.id === templateId) || templates[0], [templateId]);

  const loadCampaigns = async () => {
    const { data } = await supabase
      .from('marketing_campaigns')
      .select('id,title,subject,target_audience,status,total_recipients,sent_count,failed_count,created_at,sent_at')
      .order('created_at', { ascending: false })
      .limit(12);
    setCampaigns(data || []);
  };

  useEffect(() => { loadCampaigns(); }, []);

  const applyTemplate = (id: string) => {
    const t = templates.find(item => item.id === id) || templates[0];
    setTemplateId(t.id); setTitle(t.title); setSubject(t.subject); setMessage(t.message); setCta(t.cta); setLink(APP_URL);
    if (!t.audiences.includes(audience)) setAudience(t.audiences[0]);
    setResult(null);
  };

  const handleSend = async () => {
    if (!title.trim() || !subject.trim() || !message.trim()) {
      setResult({ ok: false, error: 'Preencha título, assunto e mensagem.' }); return;
    }
    if (!sendEmail && !sendInApp) {
      setResult({ ok: false, error: 'Selecione pelo menos um canal de envio.' }); return;
    }
    if (!window.confirm(`Enviar esta campanha para: ${audienceLabels[audience]}?\n\nO envio será realizado imediatamente.`)) return;
    setSending(true); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('admin-marketing', {
        body: { title, subject, message, link: link.trim() || null, ctaLabel: cta.trim() || 'Acessar FisioCareHub', targetAudience: audience, sendEmail, sendInApp },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Não foi possível enviar a campanha.');
      setResult({ ok: true, ...data });
      await loadCampaigns();
    } catch (error: any) {
      console.error('Erro ao enviar campanha de marketing:', error);
      setResult({ ok: false, error: error?.message || 'Erro ao enviar campanha.' });
    } finally { setSending(false); }
  };

  const previewMessage = message.replace(/\{\{nome\}\}/g, 'Mariana');

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/15 text-violet-300 flex items-center justify-center"><Megaphone size={24} /></div>
          <div><h2 className="text-3xl font-black text-white">Marketing</h2><p className="text-sm text-white/50">Crie campanhas prontas, personalizadas e com CTA para aumentar o engajamento do FisioCareHub.</p></div>
        </div>
      </div>

      <div className="rounded-[28px] border border-cyan-400/15 bg-[#071525] p-5 lg:p-6">
        <div className="flex items-center gap-3 mb-5"><Sparkles size={18} className="text-cyan-300" /><div><h3 className="font-black text-white">Modelos inteligentes</h3><p className="text-xs text-white/45">Escolha a categoria e o tema. Título, assunto, texto e CTA já vêm preparados.</p></div></div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {templates.map(t => <button key={t.id} type="button" onClick={() => applyTemplate(t.id)} className={cn('text-left rounded-2xl border p-4 transition-all', templateId === t.id ? 'border-cyan-300/50 bg-cyan-400/10' : 'border-white/10 bg-white/[0.03] hover:border-white/20')}><p className="text-[9px] font-black uppercase tracking-widest text-cyan-300/80">{t.category}</p><p className="mt-1 text-xs font-black text-white">{t.theme}</p><p className="mt-2 text-[11px] leading-4 text-white/45 line-clamp-2">{t.title}</p></button>)}
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.25fr_.75fr] gap-6">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 lg:p-8 space-y-6">
          <div className="grid md:grid-cols-2 gap-5">
            <label className="space-y-2"><span className="text-[10px] font-black uppercase tracking-widest text-white/45">Categoria / tema</span><select value={templateId} onChange={e => applyTemplate(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white outline-none focus:border-violet-400">{templates.map(t => <option key={t.id} value={t.id}>{t.category} · {t.theme}</option>)}</select></label>
            <label className="space-y-2"><span className="text-[10px] font-black uppercase tracking-widest text-white/45">CTA do botão</span><input value={cta} onChange={e => setCta(e.target.value)} placeholder="Ex.: Conhecer o FisioCareHub" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-violet-400" /></label>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <label className="space-y-2"><span className="text-[10px] font-black uppercase tracking-widest text-white/45">Título interno</span><input value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-violet-400" /></label>
            <label className="space-y-2"><span className="text-[10px] font-black uppercase tracking-widest text-white/45">Assunto do e-mail</span><input value={subject} onChange={e => setSubject(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-violet-400" /></label>
          </div>
          <label className="space-y-2 block"><span className="text-[10px] font-black uppercase tracking-widest text-white/45">Mensagem</span><textarea value={message} onChange={e => setMessage(e.target.value)} rows={9} className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-white outline-none focus:border-violet-400" /><span className="text-[10px] text-white/35">Use <strong className="text-cyan-300">{'{{nome}}'}</strong> para personalizar automaticamente a saudação.</span></label>
          <label className="space-y-2 block"><span className="text-[10px] font-black uppercase tracking-widest text-white/45">Link do CTA</span><input value={link} onChange={e => setLink(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-violet-400" /></label>

          <div className="grid md:grid-cols-2 gap-5">
            <div><span className="text-[10px] font-black uppercase tracking-widest text-white/45">Público</span><div className="mt-2 grid grid-cols-2 gap-2">{(Object.keys(audienceLabels) as Audience[]).map(item => <button key={item} type="button" onClick={() => setAudience(item)} className={cn('rounded-xl border px-3 py-2.5 text-xs font-bold transition-all', audience === item ? 'border-violet-400 bg-violet-500/15 text-violet-200' : 'border-white/10 bg-white/5 text-white/55 hover:text-white')}>{audienceLabels[item]}</button>)}</div></div>
            <div><span className="text-[10px] font-black uppercase tracking-widest text-white/45">Canais</span><div className="mt-2 space-y-2"><button type="button" onClick={() => setSendInApp(v => !v)} className={cn('w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-xs font-bold', sendInApp ? 'border-blue-400/40 bg-blue-500/10 text-blue-200' : 'border-white/10 bg-white/5 text-white/45')}><Bell size={17} /> Notificação dentro do app{sendInApp && <CheckCircle2 className="ml-auto" size={16} />}</button><button type="button" onClick={() => setSendEmail(v => !v)} className={cn('w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-xs font-bold', sendEmail ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/5 text-white/45')}><Mail size={17} /> E-mail{sendEmail && <CheckCircle2 className="ml-auto" size={16} />}</button></div></div>
          </div>

          {result && <div className={cn('rounded-2xl border p-4 text-sm', result.ok ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200' : 'border-rose-400/20 bg-rose-500/10 text-rose-200')}><div className="flex items-start gap-3">{result.ok ? <CheckCircle2 size={19} /> : <AlertCircle size={19} />}<div><p className="font-bold">{result.ok ? 'Campanha enviada!' : 'Não foi possível enviar.'}</p><p className="mt-1 opacity-80">{result.ok ? `${result.sentCount} envios realizados · ${result.failedCount} falhas · público: ${result.audienceCount}` : result.error}</p></div></div></div>}

          <div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => setPreview(v => !v)} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-black text-white flex items-center justify-center gap-2"><Eye size={18} /> {preview ? 'Fechar prévia' : 'Visualizar e-mail'}</button><button type="button" disabled={sending} onClick={handleSend} className="rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-4 text-sm font-black text-white shadow-xl shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-3">{sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}{sending ? 'Enviando...' : 'Enviar campanha agora'}</button></div>

          {preview && <div className="rounded-3xl overflow-hidden border border-white/10 bg-[#071525] shadow-2xl"><div className="px-6 py-5 bg-[#06101f] border-b border-white/10"><div className="text-xl font-black text-white">Fisio<span className="text-cyan-300">CareHub</span></div></div><div className="p-6"><h4 className="text-lg font-black text-white">{subject.replace(/\{\{nome\}\}/g, 'Mariana')}</h4><div className="mt-5 text-sm leading-6 text-white/65 whitespace-pre-line">{previewMessage}</div><button type="button" className={cn('mt-6 rounded-xl px-5 py-3 text-sm font-black text-white', selectedTemplate.tone === 'violet' ? 'bg-violet-600' : 'bg-cyan-600')}>{cta || 'Acessar FisioCareHub'}</button></div></div>}
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6"><div className="flex items-center gap-3 mb-5"><Users size={18} className="text-blue-300" /><div><h3 className="font-black text-white">Estratégia automática</h3><p className="text-xs text-white/45">Modelos prontos para cada objetivo.</p></div></div><div className="space-y-3 text-xs leading-5 text-white/65"><p><strong className="text-white">🎯 Conversão:</strong> trial de 60 dias e recursos PRO para usuários gratuitos.</p><p><strong className="text-white">🤝 Comunidade:</strong> indicação e compartilhamento sem texto genérico.</p><p><strong className="text-white">💬 Relacionamento:</strong> boas-vindas, paciente/cuidador e comunicação contínua.</p><p><strong className="text-white">🔄 Reativação:</strong> mensagens específicas para trazer usuários de volta.</p><p><strong className="text-white">📌 Personalização:</strong> nome, assunto e CTA são substituíveis antes do envio.</p></div></div>
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6"><div className="flex items-center gap-3 mb-5"><History size={18} className="text-violet-300" /><h3 className="font-black text-white">Últimas campanhas</h3></div><div className="space-y-3">{campaigns.length === 0 && <p className="text-xs text-white/40">Nenhuma campanha enviada ainda.</p>}{campaigns.map(c => <div key={c.id} className="rounded-2xl border border-white/5 bg-black/10 p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-bold text-white">{c.title}</p><span className="text-[9px] font-black uppercase tracking-widest text-white/40">{c.status}</span></div><p className="mt-1 text-[11px] text-white/45">{audienceLabels[c.target_audience as Audience] || c.target_audience}</p><p className="mt-2 text-[11px] text-white/50">{c.sent_count} enviados · {c.failed_count} falhas</p></div>)}</div></div>
        </div>
      </div>
    </div>
  );
}
