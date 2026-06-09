import { supabase } from '../lib/supabase';
import { sendExercisePrescriptionEmail } from './emailService';

type NotificationResult = {
  appNotification?: { success: boolean; error?: any };
  email?: { success: boolean; error?: any };
};

const APP_URL = 'https://fisiocarehub.company';

const safeCount = (value?: number | null) => {
  const count = Number(value || 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
};

/**
 * Centraliza sino do app + e-mail para prescrição de exercícios.
 *
 * Importante:
 * - Não lança erro se o e-mail falhar. A prescrição não deve ser desfeita por falha de notificação.
 * - Para o sino funcionar, patientUserId deve ser o ID da conta do paciente quando existir
 *   (normalmente pacientes.perfil_id). Em cadastros antigos pode ser pacientes.id.
 */
export async function notifyExercisePrescription(params: {
  patientUserId?: string | null;
  patientEmail?: string | null;
  patientName?: string | null;
  physioName?: string | null;
  exerciseCount?: number | null;
  protocolId?: string | number | null;
  protocolTitle?: string | null;
}) {
  const result: NotificationResult = {};
  const count = safeCount(params.exerciseCount);
  const plural = count === 1 ? 'exercício' : 'exercícios';
  const link = '/patient-exercises';

  if (params.patientUserId) {
    try {
      const { error } = await supabase.from('notificacoes').insert({
        user_id: params.patientUserId,
        titulo: 'Nova prescrição de exercícios',
        mensagem: count > 0
          ? `Seu fisioterapeuta prescreveu ${count} ${plural}. Toque para visualizar sua prescrição.`
          : 'Seu fisioterapeuta vinculou uma nova prescrição. Toque para visualizar seus exercícios.',
        tipo: 'exercise',
        lida: false,
        link,
      });

      result.appNotification = { success: !error, error };
      if (error) {
        console.error('[notificationCenter] Erro ao criar notificação de prescrição:', error);
      }
    } catch (error) {
      result.appNotification = { success: false, error };
      console.error('[notificationCenter] Falha inesperada ao criar notificação de prescrição:', error);
    }
  }

  if (params.patientEmail) {
    try {
      result.email = await sendExercisePrescriptionEmail(
        params.patientEmail,
        params.patientName,
        {
          physioName: params.physioName,
          exerciseCount: count,
          protocolTitle: params.protocolTitle,
          appUrl: `${APP_URL}${link}`,
        },
      );
    } catch (error) {
      result.email = { success: false, error };
      console.error('[notificationCenter] Falha inesperada ao enviar e-mail de prescrição:', error);
    }
  }

  return result;
}
