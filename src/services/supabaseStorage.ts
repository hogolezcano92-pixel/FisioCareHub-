import { getSupabase } from '../supabaseClient';

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
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      upsert: true,
      contentType: file.type,
    });

  if (error) {
    console.error("Erro retornado pelo Supabase Storage:", error);
    
    // Se o erro for "Load failed", pode ser um problema de rede ou URL incorreta
    if (error.message === 'Load failed' || error.message?.includes('fetch')) {
      throw new Error('Falha na conexão com o Supabase. Verifique se a URL do Supabase está correta e se você tem conexão com a internet.');
    }

    if (error.message === 'Bucket not found') {
      throw new Error(`O bucket "${bucket}" não foi encontrado. Por favor, crie-o no painel do Supabase.`);
    }

    if (error.message?.includes('row-level security') || error.message?.includes('RLS') || error.message?.includes('política de segurança')) {
      throw new Error(`Erro de permissão (RLS): O bucket "${bucket}" precisa de uma política de acesso que permita uploads públicos (anon). Vá ao painel do Supabase -> Storage -> Buckets -> ${bucket} -> Policies e adicione uma política para permitir INSERT e UPDATE para usuários anônimos.`);
    }

    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
};

export const uploadDocument = async (
  userId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const fileName = `${Date.now()}-${file.name}`;
  const path = `documents/${userId}/${fileName}`;
  const bucket = 'documents';

  const supabase = getSupabase();
  console.log(`Tentando upload de documento para o bucket "${bucket}"...`);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

  if (error) {
    console.error("Erro no upload de documento Supabase:", error);
    
    // Se o erro for "Load failed", pode ser um problema de rede ou URL incorreta
    if (error.message === 'Load failed' || error.message?.includes('fetch')) {
      throw new Error('Falha na conexão com o Supabase. Verifique se a URL do Supabase está correta e se você tem conexão com a internet.');
    }

    if (error.message === 'Bucket not found') {
      throw new Error(`O bucket "${bucket}" não foi encontrado. Por favor, crie-o no painel do Supabase.`);
    }

    if (error.message?.includes('row-level security') || error.message?.includes('RLS') || error.message?.includes('política de segurança')) {
      throw new Error(`Erro de permissão (RLS): O bucket "${bucket}" precisa de uma política de acesso que permita uploads públicos (anon). Vá ao painel do Supabase -> Storage -> Buckets -> ${bucket} -> Policies e adicione uma política para permitir INSERT e UPDATE para usuários anônimos.`);
    }

    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return publicUrlData.publicUrl;
};
