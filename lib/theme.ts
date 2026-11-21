/**
 * Light / Dark / System, stored per device in a cookie for a year (as in EJO 100).
 * The server reads the cookie and sets data-theme on <html>, so pages never
 * flash the wrong colours and no inline script is needed.
 */
export type ThemeChoice = 'light' | 'dark' | 'system';
export const THEME_COOKIE = 'dpa-theme';

export function parseTheme(v: string | null | undefined): ThemeChoice {
  return v === 'light' || v === 'dark' ? v : 'system';
}
