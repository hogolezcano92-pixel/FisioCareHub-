const ISO_DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function normalizeDateKey(value: string | Date | number) {
  if (!value) return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const raw = String(value).trim();
  const iso = raw.match(ISO_DATE_KEY_RE);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const isoDateTime = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T\s]/);
  if (isoDateTime) return `${isoDateTime[1]}-${isoDateTime[2]}-${isoDateTime[3]}`;

  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;

  return '';
}

function normalizeHour(value: string | Date | number) {
  if (!value) return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  const raw = String(value).trim();
  const time = raw.match(/(\d{2}):(\d{2})/);
  return time ? `${time[1]}:${time[2]}` : raw;
}

export function formatDateBR(date: string | Date | number) {
  if (!date) return '';
  const dateKey = normalizeDateKey(date);
  const hour = normalizeHour(date);

  if (!dateKey) return String(date);

  const [year, month, day] = dateKey.split('-');
  return hour ? `${day}/${month}/${year}, ${hour}` : `${day}/${month}/${year}`;
}

export function formatHourBR(date: string | Date | number) {
  return normalizeHour(date);
}

/**
 * Formata apenas a data (dia/mês/ano), sem converter fuso horário.
 */
export function formatOnlyDateBR(date: string | Date | number) {
  if (!date) return '';
  const dateKey = normalizeDateKey(date);
  if (!dateKey) return String(date);

  const [year, month, day] = dateKey.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Converte uma data local para o formato ISO UTC para salvar no banco.
 * Para campos DATE puros, prefira salvar YYYY-MM-DD diretamente.
 */
export function toUTC(date: string | Date): string {
  return new Date(date).toISOString();
}
