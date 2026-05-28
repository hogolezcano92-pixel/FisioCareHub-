import { useEffect, useMemo, useState } from 'react';
import { Camera, Image as ImageIcon, Loader2, Plus, ShieldCheck, Sparkles, Trash2, Video, Eye, MousePointerClick } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { FisioStory, storiesService } from '../../services/storiesService';

type FormState = {
  title: string;
  caption: string;
  ctaLabel: string;
  ctaType: string;
  durationHours: number;
};

const initialForm: FormState = { title: '', caption: '', ctaLabel: 'Agendar avaliação', ctaType: 'booking', durationHours: 24 };

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Sem expiração';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data inválida';
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export default function PhysioStoriesManager({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [stories, setStories] = useState<FisioStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);

  const stats = useMemo(() => ({
    active: stories.filter(story => story.status === 'active' && (!story.expires_at || new Date(story.expires_at) > new Date())).length,
    views: stories.reduce((sum, story) => sum + Number(story.views_count || 0), 0),
    clicks: stories.reduce((sum, story) => sum + Number(story.clicks_count || 0), 0),
  }), [stories]);

  const loadStories = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await storiesService.listStoriesByPhysio(user.id, true);
      setStories(data);
    } catch (error) {
      console.warn('[PhysioStoriesManager] Erro ao carregar stories:', error);
      setStories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStories();
  }, [user?.id]);

  const publishStory = async () => {
    if (!user?.id) {
      toast.error('Sessão não encontrada.');
      return;
    }

    if (!file) {
      toast.error('Selecione uma imagem ou vídeo para o story.');
      return;
    }

    setPublishing(true);
    try {
      const uploaded = await storiesService.uploadStoryFile(file, user.id);
      const story = await storiesService.createStory({
        physioId: user.id,
        title: form.title,
        caption: form.caption,
        mediaUrl: uploaded.url,
        mediaType: uploaded.mediaType,
        ctaType: form.ctaType,
        ctaLabel: form.ctaLabel,
        ctaUrl: `/physio/${user.id}`,
        durationHours: form.durationHours,
      });

      setStories(current => [story, ...current]);
      setFile(null);
      setForm(initialForm);
      setShowForm(false);
      toast.success('Story publicado no FisioCareHub.');
      void loadStories();
    } catch (error: any) {
      console.error('[PhysioStoriesManager] Erro ao publicar story:', error);
      toast.error(error?.message || 'Erro ao publicar story.');
    } finally {
      setPublishing(false);
    }
  };

  const deleteStory = async (storyId: string) => {
    const confirmed = window.confirm('Remover este story?');
    if (!confirmed) return;

    try {
      await storiesService.deleteStory(storyId);
      setStories(current => current.filter(story => story.id !== storyId));
      toast.success('Story removido.');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao remover story.');
    }
  };

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-sky-950/10 backdrop-blur-xl">
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="relative z-10 space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-violet-200">
              <Sparkles size={13} /> FisioStories
            </div>
            <h3 className="mt-3 text-2xl font-black text-white">Publique stories para atrair pacientes</h3>
            <p className="mt-1 text-sm font-semibold text-slate-400">Compartilhe dicas, agenda disponível, bastidores profissionais e exercícios educativos.</p>
          </div>

          <button type="button" onClick={() => setShowForm(prev => !prev)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-sky-950/30 hover:bg-sky-400">
            <Plus size={17} /> Criar Story
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[{ label: 'Ativos', value: stats.active, icon: Camera }, { label: 'Views', value: stats.views, icon: Eye }, { label: 'Cliques', value: stats.clicks, icon: MousePointerClick }].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <stat.icon size={18} className="mb-2 text-sky-300" />
              <p className="text-2xl font-black text-white">{stat.value}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {showForm && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[1.5rem] border border-sky-400/20 bg-slate-950/60 p-5 space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input value={form.title} onChange={(event) => setForm(current => ({ ...current, title: event.target.value }))} placeholder="Título curto do story" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none focus:border-sky-400" />
              <input value={form.ctaLabel} onChange={(event) => setForm(current => ({ ...current, ctaLabel: event.target.value }))} placeholder="Botão: Agendar avaliação" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none focus:border-sky-400" />
            </div>
            <textarea value={form.caption} onChange={(event) => setForm(current => ({ ...current, caption: event.target.value }))} placeholder="Legenda, dica rápida ou agenda disponível..." rows={3} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none focus:border-sky-400" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <select value={form.ctaType} onChange={(event) => setForm(current => ({ ...current, ctaType: event.target.value }))} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none focus:border-sky-400">
                <option className="bg-slate-900" value="booking">Agendamento</option>
                <option className="bg-slate-900" value="profile">Perfil</option>
                <option className="bg-slate-900" value="message">Mensagem</option>
              </select>
              <select value={form.durationHours} onChange={(event) => setForm(current => ({ ...current, durationHours: Number(event.target.value) }))} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none focus:border-sky-400">
                <option className="bg-slate-900" value={24}>24 horas</option>
                <option className="bg-slate-900" value={72}>3 dias</option>
                <option className="bg-slate-900" value={168}>7 dias</option>
              </select>
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-3 text-sm font-black text-white hover:bg-white/10">
                {file?.type.startsWith('video/') ? <Video size={18} /> : <ImageIcon size={18} />}
                {file ? file.name.slice(0, 24) : 'Imagem ou vídeo'}
                <input type="file" accept="image/*,video/*" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} />
              </label>
            </div>

            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs font-semibold leading-relaxed text-amber-100">
              <ShieldCheck size={15} className="mr-1 inline" /> Não publique dados identificáveis de pacientes, promessas de cura ou imagens sem autorização.
            </div>

            <button type="button" onClick={publishStory} disabled={publishing} className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-sky-950/30 disabled:opacity-60">
              {publishing ? <Loader2 className="mx-auto animate-spin" size={18} /> : 'Publicar Story'}
            </button>
          </motion.div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-4 text-sm font-bold text-slate-400"><Loader2 className="animate-spin text-sky-400" size={18} /> Carregando seus stories...</div>
        ) : stories.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 text-sm font-semibold text-slate-400">Você ainda não publicou stories. Comece com uma dica rápida, bastidor do atendimento ou agenda disponível.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {stories.slice(0, compact ? 4 : 8).map((story) => (
              <article key={story.id} className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                <div className="h-20 w-16 overflow-hidden rounded-xl bg-black">
                  {story.media_type === 'video' ? <video src={story.media_url} className="h-full w-full object-cover" muted playsInline /> : <img src={story.media_url} alt={story.title || 'Story'} className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-white">{story.title || 'Story sem título'}</p>
                  <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-400">{story.caption || 'Sem legenda'}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <span>{story.status}</span><span>expira {formatDateTime(story.expires_at)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[11px] font-bold text-slate-400">
                    <span className="inline-flex items-center gap-1"><Eye size={13} /> {story.views_count || 0}</span>
                    <span className="inline-flex items-center gap-1"><MousePointerClick size={13} /> {story.clicks_count || 0}</span>
                  </div>
                </div>
                <button onClick={() => deleteStory(story.id)} className="self-start rounded-xl bg-white/5 p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"><Trash2 size={15} /></button>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
