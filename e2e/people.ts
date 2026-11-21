import type { RoleKey } from '../lib/authz/catalogue';

/** One test login per role. Names are role names only; emails use example.com. */
export const PEOPLE: Record<RoleKey, { email: string; name: string; title: string }> = {
  OWNER: { email: 'owner@example.com', name: 'Owner', title: 'MD/CEO' },
  FRONT_DESK: { email: 'front.desk@example.com', name: 'Front Desk', title: 'Front Desk Officer' },
  SUPERVISOR: { email: 'supervisor@example.com', name: 'Supervisor', title: 'Workshop Supervisor' },
  TECHNICIAN: { email: 'technician@example.com', name: 'Technician', title: 'Technician' },
  SECURITY: { email: 'security@example.com', name: 'Security', title: 'Gate Security' },
};

/** A spare Front Desk login whose password the forgot-password test changes. */
export const RESET_PERSON = { email: 'reset.me@example.com', name: 'Reset Test', title: 'Front Desk Officer' };

export function e2ePassword(): string {
  const p = process.env.E2E_PASSWORD;
  if (!p || p.length < 10) throw new Error('Set E2E_PASSWORD (10+ characters) for the end-to-end test logins.');
  return p;
}
