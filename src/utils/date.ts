export function formatDateBR(date: string | Date | number) {
  if (!date) return '';
  return new Date(date).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

export function formatHourBR(date: string | Date | number) {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formata apenas a data (dia/mês/ano)
 */
export function formatOnlyDateBR(date: string | Date | number) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Converte uma data local para o formato ISO UTC para salvar no banco
 */
export function toUTC(date: string | Date): string {
  return new Date(date).toISOString();
}
