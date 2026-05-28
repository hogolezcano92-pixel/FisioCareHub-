import { useEffect, useState } from 'react';
import { AlertTriangle, Ban, CheckCircle2, Eye, Loader2, MousePointerClick, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { FisioStory, storiesService } from '../../services/storiesService';

const formatDateTime = (value?: string | null) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export default function AdminStoriesModeration() {
  const [stories, setStories] = useState<FisioStory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStories = async () => {
    setLoading(true);
    try {
      const data = await storiesService.listAdminStories();
      setStories(data);
    } catch (error: any) {
      console.warn('[AdminStoriesModeration] Erro:', error);
      toast.error(error?.message || 'Erro ao carregar stories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadStories(); }, []);

  const updateStatus = async (storyId: string, status: FisioStory['status']) => {
    try {
      await storiesService.updateStoryStatus(storyId, status);
      setStories(current => current.map(story => story.id === storyId ? { ...story, status } : story));
      toast.success('Story atualizado.');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar story.');
    }
  };

  const deleteStory = async (storyId: string) => {
    if (!window.confirm('Excluir definitivamente este story?')) return;
    try {
      await storiesService.deleteStory(storyId);
      setStories(current => current.filter(story => story.id !== storyId));
      toast.success('Story excluído.');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao excluir story.');
    }
  };

  const stats = {
    total: stories.length,
    active: stories.filter(story => story.status === 'active').length,
    blocked: stories.filter(story => story.status === 'blocked').length,
    views: stories.reduce((sum, story) => sum + Number(story.views_count || 0), 0),
    clicks: stories.reduce((sum, story) => sum + Number(story.clicks_count || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-violet-200">
              <ShieldCheck size={13} /> Moderação
            </div>
            <h2 className="mt-3 text-3xl font-black text-white">FisioStories</h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">Controle stories publicados por fisioterapeutas, bloqueie conteúdo e acompanhe métricas.</p>
          </div>
          <button onClick={loadStories} className="rounded-2xl bg-sky-500 px-5 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-sky-400">Atualizar</button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          {[['Total', stats.total], ['Ativos', stats.active], ['Bloqueados', stats.blocked], ['Views', stats.views], ['Cliques', stats.clicks]].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-2xl font-black text-white">{value}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-5 text-sm font-bold text-slate-400"><Loader2 className="animate-spin text-sky-400" size={18} /> Carregando stories...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {stories.map((story) => (
            <article key={story.id} className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04]">
              <div className="grid grid-cols-1 md:grid-cols-[180px_1fr]">
                <div className="h-56 bg-black md:h-full">
                  {story.media_type === 'video' ? <video src={story.media_url} className="h-full w-full object-cover" muted playsInline controls /> : <img src={story.media_url} alt={story.title || 'Story'} className="h-full w-full object-cover" />}
                </div>
                <div className="space-y-4 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-black text-sky-300">{story.physio?.nome_completo || 'Fisioterapeuta'}</p>
                      <h3 className="text-xl font-black text-white">{story.title || 'Story sem título'}</h3>
                      <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-400">{story.caption || 'Sem legenda'}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${story.status === 'active' ? 'bg-emerald-500/10 text-emerald-300' : story.status === 'blocked' ? 'bg-rose-500/10 text-rose-300' : 'bg-amber-500/10 text-amber-300'}`}>{story.status}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-400 md:grid-cols-4">
                    <span className="inline-flex items-center gap-1"><Eye size={14} /> {story.views_count || 0} views</span>
                    <span className="inline-flex items-center gap-1"><MousePointerClick size={14} /> {story.clicks_count || 0} cliques</span>
                    <span>Criado: {formatDateTime(story.created_at)}</span>
                    <span>Expira: {formatDateTime(story.expires_at)}</span>
                  </div>

                  <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs font-semibold text-amber-100">
                    <AlertTriangle size={14} className="mr-1 inline" /> Verifique exposição indevida de pacientes, promessa de cura e conteúdo fora do foco profissional.
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => updateStatus(story.id, 'active')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-white"><CheckCircle2 size={14} /> Aprovar</button>
                    <button onClick={() => updateStatus(story.id, 'blocked')} className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-white"><Ban size={14} /> Bloquear</button>
                    <button onClick={() => deleteStory(story.id)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-white/10"><Trash2 size={14} /> Excluir</button>
                  </div>
                </div>
              </div>
            </article>
          ))}

          {stories.length === 0 && <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center text-sm font-semibold text-slate-400">Nenhum story publicado ainda.</div>}
        </div>
      )}
    </div>
  );
}
