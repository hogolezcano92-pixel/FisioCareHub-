import { supabase } from './supabaseClient';

// Função genérica para qualquer tabela
export const table = (nomeTabela) => ({
  select: (query = '*') => supabase.from(nomeTabela).select(query),
  insert: (data) => supabase.from(nomeTabela).insert(data),
  update: (data) => supabase.from(nomeTabela).update(data),
  delete: (filter) => supabase.from(nomeTabela).delete().match(filter),
  single: () => supabase.from(nomeTabela).select('*').single(),
});

// Funções específicas que você usa bastante
export const fetchAgendamentos = (userId) =>
  supabase
    .from('agendamentos')
    .select('*')
    .eq('fisio_id', userId)
    .order('data_servico', { ascending: false });

export const fetchNotificacoes = (userId) =>
  supabase
    .from('notificacoes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

export const fetchPerfil = (userId) =>
  supabase
    .from('perfis')
    .select('*')
    .eq('id', userId)
    .single();
