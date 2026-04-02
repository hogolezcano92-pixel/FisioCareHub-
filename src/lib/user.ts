import { supabase } from './supabase';

export async function getUserName(uid: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('perfis')
      .select('nome_completo')
      .eq('id', uid)
      .single();
    
    if (error) throw error;
    return data?.nome_completo || 'Usuário';
  } catch (err) {
    console.error("Erro ao buscar nome do usuário:", err);
    return 'Usuário';
  }
}
