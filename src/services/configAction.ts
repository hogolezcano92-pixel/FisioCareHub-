
/**
 * Action: fetchConfig
 * Realiza uma requisição POST para a Edge Function de configuração do Supabase.
 */

import { invokeFunction } from '../lib/supabase';

/**
 * Action: fetchConfig
 * Realiza uma requisição para a Edge Function de configuração do Supabase.
 */
export const fetchConfig = async () => {
  try {
    console.log('Iniciando fetchConfig via invokeFunction...');
    const data = await invokeFunction('get-config', {});
    console.log('fetchConfig concluído com sucesso:', data);
    return data;
  } catch (error) {
    console.warn('Erro ao executar fetchConfig:', error);
    return null;
  }
};
