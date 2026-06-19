import { useEffect, useState } from 'react';
import { Camera, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import StoryViewer from './StoryViewer';
import { StoryGroup, storiesService, getStoryAvatar } from '../../services/storiesService';

type StoryRailProps = {
  title?: string;
  subtitle?: string;
  physioId?: string;
  className?: string;
  compact?: boolean;
  ctaLabel?: string;
};

const getInitials = (name?: string | null) =>
  String(name || 'F').split(' ').filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'F';

const getFirstName = (name?: string | null) => {
  const [first, second] = String(name || 'Fisioterapeuta').split(' ').filter(Boolean);
  return second ? `${first} ${second[0]}.` : first || 'Fisio';
};

export default function StoryRail({
  title = 'Stories dos Especialistas',
  subtitle = 'Dicas, bastidores e agenda dos fisioterapeutas verificados',
  physioId,
  className = '',
  compact = false,
  ctaLabel = 'Ver todos',
}: StoryRailProps) {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      try {
        if (physioId) {
          const stories = await storiesService.listStoriesByPhysio(physioId);
          const physio = stories[0]?.physio || null;
          const nextGroups = stories.length > 0 && physio ? [{ physio_id: physioId, physio, stories }] : [];
          if (alive) setGroups(nextGroups);
        } else {
          const nextGroups = await storiesService.listActiveStories(40);
          if (alive) setGroups(nextGroups);
        }
      } catch (error) {
        console.warn('[StoryRail] Não foi possível carregar stories:', error);
        if (alive) setGroups([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    void load();
    return () => { alive = false; };
  }, [physioId]);

  if (!loading && groups.length === 0) return null;

  return (
    <section
      className={`story-rail-premium relative overflow-hidden border backdrop-blur-2xl transition-colors ${
        compact
          ? 'rounded-[1.65rem] border-slate-200/80 bg-white/85 p-3.5 shadow-xl shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.055] dark:shadow-sky-950/20'
          : 'rounded-[2rem] border-slate-200/80 bg-white/90 p-4 shadow-2xl shadow-sky-100/70 dark:border-white/10 dark:bg-white/[0.055] dark:shadow-sky-950/20'
      } ${className}`}
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-48 w-48 rounded-full bg-sky-300/30 blur-3xl dark:bg-sky-500/10" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-44 w-44 rounded-full bg-violet-300/25 blur-3xl dark:bg-violet-500/10" />

      <div className={`${compact ? 'mb-3' : 'mb-4'} relative z-10 flex items-center justify-between gap-3`}>
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-violet-700 shadow-inner shadow-violet-100 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-300 sm:text-[10px]">
            <Sparkles size={13} className="text-sky-500 dark:text-sky-300" />
            <span className="truncate">{title}</span>
          </div>
          {!compact && <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {!physioId && !loading && groups.length > 0 && (
          <button
            type="button"
            onClick={() => setViewerIndex(0)}
            className="hidden shrink-0 items-center gap-1 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-widest text-violet-700 transition-all hover:bg-violet-50 dark:text-sky-300 dark:hover:bg-white/5 sm:inline-flex"
          >
            {ctaLabel}
            <ChevronRight size={13} />
          </button>
        )}
      </div>

      {loading ? (
        <div className={`${compact ? 'p-3 text-xs' : 'p-4 text-sm'} relative z-10 flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 font-bold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400`}>
          <Loader2 className="animate-spin text-sky-500" size={18} /> Carregando stories...
        </div>
      ) : (
        <div className={`${compact ? 'gap-3 pb-1' : 'gap-4 pb-2'} relative z-10 flex overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
          {groups.map((group, index) => {
            const avatar = getStoryAvatar(group.physio);
            const storyCount = group.stories.length;
            const label = index === 0 ? 'AO VIVO' : index === 1 ? 'NOVO' : null;

            return (
              <button
                key={group.physio_id}
                type="button"
                onClick={() => setViewerIndex(index)}
                className={`${compact ? 'min-w-[72px]' : 'min-w-[92px]'} group flex flex-col items-center gap-2 rounded-2xl outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-sky-400`}
              >
                <div className="relative rounded-full bg-gradient-to-tr from-fuchsia-500 via-violet-500 to-cyan-400 p-[3px] shadow-lg shadow-violet-200/70 dark:shadow-sky-950/40">
                  <div className={`${compact ? 'h-14 w-14 ring-2' : 'h-16 w-16 ring-[3px]'} grid place-items-center overflow-hidden rounded-full bg-white ring-white dark:bg-slate-950 dark:ring-slate-950`}>
                    {avatar ? (
                      <img src={avatar} alt={group.physio?.nome_completo || 'Fisioterapeuta'} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-sm font-black text-slate-700 dark:text-white">{getInitials(group.physio?.nome_completo)}</span>
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-blue-500 text-white shadow-md dark:border-slate-950">
                    <Sparkles size={10} fill="currentColor" />
                  </span>
                  {label && (
                    <span className={`absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[7px] font-black uppercase tracking-widest text-white shadow-lg ${label === 'AO VIVO' ? 'bg-pink-500' : 'bg-teal-500'}`}>
                      {label}
                    </span>
                  )}
                </div>
                <div className={`${label ? 'pt-1.5' : ''} max-w-full text-center`}>
                  <span className={`${compact ? 'max-w-[76px] text-[10px]' : 'max-w-[92px] text-[11px]'} block truncate font-black leading-tight text-slate-900 transition-colors group-hover:text-violet-700 dark:text-white dark:group-hover:text-sky-300`}>
                    {getFirstName(group.physio?.nome_completo)}
                  </span>
                  <span className={`${compact ? 'text-[8px]' : 'text-[9px]'} mt-0.5 inline-flex items-center justify-center gap-1 font-black uppercase tracking-widest text-slate-400 dark:text-slate-500`}>
                    <Camera size={compact ? 9 : 10} /> {storyCount}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {viewerIndex !== null && groups[viewerIndex] && (
        <StoryViewer groups={groups} initialGroupIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
      )}
    </section>
  );
}
