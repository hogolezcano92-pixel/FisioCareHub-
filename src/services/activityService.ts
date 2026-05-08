import { supabase } from '../lib/supabase';

export type ActivityType = 
  | 'agendamento_criado' 
  | 'agendamento_concluido' 
  | 'agendamento_excluido'
  | 'agendamento_atualizado'
  | 'avaliacao_enviada' 
  | 'perfil_atualizado'
  | 'mensagem_recebida'
  | 'triagem_realizada'
  | 'login'
  | 'logout'
  | 'prontuario_criado'
  | 'prontuario_editado'
  | 'prontuario_acessado'
  | 'exclusao_registro'
  | 'pagamento_realizado'
  | 'plano_alterado'
  | 'upload_arquivo'
  | 'erro_sistema'
  | 'acao_suspicia'
  | 'admin_action'
  | 'suspensao_usuario';

export interface LogDetails {
  ip?: string;
  userAgent?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
}

export const logActivity = async (
  userId: string, 
  userType: 'paciente' | 'fisio' | 'admin' | 'sistema', 
  action: ActivityType, 
  description: string, 
  referenceId?: string,
  details?: LogDetails
) => {
  try {
    const { error } = await supabase
      .from('historico_atividades')
      .insert({
        usuario_id: userId,
        tipo_usuario: userType,
        tipo_acao: action,
        descricao: description,
        referencia_id: referenceId,
        detalhes: details || {},
        ip_address: details?.ip || null
      });

    if (error) throw error;
  } catch (err) {
    console.error('Erro ao logar atividade:', err);
  }
};
