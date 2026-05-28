import { supabase } from '../lib/supabase';

export type StoryMediaType = 'image' | 'video';
export type StoryStatus = 'active' | 'pending' | 'blocked' | 'expired';

export type FisioStory = {
  id: string;
  physio_id: string;
  title: string | null;
  caption: string | null;
  media_url: string;
  media_type: StoryMediaType;
  cta_type: string | null;
  cta_label: string | null;
  cta_url: string | null;
  status: StoryStatus;
  expires_at: string | null;
  created_at: string;
  updated_at?: string | null;
  views_count?: number | null;
  clicks_count?: number | null;
  physio?: {
    id: string;
    nome_completo: string | null;
    foto_url?: string | null;
    avatar_url?: string | null;
    especialidade?: string | null;
    cidade?: string | null;
    estado?: string | null;
  } | null;
};

export type StoryGroup = {
  physio_id: string;
  physio: NonNullable<FisioStory['physio']>;
  stories: FisioStory[];
};

const normalizeStory = (story: any): FisioStory => ({
  ...story,
  physio: story?.physio || story?.perfis || null,
  views_count: Number(story?.views_count || 0),
  clicks_count: Number(story?.clicks_count || 0),
});

const groupStories = (stories: FisioStory[]): StoryGroup[] => {
  const map = new Map<string, StoryGroup>();

  stories.forEach((story) => {
    const physio = story.physio || {
      id: story.physio_id,
      nome_completo: 'Fisioterapeuta',
      foto_url: null,
      avatar_url: null,
      especialidade: null,
      cidade: null,
      estado: null,
    };

    if (!map.has(story.physio_id)) {
      map.set(story.physio_id, { physio_id: story.physio_id, physio, stories: [] });
    }

    map.get(story.physio_id)?.stories.push(story);
  });

  return Array.from(map.values());
};

export const storiesService = {
  async listActiveStories(limit = 30): Promise<StoryGroup[]> {
    const { data, error } = await supabase
      .from('fisio_stories')
      .select(`
        *,
        physio:perfis!fisio_stories_physio_id_fkey (
          id,
          nome_completo,
          foto_url,
          avatar_url,
          especialidade,
          cidade,
          estado
        )
      `)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return groupStories((data || []).map(normalizeStory));
  },

  async listStoriesByPhysio(physioId: string, includeInactive = false): Promise<FisioStory[]> {
    let query = supabase
      .from('fisio_stories')
      .select(`
        *,
        physio:perfis!fisio_stories_physio_id_fkey (
          id,
          nome_completo,
          foto_url,
          avatar_url,
          especialidade,
          cidade,
          estado
        )
      `)
      .eq('physio_id', physioId)
      .order('created_at', { ascending: false });

    if (!includeInactive) {
      query = query.eq('status', 'active').gt('expires_at', new Date().toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(normalizeStory);
  },

  async listAdminStories(): Promise<FisioStory[]> {
    const { data, error } = await supabase
      .from('fisio_stories')
      .select(`
        *,
        physio:perfis!fisio_stories_physio_id_fkey (
          id,
          nome_completo,
          foto_url,
          avatar_url,
          especialidade,
          cidade,
          estado
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return (data || []).map(normalizeStory);
  },

  async uploadStoryFile(file: File, physioId: string): Promise<{ url: string; mediaType: StoryMediaType }> {
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isImage && !isVideo) throw new Error('Envie uma imagem ou vídeo válido.');

    const maxSize = isVideo ? 80 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxSize) throw new Error(isVideo ? 'O vídeo deve ter até 80 MB.' : 'A imagem deve ter até 15 MB.');

    const ext = file.name.split('.').pop()?.toLowerCase() || (isVideo ? 'mp4' : 'jpg');
    const path = `${physioId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from('fisio-stories').upload(path, file, {
      cacheControl: '86400',
      upsert: false,
      contentType: file.type || undefined,
    });

    if (error) throw error;

    const { data } = supabase.storage.from('fisio-stories').getPublicUrl(path);
    if (!data?.publicUrl) throw new Error('Story enviado, mas a URL pública não foi gerada.');

    return { url: data.publicUrl, mediaType: isVideo ? 'video' : 'image' };
  },

  async createStory(params: {
    physioId: string;
    title?: string;
    caption?: string;
    mediaUrl: string;
    mediaType: StoryMediaType;
    ctaType?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    durationHours?: number;
  }): Promise<FisioStory> {
    const expiresAt = new Date(Date.now() + (params.durationHours || 24) * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('fisio_stories')
      .insert({
        physio_id: params.physioId,
        title: params.title || null,
        caption: params.caption || null,
        media_url: params.mediaUrl,
        media_type: params.mediaType,
        cta_type: params.ctaType || 'profile',
        cta_label: params.ctaLabel || 'Ver perfil',
        cta_url: params.ctaUrl || `/physio/${params.physioId}`,
        status: 'active',
        expires_at: expiresAt,
      })
      .select('*')
      .single();

    if (error) throw error;
    return normalizeStory(data);
  },

  async trackView(storyId: string, viewerId?: string | null) {
    try {
      await supabase.from('fisio_story_events').insert({ story_id: storyId, viewer_id: viewerId || null, event_type: 'view' });
      await supabase.rpc('increment_fisio_story_views', { story_id_input: storyId });
    } catch (error) {
      console.warn('[storiesService] trackView falhou:', error);
    }
  },

  async trackClick(storyId: string, viewerId?: string | null) {
    try {
      await supabase.from('fisio_story_events').insert({ story_id: storyId, viewer_id: viewerId || null, event_type: 'click' });
      await supabase.rpc('increment_fisio_story_clicks', { story_id_input: storyId });
    } catch (error) {
      console.warn('[storiesService] trackClick falhou:', error);
    }
  },

  async updateStoryStatus(storyId: string, status: StoryStatus) {
    const { error } = await supabase
      .from('fisio_stories')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', storyId);

    if (error) throw error;
  },

  async deleteStory(storyId: string) {
    const { error } = await supabase.from('fisio_stories').delete().eq('id', storyId);
    if (error) throw error;
  },
};

export const getStoryAvatar = (storyOrPhysio: FisioStory | StoryGroup['physio']) => {
  const physio = 'physio' in storyOrPhysio ? storyOrPhysio.physio : storyOrPhysio;
  return (physio as StoryGroup['physio'] | null | undefined)?.foto_url || (physio as StoryGroup['physio'] | null | undefined)?.avatar_url || '';
};
