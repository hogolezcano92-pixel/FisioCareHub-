import { useEffect, useState } from 'react';
import { Camera, Loader2, Sparkles } from 'lucide-react';
import StoryViewer from './StoryViewer';
import { StoryGroup, storiesService, getStoryAvatar } from '../../services/storiesService';

type StoryRailProps = {
  title?: string;
  subtitle?: string;
  physioId?: string;
  className?: string;
  compact?: boolean;
};

const getInitials = (name?: string | null) =>
  String(name || 'F').split(' ').filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'F';

export default function StoryRail({ title = 'FisioStories', subtitle = 'Dicas, bastidores e agenda dos fisioterapeutas', physioId, className = '', compact = false }: StoryRailProps) {
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
    <section className={`relative overflow-hidden border backdrop-blur-xl ${compact ? 'rounded-[1.5rem] border-white/5 bg-slate-950/25 p-3 shadow-none' : 'rounded-[2rem] border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-sky-950/10'} ${className}`}>
      <div className="absolute -right-20 -top-20 h-44 w-44 rounded-full bg-sky-500/10 blur-3xl" />
      <div className={`${compact ? 'mb-3' : 'mb-4'} flex items-center justify-between gap-3`}>
        <div>
          <div className={`inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 ${compact ? 'px-2.5 py-1 text-[9px]' : 'px-3 py-1 text-[10px]'} font-black uppercase tracking-[0.22em] text-sky-300`}>
            <Sparkles size={13} /> {title}
          </div>
          {!compact && <p className="mt-2 text-sm font-semibold text-slate-400">{subtitle}</p>}
        </div>
      </div>

      {loading ? (
        <div className={`${compact ? 'p-3 text-xs' : 'p-4 text-sm'} flex items-center gap-3 rounded-2xl bg-white/5 font-bold text-slate-400`}>
          <Loader2 className="animate-spin text-sky-400" size={18} /> Carregando stories...
        </div>
      ) : (
        <div className={`${compact ? 'gap-3 pb-1' : 'gap-4 pb-2'} flex overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
          {groups.map((group, index) => {
            const avatar = getStoryAvatar(group.physio);
            return (
              <button key={group.physio_id} onClick={() => setViewerIndex(index)} className={`${compact ? 'min-w-[66px]' : 'min-w-[86px]'} group flex flex-col items-center gap-2`}>
                <div className="rounded-full bg-gradient-to-tr from-orange-400 via-pink-500 to-fuchsia-600 p-[4px] shadow-lg shadow-sky-950/30">
                  <div className={`${compact ? 'h-12 w-12 ring-2' : 'h-16 w-16 ring-4'} grid place-items-center overflow-hidden rounded-full bg-slate-950 ring-slate-950`}>
                    {avatar ? <img src={avatar} alt={group.physio?.nome_completo || 'Fisioterapeuta'} className="h-full w-full object-cover" /> : <span className="text-sm font-black text-white">{getInitials(group.physio?.nome_completo)}</span>}
                  </div>
                </div>
                <span className={`${compact ? 'max-w-[70px] text-[10px]' : 'max-w-[86px] text-[11px]'} line-clamp-2 text-center font-black leading-tight text-white group-hover:text-sky-300`}>{group.physio?.nome_completo || 'Fisioterapeuta'}</span>
                <span className={`${compact ? 'text-[8px]' : 'text-[9px]'} inline-flex items-center gap-1 font-black uppercase tracking-widest text-slate-500`}><Camera size={compact ? 9 : 10} /> {group.stories.length}</span>
              </button>
            );
          })}
        </div>
      )}

      {viewerIndex !== null && <StoryViewer groups={groups} initialGroupIndex={viewerIndex} onClose={() => setViewerIndex(null)} />}
    </section>
  );
}
