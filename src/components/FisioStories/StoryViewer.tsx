import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, User, MessageCircle, Eye, MousePointerClick } from 'lucide-react';
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

const STORY_DURATION_MS = 7000;

const getInitials = (name?: string | null) =>
  String(name || 'F')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'F';

const isClient = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const StoryMedia = ({ story, onEnded }: { story: FisioStory; onEnded: () => void }) => {
  if (story.media_type === 'video') {
    return (
      <video
        key={story.id}
        src={story.media_url}
        controls={false}
        autoPlay
        playsInline
        muted={false}
        onEnded={onEnded}
        className="h-full w-full object-contain bg-black"
      />
    );
  }

  return (
    <img
      key={story.id}
      src={story.media_url}
      alt={story.title || 'FisioStory'}
      className="h-full w-full object-contain bg-black"
      referrerPolicy="no-referrer"
    />
  );
};

export default function StoryViewer({ groups, initialGroupIndex, onClose }: StoryViewerProps) {
  const { user } = useAuth();
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const group = groups[groupIndex];
  const story = group?.stories?.[storyIndex];

  const canGoPrev = groupIndex > 0 || storyIndex > 0;
  const canGoNext = groupIndex < groups.length - 1 || storyIndex < (group?.stories?.length || 0) - 1;

  const goPrev = useCallback(() => {
    setProgress(0);

    if (storyIndex > 0) {
      setStoryIndex(prev => prev - 1);
      return;
    }

    if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      setGroupIndex(prev => prev - 1);
      setStoryIndex(Math.max((prevGroup?.stories?.length || 1) - 1, 0));
    }
  }, [groupIndex, groups, storyIndex]);

  const goNext = useCallback(() => {
    setProgress(0);

    if (!group) return;

    if (storyIndex < group.stories.length - 1) {
      setStoryIndex(prev => prev + 1);
      return;
    }

    if (groupIndex < groups.length - 1) {
      setGroupIndex(prev => prev + 1);
      setStoryIndex(0);
      return;
    }

    onClose();
  }, [group, groupIndex, groups.length, onClose, storyIndex]);

  useEffect(() => {
    if (!story?.id) return;
    void storiesService.trackView(story.id, user?.id);
  }, [story?.id, user?.id]);

  useEffect(() => {
    setStoryIndex(0);
  }, [groupIndex]);

  useEffect(() => {
    if (!story?.id) return;

    setProgress(0);

    if (story.media_type === 'video') {
      return;
    }

    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const nextProgress = Math.min(((Date.now() - startedAt) / STORY_DURATION_MS) * 100, 100);
      setProgress(nextProgress);

      if (nextProgress >= 100) {
        window.clearInterval(interval);
        goNext();
      }
    }, 80);

    return () => window.clearInterval(interval);
  }, [goNext, story?.id, story?.media_type]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') goNext();
      if (event.key === 'ArrowLeft') goPrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [goNext, goPrev, onClose]);

  const avatar = useMemo(() => getStoryAvatar(group?.physio), [group?.physio]);

  const handleCta = async () => {
    if (!story) return;
    await storiesService.trackClick(story.id, user?.id);
  };

  if (!group || !story || !isClient()) return null;

  const overlay = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black p-0 sm:bg-slate-950/95 sm:p-3 sm:backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="relative h-[100dvh] w-full max-w-[430px] overflow-hidden bg-black sm:h-[86vh] sm:rounded-[2.5rem] sm:border sm:border-white/10 sm:shadow-2xl sm:shadow-blue-950/40"
        >
          <div className="absolute left-0 right-0 top-0 z-30 space-y-3 bg-gradient-to-b from-black/85 to-transparent p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:p-5">
            <div className="flex gap-1">
              {group.stories.map((item, index) => {
                const width =
                  index < storyIndex
                    ? '100%'
                    : index === storyIndex
                      ? `${story.media_type === 'video' ? 100 : progress}%`
                      : '0%';

                return (
                  <div key={item.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                    <div className="h-full rounded-full bg-white transition-[width] duration-100" style={{ width }} />
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              {avatar ? (
                <img src={avatar} alt={group.physio?.nome_completo || 'Fisioterapeuta'} className="h-10 w-10 rounded-full object-cover ring-2 ring-pink-500" />
              ) : (
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-sm font-black text-white ring-2 ring-pink-500">
                  {getInitials(group.physio?.nome_completo)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-white">{group.physio?.nome_completo || 'Fisioterapeuta'}</p>
                <p className="truncate text-[11px] font-semibold text-white/65">Story • FisioCareHub</p>
              </div>

              <button onClick={onClose} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
                <X size={24} />
              </button>
            </div>
          </div>

          <StoryMedia story={story} onEnded={goNext} />

          <button
            type="button"
            aria-label="Story anterior"
            onClick={canGoPrev ? goPrev : undefined}
            className="absolute left-0 top-24 bottom-32 z-20 w-1/2"
          />
          <button
            type="button"
            aria-label="Próximo story"
            onClick={goNext}
            className="absolute right-0 top-24 bottom-32 z-20 w-1/2"
          />

          <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/90 to-transparent p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-24 sm:p-5 sm:pt-20">
            {story.title && <h3 className="text-xl font-black text-white">{story.title}</h3>}
            {story.caption && <p className="mt-2 text-sm font-semibold leading-relaxed text-white/80">{story.caption}</p>}

            <div className="mt-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/55">
              <Eye size={14} /> {Number(story.views_count || 0)} views
              <span className="mx-1 h-1 w-1 rounded-full bg-white/30" />
              <MousePointerClick size={14} /> {Number(story.clicks_count || 0)} cliques
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link
                to={`/physio/${story.physio_id}`}
                onClick={handleCta}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-white backdrop-blur-xl hover:bg-white/20"
              >
                <User size={16} />
                Perfil
              </Link>
              <Link
                to={story.cta_url || `/physio/${story.physio_id}`}
                onClick={handleCta}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-pink-950/30"
              >
                {story.cta_type === 'message' ? <MessageCircle size={16} /> : <Calendar size={16} />}
                {story.cta_label || 'Agendar'}
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}
