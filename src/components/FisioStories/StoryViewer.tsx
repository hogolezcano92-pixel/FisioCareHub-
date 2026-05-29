import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, User, MessageCircle, Share2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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

const StoryMedia = ({
  story,
  onEnded,
  onProgress,
}: {
  story: FisioStory;
  onEnded: () => void;
  onProgress: (value: number) => void;
}) => {
  if (story.media_type === 'video') {
    return (
      <video
        key={story.id}
        src={story.media_url}
        controls={false}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={() => onProgress(0)}
        onTimeUpdate={(event) => {
          const video = event.currentTarget;
          if (!video.duration || !Number.isFinite(video.duration)) return;

          onProgress(Math.min((video.currentTime / video.duration) * 100, 100));
        }}
        onEnded={onEnded}
        onError={onEnded}
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
      onError={onEnded}
    />
  );
};

export default function StoryViewer({ groups, initialGroupIndex, onClose }: StoryViewerProps) {
  const { user } = useAuth();

  /*
   * IMPORTANTE:
   * Mantemos uma cópia local dos groups no momento em que o viewer abre.
   * Assim, se o parent recarregar stories após trackView/trackClick, o story atual
   * não volta para o início nem muda de lista no meio da reprodução.
   */
  const [viewerGroups] = useState<StoryGroup[]>(() => groups);
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const nextTriggeredRef = useRef(false);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  const group = viewerGroups[groupIndex];
  const story = group?.stories?.[storyIndex];

  const canGoPrev = groupIndex > 0 || storyIndex > 0;
  const canGoNext = groupIndex < viewerGroups.length - 1 || storyIndex < (group?.stories?.length || 0) - 1;

  const profilePath = story ? `/physio/${story.physio_id}` : '/buscar-fisio';
  const safeCtaUrl = story?.cta_url?.startsWith('/') ? story.cta_url : '';
  const bookingPath = safeCtaUrl || `${profilePath}?storyAction=book`;
  const messagePath = story ? `/chat?user=${story.physio_id}` : '/chat';

  const protectPath = useCallback((path: string) => {
    if (user) return path;
    return `/login?redirectTo=${encodeURIComponent(path)}`;
  }, [user]);

  const goPrev = useCallback(() => {
    nextTriggeredRef.current = false;
    setProgress(0);

    setStoryIndex(currentStoryIndex => {
      if (currentStoryIndex > 0) {
        return currentStoryIndex - 1;
      }

      setGroupIndex(currentGroupIndex => {
        if (currentGroupIndex <= 0) return currentGroupIndex;

        const previousGroup = viewerGroups[currentGroupIndex - 1];
        const previousStoryIndex = Math.max((previousGroup?.stories?.length || 1) - 1, 0);

        setStoryIndex(previousStoryIndex);
        return currentGroupIndex - 1;
      });

      return currentStoryIndex;
    });
  }, [viewerGroups]);

  const goNext = useCallback(() => {
    setProgress(0);

    setStoryIndex(currentStoryIndex => {
      setGroupIndex(currentGroupIndex => {
        const currentGroup = viewerGroups[currentGroupIndex];
        const currentStoriesLength = currentGroup?.stories?.length || 0;

        if (currentStoryIndex < currentStoriesLength - 1) {
          return currentGroupIndex;
        }

        if (currentGroupIndex < viewerGroups.length - 1) {
          return currentGroupIndex + 1;
        }

        closeRef.current();
        return currentGroupIndex;
      });

      const currentGroup = viewerGroups[groupIndex];
      const currentStoriesLength = currentGroup?.stories?.length || 0;

      if (currentStoryIndex < currentStoriesLength - 1) {
        return currentStoryIndex + 1;
      }

      return 0;
    });
  }, [groupIndex, viewerGroups]);

  const handleStoryEnded = useCallback(() => {
    if (nextTriggeredRef.current) return;

    nextTriggeredRef.current = true;
    goNext();
  }, [goNext]);

  useEffect(() => {
    if (!story?.id) return;

    nextTriggeredRef.current = false;
    setProgress(0);
  }, [story?.id]);

  useEffect(() => {
    if (!story?.id) return;
    void storiesService.trackView(story.id, user?.id);
  }, [story?.id, user?.id]);

  useEffect(() => {
    if (!story?.id) return;

    if (story.media_type === 'video') {
      return;
    }

    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const nextProgress = Math.min(((Date.now() - startedAt) / STORY_DURATION_MS) * 100, 100);
      setProgress(nextProgress);

      if (nextProgress >= 100 && !nextTriggeredRef.current) {
        nextTriggeredRef.current = true;
        window.clearInterval(interval);
        goNext();
      }
    }, 80);

    return () => window.clearInterval(interval);
  }, [goNext, story?.id, story?.media_type]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key === 'ArrowRight') goNext();
      if (event.key === 'ArrowLeft') goPrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [goNext, goPrev]);

  const avatar = useMemo(() => getStoryAvatar(group?.physio), [group?.physio]);

  const handleAction = async () => {
    if (!story) return;
    await storiesService.trackClick(story.id, user?.id);
    closeRef.current();
  };

  const handleShare = async () => {
    if (!story) return;

    await storiesService.trackClick(story.id, user?.id);

    const shareUrl = `${window.location.origin}${profilePath}`;
    const shareText = `Conheça ${group?.physio?.nome_completo || 'este fisioterapeuta'} no FisioCareHub.`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'FisioCareHub',
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        window.alert('Link do perfil copiado.');
      }
    } catch (error) {
      console.warn('[StoryViewer] Compartilhamento cancelado ou indisponível:', error);
    }
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
                      ? `${progress}%`
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

          <StoryMedia story={story} onEnded={handleStoryEnded} onProgress={setProgress} />

          <button
            type="button"
            aria-label="Story anterior"
            onClick={canGoPrev ? goPrev : undefined}
            className="absolute left-0 top-24 bottom-40 z-20 w-1/2"
          />
          <button
            type="button"
            aria-label="Próximo story"
            onClick={goNext}
            className="absolute right-0 top-24 bottom-40 z-20 w-1/2"
          />

          <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/92 to-transparent p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-24 sm:p-5 sm:pt-20">
            {story.title && <h3 className="text-xl font-black text-white">{story.title}</h3>}
            {story.caption && <p className="mt-2 text-sm font-semibold leading-relaxed text-white/80">{story.caption}</p>}

            <Link
              to={protectPath(bookingPath)}
              onClick={handleAction}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-pink-950/30"
            >
              <Calendar size={17} />
              Agendar avaliação
            </Link>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <Link
                to={protectPath(profilePath)}
                onClick={handleAction}
                className="inline-flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/15 bg-white/10 px-3 py-3 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-xl hover:bg-white/20"
              >
                <User size={18} />
                Perfil
              </Link>

              <Link
                to={protectPath(messagePath)}
                onClick={handleAction}
                className="inline-flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/15 bg-white/10 px-3 py-3 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-xl hover:bg-white/20"
              >
                <MessageCircle size={18} />
                Mensagem
              </Link>

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/15 bg-white/10 px-3 py-3 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-xl hover:bg-white/20"
              >
                <Share2 size={18} />
                Compartilhar
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}
