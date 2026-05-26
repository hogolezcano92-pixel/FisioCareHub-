const SAO_PAULO_TZ = 'America/Sao_Paulo';
const ISO_DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function getDatePartsInSaoPaulo(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value || String(date.getFullYear());
  const month = parts.find((p) => p.type === 'month')?.value || pad2(date.getMonth() + 1);
  const day = parts.find((p) => p.type === 'day')?.value || pad2(date.getDate());

  return { year, month, day };
}

function hasExplicitTimezone(value: string) {
  return /(?:z|[+-]\d{2}:?\d{2})$/i.test(value.trim());
}

export function todayDateKeyBR() {
  const { year, month, day } = getDatePartsInSaoPaulo(new Date());
  return `${year}-${month}-${day}`;
}

export function normalizeDateKey(value: string | Date | number | null | undefined) {
  if (!value) return '';

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const { year, month, day } = getDatePartsInSaoPaulo(value);
    return `${year}-${month}-${day}`;
  }

  const raw = String(value).trim();
  const iso = raw.match(ISO_DATE_KEY_RE);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const isoDateTime = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T\s]/);
  if (isoDateTime) {
    if (hasExplicitTimezone(raw)) {
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) {
        const { year, month, day } = getDatePartsInSaoPaulo(parsed);
        return `${year}-${month}-${day}`;
      }
    }
    return `${isoDateTime[1]}-${isoDateTime[2]}-${isoDateTime[3]}`;
  }

  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const { year, month, day } = getDatePartsInSaoPaulo(parsed);
    return `${year}-${month}-${day}`;
  }

  return '';
}

function normalizeHour(value: string | Date | number | null | undefined) {
  if (!value) return '';

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return value.toLocaleTimeString('pt-BR', {
      timeZone: SAO_PAULO_TZ,
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const raw = String(value).trim();
  if (hasExplicitTimezone(raw)) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString('pt-BR', {
        timeZone: SAO_PAULO_TZ,
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }

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
 * Formata apenas a data (dia/mês/ano), sem deixar YYYY-MM-DD virar o dia anterior por fuso horário.
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
