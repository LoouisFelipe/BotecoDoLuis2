import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format as dateFnsFormat } from "date-fns"
import { toZonedTime, formatInTimeZone } from 'date-fns-tz'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * CONFIGURAÇÃO DE TIMEZONE (Dogma do Boteco)
 * Usamos explicitamente America/Sao_Paulo.
 * O offset padrão é -03:00 (Brasil não tem mais horário de verão).
 */
const TIMEZONE = 'America/Sao_Paulo';
const SP_OFFSET = '-03:00';

/**
 * Retorna um objeto Date cujo "wall clock" (horas/minutos locais) 
 * reflete exatamente o horário em São Paulo.
 * Útil para cálculos de lógica de negócio baseados na hora do balcão.
 */
export function getSaoPauloDate(dateObj: Date | any = new Date()): Date {
  let d: Date;
  
  if (dateObj instanceof Date) {
    d = dateObj;
  } else if (dateObj?.toDate && typeof dateObj.toDate === 'function') {
    // Handle Firestore Timestamp
    d = dateObj.toDate();
  } else if (typeof dateObj === 'string' || typeof dateObj === 'number') {
    d = new Date(dateObj);
  } else if (dateObj?.seconds !== undefined) {
    // Handle plain object representation of Timestamp
    d = new Date(dateObj.seconds * 1000);
  } else {
    d = new Date();
  }
  
  if (isNaN(d.getTime())) return d;
  
  return toZonedTime(d, TIMEZONE);
}

/**
 * Agora em São Paulo (Ajustado para o fuso local).
 */
export function nowInSaoPaulo(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

/**
 * Garante que qualquer entrada de data (string, ISO, objeto) seja interpretada
 * no contexto de São Paulo (-03:00).
 * Se a string não contiver fuso horário, força o offset de SP.
 */
export function parseAsSaoPaulo(dateInput: any): Date {
  if (!dateInput) return nowInSaoPaulo();

  // Se já for Date ou Timestamp
  if (dateInput instanceof Date || (dateInput?.toDate && typeof dateInput.toDate === 'function')) {
    const d = dateInput instanceof Date ? dateInput : dateInput.toDate();
    return toZonedTime(d, TIMEZONE);
  }

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();

    // Caso seja apenas data YYYY-MM-DD
    if (trimmed.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      // Forçamos o meio-dia em SP para evitar saltos de dia por causa do UTC
      return new Date(`${trimmed}T12:00:00${SP_OFFSET}`);
    }

    // Se tiver data e hora mas sem fuso especificado
    if (trimmed.includes('T') && !trimmed.includes('-') && !trimmed.includes('+') && !trimmed.endsWith('Z')) {
      return new Date(`${trimmed}${SP_OFFSET}`);
    }

    // Caso de espaço em vez de T: YYYY-MM-DD HH:mm:ss
    if (trimmed.includes(' ') && /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/.test(trimmed)) {
       const iso = trimmed.replace(' ', 'T');
       if (!iso.includes('-') && !iso.includes('+') && !iso.endsWith('Z')) {
         return new Date(`${iso}${SP_OFFSET}`);
       }
    }

    // ISO padrão com Z ou offset
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return toZonedTime(parsed, TIMEZONE);
    }
  }
  
  const finalDate = new Date(dateInput);
  return isNaN(finalDate.getTime()) ? nowInSaoPaulo() : toZonedTime(finalDate, TIMEZONE);
}

/**
 * Wrapper de formatação que garante que a data esteja no fuso de SP antes de formatar.
 */
export function format(date: Date | number | any, formatStr: string, options?: any): string {
  if (!date) return '';
  let d: Date;
  
  if (date instanceof Date) {
    d = date;
  } else if (date?.toDate && typeof date.toDate === 'function') {
    d = date.toDate();
  } else if (typeof date === 'number' || typeof date === 'string') {
    // Se for string, tentamos o parse robusto primeiro
    if (typeof date === 'string') {
      d = parseAsSaoPaulo(date);
    } else {
      d = new Date(date);
    }
  } else if (date?.seconds !== undefined) {
    d = new Date(date.seconds * 1000);
  } else {
    return '';
  }

  if (isNaN(d.getTime())) return '';
  
  // Usamos formatInTimeZone para garantir que o output seja sempre SP
  return formatInTimeZone(d, TIMEZONE, formatStr, options);
}

/**
 * LOGICA DE EXPEDIENTE (06:00 - 05:59)
 * Retorna a data lógica do dia de trabalho.
 */
export function getShiftDate(dateObj: Date | any = new Date()): string {
  const d = getSaoPauloDate(dateObj);
  const hour = d.getHours();
  
  // Madrugadas (00:00 - 05:59) pertencem ao dia anterior
  if (hour < 6) {
    d.setDate(d.getDate() - 1);
  }
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Retorna o intervalo (start/end) do expediente para uma data.
 */
export function getShiftInterval(dateInput: Date | any = new Date()) {
  const logicalDateStr = getShiftDate(dateInput);
  
  // Início: 06:00:00 do dia lógico em SP
  const start = new Date(`${logicalDateStr}T06:00:00.000${SP_OFFSET}`);
  
  // Fim: 05:59:59.999 do dia civil seguinte em SP
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  
  return { start, end };
}

/**
 * Formata moeda para Real Brasileiro (BRL).
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata números com padrão pt-BR.
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formata data e hora com o contexto do expediente.
 */
export function formatShiftDateTime(date: Date | any): string {
  if (!date) return '---';
  const d = getSaoPauloDate(date);
  
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Retorna o início e fim do dia atual (civil) em SP.
 */
export function getTodayRange() {
  const now = nowInSaoPaulo();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  const start = new Date(`${year}-${month}-${day}T00:00:00.000${SP_OFFSET}`);
  const end = new Date(`${year}-${month}-${day}T23:59:59.999${SP_OFFSET}`);
  
  return { start, end };
}

