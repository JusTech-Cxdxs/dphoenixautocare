/** Password length rules (NIST SP 800-63B): long beats complicated. Shared by server and forms. */
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

/** A plain-words strength hint for the set-password form. */
export function passwordHint(pw: string): { ok: boolean; message: string } {
  if (pw.length < PASSWORD_MIN) return { ok: false, message: `Use at least ${PASSWORD_MIN} characters. A short sentence works well.` };
  if (pw.length > PASSWORD_MAX) return { ok: false, message: `Use at most ${PASSWORD_MAX} characters.` };
  if (/^(.)\1+$/.test(pw)) return { ok: false, message: 'Do not repeat one character.' };
  const common = ['password', '1234567890', 'qwertyuiop', 'dphoenix', 'autocare'];
  if (common.some((c) => pw.toLowerCase().includes(c))) return { ok: false, message: 'That password is too easy to guess.' };
  return { ok: true, message: 'Good password.' };
}
