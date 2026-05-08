import { supabase } from '../lib/supabase';

export type ActivityType = 
  | 'agendamento_criado' 
  | 'agendamento_concluido' 
  | 'avaliacao_enviada' 
  | 'perfil_atualizado'
  | 'mensagem_recebida'
  | 'triagem_realizada';

export const logActivity = async (
  userId: string, 
  userType: 'paciente' | 'fisio', 
  action: ActivityType, 
  description: string, 
  referenceId?: string
) => {
  try {
    const { error } = await supabase
      .from('historico_atividades')
      .insert({
        usuario_id: userId,
        tipo_usuario: userType,
        tipo_acao: action,
        descricao: description,
        referencia_id: referenceId
      });

    if (error) throw error;
  } catch (err) {
    console.error('Erro ao logar atividade:', err);
  }
};
