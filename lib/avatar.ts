/** Initials and a stable colour for a person's avatar (from EJO 100). Brand-led palette. */
const PALETTE = ['#a8620c', '#0a1628', '#2563eb', '#15803d', '#9333ea', '#be123c', '#0e7490', '#4f46e5'];

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]!.charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : '';
  return (first + last).toUpperCase();
}

export function colourOf(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}
