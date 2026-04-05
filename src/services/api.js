import { supabase } from './supabaseClient';

export async function fetchProfissionais() {
  const { data, error } = await supabase
    .from('perfis')
    .select('*')
    .eq('tipo_usuario', 'fisioterapeuta');
  if (error) console.error('Erro ao buscar profissionais:', error);
  return data;
}

export async function fetchPacientes() {
  const { data, error } = await supabase
    .from('perfis')
    .select('id, nome_completo, email')
    .eq('tipo_usuario', 'paciente')
    .order('nome_completo', { ascending: true });
  if (error) console.error('Erro ao buscar pacientes:', error);
  return data;
}

export async function fetchAgendamentos(fisio_id) {
  const { data, error } = await supabase
    .from('agendamentos')
    .select(
      `*, paciente:paciente_id(nome_completo,email), fisioterapeuta:fisio_id(nome_completo,email)`
    )
    .eq('fisio_id', fisio_id)
    .order('data_servico', { ascending: false })
    .limit(5);
  if (error) console.error('Erro ao buscar agendamentos:', error);
  return data;
}

export async function fetchNotificacoes(user_id) {
  const { data, error } = await supabase
    .from('notificacoes')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) console.error('Erro ao buscar notificações:', error);
  return data;
}
