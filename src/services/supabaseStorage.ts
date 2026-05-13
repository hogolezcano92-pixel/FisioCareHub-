import { getSupabase } from '../lib/supabase';

export interface UploadProgress {
  progress: number;
}

export const uploadProfilePhoto = async (
  userId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const fileName = `avatar-${userId}.jpg`;
  const bucket = 'avatars';

  // Check if file is an image
  if (!file.type.startsWith('image/')) {
    throw new Error('O arquivo deve ser uma imagem.');
  }

  const supabase = getSupabase();
  console.log(`Tentando upload para o bucket "${bucket}"...`);
  
  // 1. Upload the file
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: '3600',
    });

  if (error) {
    console.error("Erro retornado pelo Supabase Storage:", error);
    
    if (error.message === 'Load failed' || error.message?.includes('fetch')) {
      throw new Error('Falha na conexão com o Supabase. Verifique sua internet.');
    }

    if (error.message === 'Bucket not found') {
      throw new Error(`O bucket "${bucket}" não foi encontrado. Acesse o painel do Supabase > Storage e crie um bucket público chamado "${bucket}".`);
    }

    if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
      throw new Error(`Erro de permissão (RLS) no bucket "${bucket}". No painel do Supabase > Storage > Policies, adicione uma política permitindo INSERT e SELECT para usuários autenticados.`);
    }

    throw error;
  }

  // 2. Get the public URL
  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    throw new Error("Não foi possível obter a URL pública da imagem.");
  }

  return publicUrlData.publicUrl;
};

export const uploadDocument = async (
  userId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const path = `fisioterapeutas/${userId}/${fileName}`;
  const bucket = 'documents';

  const supabase = getSupabase();
  console.log(`Tentando upload de documento para o bucket "${bucket}" no caminho "${path}"...`);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

  if (error) {
    console.error("Erro no upload de documento Supabase:", error);
    
    if (error.message === 'Load failed' || error.message?.includes('fetch')) {
      throw new Error('Falha na conexão com o Supabase.');
    }

    if (error.message === 'Bucket not found') {
      throw new Error(`O bucket "${bucket}" não foi encontrado. Acesse o painel do Supabase > Storage e crie um bucket chamado "${bucket}".`);
    }

    if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
      throw new Error(`Erro de permissão (RLS) no bucket "${bucket}". No painel do Supabase > Storage > Policies, adicione uma política permitindo INSERT e SELECT para usuários autenticados.`);
    }

    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return publicUrlData.publicUrl;
};

export const uploadPhysioDocument = async (
  userId: string,
  file: File,
  documentType: 'rg_frente' | 'rg_verso' | 'crefito_frente' | 'crefito_verso'
): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${documentType}.${fileExt}`;
  const path = `${userId}/${fileName}`;
  const bucket = 'documents';

  const supabase = getSupabase();
  console.log(`Tentando upload de documento fisioterapeuta para o bucket "${bucket}" no caminho "${path}"...`);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

  if (error) {
    console.error("Erro no upload de documento fisioterapeuta Supabase:", error);
    
    if (error.message === 'Load failed' || error.message?.includes('fetch')) {
      throw new Error('Falha na conexão com o Supabase.');
    }

    if (error.message === 'Bucket not found') {
      throw new Error(`O bucket "${bucket}" não foi encontrado. Certifique-se de executar o script SQL de configuração.`);
    }

    if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
      throw new Error(`Erro de permissão (RLS) no bucket "${bucket}".`);
    }

    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return publicUrlData.publicUrl;
};

export const checkBuckets = async (): Promise<{ avatars: boolean; documents: boolean; physioDocs: boolean }> => {
  const supabase = getSupabase();
  const { data: buckets, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error("Erro ao listar buckets:", error);
    throw error;
  }

  return {
    avatars: buckets.some(b => b.name === 'avatars'),
    documents: buckets.some(b => b.name === 'documents'),
    physioDocs: buckets.some(b => b.name === 'documentos_fisioterapeutas'),
  };
};
