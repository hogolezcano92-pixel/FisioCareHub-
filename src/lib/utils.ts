import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ISO_DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function normalizeDateKey(value?: string | null) {
  if (!value) return '';
  const raw = String(value).trim();
  const iso = raw.match(ISO_DATE_KEY_RE);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const isoDateTime = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T\s]/);
  if (isoDateTime) return `${isoDateTime[1]}-${isoDateTime[2]}-${isoDateTime[3]}`;

  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;

  return '';
}

export function formatDateKeyBR(value?: string | null, fallback = 'Data não informada') {
  const key = normalizeDateKey(value);
  if (!key) return value ? String(value) : fallback;
  const [year, month, day] = key.split('-');
  return `${day}/${month}/${year}`;
}

export function formatDateKeyLongBR(value?: string | null, fallback = 'Data não informada') {
  const key = normalizeDateKey(value);
  if (!key) return value ? String(value) : fallback;
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export function formatTimeBR(value?: string | null, fallback = 'Horário não informado') {
  if (!value) return fallback;
  const raw = String(value).trim();
  const time = raw.match(/(\d{2}):(\d{2})/);
  if (time) return `${time[1]}:${time[2]}`;
  return raw || fallback;
}

export function formatDate(date: any) {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function resolveStorageUrl(url: string) {
  if (!url) return '';
  
  // Se já for uma URL completa, retorna sem modificações
  if (url.startsWith('http')) return url;
  
  // Tenta resolver caminhos relativos se a URL do Supabase estiver disponível
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    // Remove barras duplicadas se houver
    const baseUrl = supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl;
    const cleanPath = url.startsWith('/') ? url.slice(1) : url;
    
    // Se o caminho não começar com 'storage/v1/object/public/', tenta deduzir o bucket
    // Este é um fallback genérico, o ideal é sempre salvar a URL completa
    if (!cleanPath.includes('storage/v1/object/public/')) {
       // Se o caminho tiver estrutura de bucket/arquivo
       return `${baseUrl}/storage/v1/object/public/${cleanPath}`;
    }
    
    return `${baseUrl}/${cleanPath}`;
  }

  return url;
}

export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function(...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function throttle<T extends (...args: any[]) => any>(fn: T, limit: number) {
  let inThrottle: boolean;
  return function(...args: Parameters<T>) {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11) return false;
  
  // Digits check
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) {
    sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
  
  return true;
}

export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}
