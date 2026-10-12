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

/** Milliseconds -> "0.4s", "12.0s", "3m 05s", "2h 03m 10s". */
export function formatDuration(ms: number): string {
  const safe = Math.max(0, ms);
  if (safe < 60_000) return `${(safe / 1000).toFixed(1)}s`;
  const totalSeconds = Math.ceil(safe / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = String(totalSeconds % 60).padStart(2, '0');
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m ${s}s` : `${m}m ${s}s`;
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
