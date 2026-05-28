import { useEffect, useMemo, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar, User, MessageCircle, Eye, MousePointerClick } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { FisioStory, StoryGroup, storiesService, getStoryAvatar } from '../../services/storiesService';

type StoryViewerProps = {
  groups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
};

const getInitials = (name?: string | null) =>
  String(name || 'F').split(' ').filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'F';

const StoryMedia = ({ story }: { story: FisioStory }) => {
  if (story.media_type === 'video') {
    return <video src={story.media_url} controls autoPlay playsInline className="h-full w-full object-contain bg-black" />;
  }

  return <img src={story.media_url} alt={story.title || 'FisioStory'} className="h-full w-full object-contain bg-black" referrerPolicy="no-referrer" />;
};

export default function StoryViewer({ groups, initialGroupIndex, onClose }: StoryViewerProps) {
  const { user } = useAuth();
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);

  const group = groups[groupIndex];
  const story = group?.stories?.[storyIndex];

  useEffect(() => {
    if (!story?.id) return;
    void storiesService.trackView(story.id, user?.id);
  }, [story?.id, user?.id]);

  useEffect(() => {
    setStoryIndex(0);
  }, [groupIndex]);

  const canGoPrev = groupIndex > 0 || storyIndex > 0;
  const canGoNext = groupIndex < groups.length - 1 || storyIndex < (group?.stories?.length || 0) - 1;

  const goPrev = () => {
    if (storyIndex > 0) {
      setStoryIndex(prev => prev - 1);
      return;
    }
    if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      setGroupIndex(prev => prev - 1);
      setStoryIndex(Math.max((prevGroup?.stories?.length || 1) - 1, 0));
    }
  };

  const goNext = () => {
    if (!group) return;
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex(prev => prev + 1);
      return;
    }
    if (groupIndex < groups.length - 1) {
      setGroupIndex(prev => prev + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  };

  const avatar = useMemo(() => getStoryAvatar(group?.physio), [group?.physio]);

  const handleCta = async () => {
    if (!story) return;
    await storiesService.trackClick(story.id, user?.id);
  };

  if (!group || !story) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/95 p-3 backdrop-blur-xl">
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 20 }} className="relative h-[86vh] w-full max-w-[430px] overflow-hidden rounded-[2.5rem] border border-white/10 bg-black shadow-2xl shadow-blue-950/40">
          <div className="absolute left-0 right-0 top-0 z-20 space-y-3 bg-gradient-to-b from-black/80 to-transparent p-5">
            <div className="flex gap-1">
              {group.stories.map((item, index) => (
                <div key={item.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                  <div className={cn('h-full rounded-full bg-white', index <= storyIndex ? 'w-full' : 'w-0')} />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {avatar ? (
                <img src={avatar} alt={group.physio?.nome_completo || 'Fisioterapeuta'} className="h-11 w-11 rounded-full object-cover ring-2 ring-sky-400" />
              ) : (
                <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-violet-500 text-sm font-black text-white ring-2 ring-sky-400">
                  {getInitials(group.physio?.nome_completo)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-white">{group.physio?.nome_completo || 'Fisioterapeuta'}</p>
                <p className="truncate text-[11px] font-semibold text-white/60">{group.physio?.especialidade || 'FisioCareHub'}</p>
              </div>

              <button onClick={onClose} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
                <X size={20} />
              </button>
            </div>
          </div>

          <StoryMedia story={story} />

          <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 to-transparent p-5 pt-20">
            {story.title && <h3 className="text-xl font-black text-white">{story.title}</h3>}
            {story.caption && <p className="mt-2 text-sm font-semibold leading-relaxed text-white/80">{story.caption}</p>}

            <div className="mt-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/55">
              <Eye size={14} /> {Number(story.views_count || 0)} views
              <span className="mx-1 h-1 w-1 rounded-full bg-white/30" />
              <MousePointerClick size={14} /> {Number(story.clicks_count || 0)} cliques
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link to={`/physio/${story.physio_id}`} onClick={handleCta} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-white backdrop-blur-xl hover:bg-white/20">
                <User size={16} /> Perfil
              </Link>
              <Link to={story.cta_url || `/physio/${story.physio_id}`} onClick={handleCta} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-sky-950/30 hover:bg-sky-400">
                {story.cta_type === 'message' ? <MessageCircle size={16} /> : <Calendar size={16} />}
                {story.cta_label || 'Agendar'}
              </Link>
            </div>
          </div>

          {canGoPrev && <button onClick={goPrev} className="absolute left-2 top-1/2 z-30 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur-md hover:bg-white/20"><ChevronLeft size={22} /></button>}
          {canGoNext && <button onClick={goNext} className="absolute right-2 top-1/2 z-30 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur-md hover:bg-white/20"><ChevronRight size={22} /></button>}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
