import { Pipe, PipeTransform } from '@angular/core';

const LARGE_NUMBER_NAMES = [
  'million',
  'billion',
  'trillion',
  'quadrillion',
  'quintillion',
  'sextillion',
  'septillion',
  'octillion',
  'nonillion',
  'decillion',
];

/** 4.28 -> "4.28"; 1234.5 -> "1,235"; 4.2e9 -> "4.200 billion"; beyond decillions -> "1.23e+36". */
export function formatBigNumber(value: number): string {
  if (!Number.isFinite(value)) return '∞';
  const abs = Math.abs(value);
  if (abs < 1e6) {
    const cents = Math.round(value * 100) / 100;
    const showCents = abs < 1000 && !Number.isInteger(cents);
    return value.toLocaleString('en-US', {
      minimumFractionDigits: showCents ? 2 : 0,
      maximumFractionDigits: showCents ? 2 : 0,
    });
  }
  const group = Math.floor(Math.log10(abs) / 3) - 2;
  if (group >= LARGE_NUMBER_NAMES.length) return value.toExponential(2);
  return `${(value / Math.pow(1000, group + 2)).toFixed(3)} ${LARGE_NUMBER_NAMES[group]}`;
}

const COMPACT_SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/** Short form for floating gains: 12 -> "12", 2400 -> "2.4K", 3.1e6 -> "3.1M". */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return '∞';
  const abs = Math.abs(value);
  if (abs < 1000) return String(Math.round(value * 100) / 100);
  const group = Math.floor(Math.log10(abs) / 3);
  if (group >= COMPACT_SUFFIXES.length) return value.toExponential(1);
  const scaled = Math.round((value / Math.pow(1000, group)) * 10) / 10;
  // Rounding can carry over to the next group (999.96K -> 1000K).
  if (Math.abs(scaled) >= 1000 && group + 1 < COMPACT_SUFFIXES.length) {
    return `${Math.round(scaled / 100) / 10}${COMPACT_SUFFIXES[group + 1]}`;
  }
  return `${scaled}${COMPACT_SUFFIXES[group]}`;
}

/**
 * Milliseconds -> "hours:minutes:seconds.tenths", as the assignment requires:
 * 500 -> "00:00:00.5", 185 200 -> "00:03:05.2", 3 723 400 -> "01:02:03.4".
 */
export function formatDuration(ms: number): string {
  const tenths = Math.round(Math.max(0, ms) / 100);
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(tenths / 36_000);
  const m = Math.floor((tenths % 36_000) / 600);
  const s = Math.floor((tenths % 600) / 10);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${tenths % 10}`;
}

@Pipe({ name: 'bigNumber' })
export class BigNumberPipe implements PipeTransform {
  transform(value: number): string {
    return formatBigNumber(value);
  }
}

@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(ms: number): string {
    return formatDuration(ms);
  }
}
