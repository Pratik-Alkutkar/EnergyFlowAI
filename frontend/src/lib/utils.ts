import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function fmt(value: number | undefined | null, decimals = 1): string {
  if (value === undefined || value === null) return '—';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null) return '—';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtPct(value: number | undefined | null): string {
  if (value === undefined || value === null) return '—';
  return `${value.toFixed(1)}%`;
}

export function fmtTs(ts: string): string {
  try {
    return new Date(ts).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

export const ACTION_COLORS: Record<string, string> = {
  charge:    '#8b5cf6',
  discharge: '#ef4444',
  idle:      '#6b7280',
};

export const ACTION_BG: Record<string, string> = {
  charge:    'bg-purple-100 text-purple-800',
  discharge: 'bg-red-100 text-red-800',
  idle:      'bg-gray-100 text-gray-700',
};
