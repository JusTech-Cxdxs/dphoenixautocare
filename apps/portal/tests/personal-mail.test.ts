/** Mail sent from the portal goes out in the organisation's letterhead (lib/email-templates/personal-mail.ts). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPersonalMail, splitQuoted } from '../lib/email-templates/personal-mail';

const base = {
  subject: 'Quotation for <b>fleet</b> service',
  companyName: 'Lagos Fleet Services',
  logoUrl: 'https://portal.example.com/images/logo/email-logo.png',
  sender: { name: 'Ada <Okafor>', department: 'Workshop', branch: 'Ajah Branch', phone: '0803 123 4567', email: 'ada@fleet.example' },
  branchContact: { address: '12 Ajah Road, Lagos', phones: ['0800 000 0000'], email: 'ajah@fleet.example' },
};

test('the letterhead carries the organisation, the sender and the label; what was typed is escaped', () => {
  const out = renderPersonalMail({ ...base, style: 'urgent', body: 'Hello <script>alert(1)</script>,\n\nPlease see https://fleet.example/q?id=1 and write to fleet@fleet.example.\nThanks' });
  assert.doesNotMatch(out, /<script>alert/);
  assert.match(out, /&lt;script&gt;/);
  assert.match(out, /Lagos Fleet/);
  assert.match(out, /Urgent/);
  assert.match(out, /Ajah Branch/);
  assert.match(out, /Ada &lt;Okafor&gt;/);
  assert.match(out, /href="https:\/\/fleet\.example\/q\?id=1"/);
  assert.match(out, /href="mailto:fleet@fleet\.example"/);
  assert.match(out, /Quotation for &lt;b&gt;fleet&lt;\/b&gt; service/);
  assert.match(out, /0803 123 4567/);
  for (const style of ['standard', 'action', 'info'] as const) assert.match(renderPersonalMail({ ...base, style, body: 'Hi' }), /<html/i);
});

test('a reply keeps the quoted original, set apart under the signature', () => {
  const body = 'Thanks, confirmed.\n\nOn 12 October 2026 at 2:05 pm, Tunde <t@x.example> wrote:\n> Can you confirm?\n> Regards';
  const { own, quoted } = splitQuoted(body);
  assert.equal(own, 'Thanks, confirmed.');
  assert.match(quoted, /^On 12 October/);
  const out = renderPersonalMail({ ...base, style: 'standard', body });
  assert.ok(out.indexOf('Thanks, confirmed.') < out.indexOf('Can you confirm?'));
  assert.ok(out.indexOf('ada@fleet.example') < out.indexOf('Can you confirm?'));
  assert.deepEqual(splitQuoted('No quote here.'), { own: 'No quote here.', quoted: '' });
  assert.match(splitQuoted('Fyi\n\n---------- Forwarded message ----------\nFrom: x').quoted, /^-{10} Forwarded/);
});
