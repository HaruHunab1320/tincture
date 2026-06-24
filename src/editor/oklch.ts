/**
 * Tiny utilities for parsing and formatting CSS oklch() values, used by the
 * color panel's L/C/H sliders. We intentionally keep the format permissive on
 * read (alpha optional, whitespace tolerant) and strict on write (single space
 * separator, 3-decimal precision, no trailing zeros beyond what was given).
 */

export interface OklchValue {
  l: number;
  c: number;
  h: number;
  /** Optional alpha as a raw token (e.g. "10%" or "0.5") so we preserve the user's notation. */
  alpha?: string;
}

const OKLCH_RE = /^oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.%]+))?\s*\)$/i;

export function parseOklch(input: string): OklchValue | null {
  const m = input.trim().match(OKLCH_RE);
  if (!m) return null;
  const lRaw = Number.parseFloat(m[1]);
  // `oklch(50% ...)` is the same as `oklch(0.5 ...)`. Source uses `%`?
  // We can't tell without seeing the original character, so peek at the
  // original input.
  const lIsPercent = /^[\d.]+%/.test(input.trim().slice('oklch('.length));
  const l = lIsPercent ? lRaw / 100 : lRaw;
  const c = Number.parseFloat(m[2]);
  const h = Number.parseFloat(m[3]);
  if (![l, c, h].every(Number.isFinite)) return null;
  return { l, c, h, alpha: m[4] };
}

function trimNumber(n: number, max = 3): string {
  if (!Number.isFinite(n)) return '0';
  const fixed = n.toFixed(max);
  return fixed.replace(/\.?0+$/, '');
}

export function formatOklch({ l, c, h, alpha }: OklchValue): string {
  const body = `${trimNumber(l)} ${trimNumber(c)} ${trimNumber(h)}`;
  return alpha ? `oklch(${body} / ${alpha})` : `oklch(${body})`;
}

export function clampOklch({ l, c, h, alpha }: OklchValue): OklchValue {
  return {
    l: Math.max(0, Math.min(1, l)),
    c: Math.max(0, Math.min(0.4, c)),
    h: ((h % 360) + 360) % 360,
    alpha,
  };
}
