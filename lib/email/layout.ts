import { appUrl } from '@/lib/env';

/**
 * The branded email shell: navy header with the logo, white card, orange
 * button, business details and "Powered by EJO · JusTech" in the footer.
 * Tables and inline styles only, so it renders in Gmail, Outlook and phones.
 */

export type Business = { displayName: string; tagline: string; phones: string[]; email: string; address: string; website: string };

const NAVY = '#0A1628';
const ORANGE = '#F09E2C';
const GOLD = '#D6890B';
const TEXT = '#364153';
const MUTED = '#6A7282';

/** Escape text for HTML. Every value placed in an email goes through this. */
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type EmailContent = {
  previewText: string;
  heading: string;
  /** Paragraphs of plain text (escaped here). */
  paragraphs: string[];
  button?: { label: string; url: string };
  /** Shown small under the button, e.g. how long a link lasts. */
  note?: string;
};

export function renderEmail(business: Business, c: EmailContent): { html: string; text: string } {
  const logo = `${appUrl()}/brand/logo.png`;
  const paras = c.paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${TEXT}">${esc(p)}</p>`).join('');
  const button = c.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 8px"><tr><td style="background:${ORANGE};border-radius:12px"><a href="${esc(c.button.url)}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:${NAVY};text-decoration:none">${esc(c.button.label)}</a></td></tr></table>
       <p style="margin:12px 0 0;font-size:12px;line-height:1.5;color:${MUTED}">If the button does not work, copy this link into your browser:<br><span style="word-break:break-all">${esc(c.button.url)}</span></p>`
    : '';
  const note = c.note ? `<p style="margin:14px 0 0;font-size:13px;color:${MUTED}">${esc(c.note)}</p>` : '';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.heading)}</title></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,Helvetica,sans-serif">
<span style="display:none;max-height:0;overflow:hidden">${esc(c.previewText)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:12px;overflow:hidden">
<tr><td style="background:${NAVY};padding:20px 28px;border-bottom:3px solid ${GOLD}">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle"><img src="${esc(logo)}" width="48" height="48" alt="${esc(business.displayName)} logo" style="display:block;border:0"></td>
<td style="vertical-align:middle;padding-left:12px"><div style="font-size:18px;font-weight:700;color:#FFFFFF">${esc(business.displayName)}</div><div style="font-size:12px;color:${ORANGE}">${esc(business.tagline)}</div></td>
</tr></table></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:21px;line-height:1.3;color:${NAVY}">${esc(c.heading)}</h1>
${paras}${button}${note}
</td></tr>
<tr><td style="padding:18px 28px;background:#F9FAFB;border-top:1px solid #E5E7EB;font-size:12px;line-height:1.6;color:${MUTED}">
${esc(business.address)}<br>${business.phones.map(esc).join(' · ')} · ${esc(business.email)}<br>
<a href="${esc(business.website)}" style="color:${MUTED}">${esc(business.website.replace(/^https?:\/\//, ''))}</a><br>
<span style="color:#99A1AF">Powered by EJO · JusTech</span>
</td></tr></table></td></tr></table></body></html>`;
  const text = [
    business.displayName,
    '',
    c.heading,
    '',
    ...c.paragraphs.flatMap((p) => [p, '']),
    ...(c.button ? [`${c.button.label}: ${c.button.url}`, ''] : []),
    ...(c.note ? [c.note, ''] : []),
    '--',
    business.address,
    business.phones.join(' · '),
    business.email,
    'Powered by EJO · JusTech',
  ].join('\n');
  return { html, text };
}
