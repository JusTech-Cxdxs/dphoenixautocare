/**
 * The authorisation catalogue: the one definition of what can be done, and what
 * each role may do by default. Pure (no database, no Next.js), so it is used
 * everywhere (pages, server actions, the menu) and tested directly.
 *
 * - A permission needs code that enforces it, so permissions live here, in
 *   reviewed code. The Owner can add extra grants per role (RolePermission
 *   rows), but only for permissions defined here and never Owner-only ones.
 * - The Owner holds every permission.
 * - Optional roles (Supervisor, Technician, Security) grant nothing while
 *   their module is switched off in Settings.
 * - Scope says which records: ALL, or ASSIGNED (only records the person is
 *   assigned to, e.g. a technician's own jobs).
 */

export const ROLE_KEYS = ['OWNER', 'FRONT_DESK', 'SUPERVISOR', 'TECHNICIAN', 'SECURITY'] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_INFO: Record<RoleKey, { name: string; description: string }> = {
  OWNER: { name: 'Owner', description: 'The MD/CEO. Sees everything, approves everything, and is the only one who sees job profit and cost prices.' },
  FRONT_DESK: { name: 'Front Desk', description: 'The daily user. Receives vehicles, books appointments, opens job cards, writes estimates and invoices, and records payments.' },
  SUPERVISOR: { name: 'Supervisor', description: 'Quality-checks a job before it is ready for pickup. Optional: switch on in Settings.' },
  TECHNICIAN: { name: 'Technician', description: 'Sees only their own jobs, marks them started or done, and adds notes and photos. Optional: switch on in Settings.' },
  SECURITY: { name: 'Security', description: 'Runs the gate: vehicles in, vehicles out and gate passes. Optional: switch on in Settings.' },
};

export type Scope = 'ALL' | 'ASSIGNED';
const RANK: Record<Scope, number> = { ASSIGNED: 1, ALL: 2 };

type PermissionInfo = { group: string; label: string; ownerOnly?: boolean };

export const PERMISSIONS = {
  'dashboard.view': { group: 'General', label: 'See the dashboard' },
  'staff.view': { group: 'People', label: 'See staff and technicians' },
  'staff.manage': { group: 'People', label: 'Add staff, give logins and roles, and switch accounts off', ownerOnly: true },
  'roles.manage': { group: 'People', label: 'Change what each role may do', ownerOnly: true },
  'settings.manage': { group: 'Administration', label: 'Change business details, money rules and optional modules', ownerOnly: true },
  'audit.view': { group: 'Administration', label: 'See the audit log', ownerOnly: true },
} as const satisfies Record<string, PermissionInfo>;

export type PermissionKey = keyof typeof PERMISSIONS;
export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as PermissionKey[];

export function isPermissionKey(value: string): value is PermissionKey {
  return Object.prototype.hasOwnProperty.call(PERMISSIONS, value);
}

export function isOwnerOnly(key: PermissionKey): boolean {
  return Boolean((PERMISSIONS[key] as PermissionInfo).ownerOnly);
}

/** Default grants per role. The Owner is not listed: the Owner holds everything. */
export const ROLE_GRANTS: Record<Exclude<RoleKey, 'OWNER'>, Partial<Record<PermissionKey, Scope>>> = {
  FRONT_DESK: { 'dashboard.view': 'ALL', 'staff.view': 'ALL' },
  SUPERVISOR: { 'dashboard.view': 'ALL', 'staff.view': 'ALL' },
  TECHNICIAN: { 'dashboard.view': 'ASSIGNED' },
  SECURITY: { 'dashboard.view': 'ALL' },
};

/** Optional roles and the Settings switch that turns each one on. */
export const ROLE_MODULE: Partial<Record<RoleKey, 'supervisorEnabled' | 'technicianLoginsEnabled' | 'securityGateEnabled'>> = {
  SUPERVISOR: 'supervisorEnabled',
  TECHNICIAN: 'technicianLoginsEnabled',
  SECURITY: 'securityGateEnabled',
};

export type ModuleSwitches = { supervisorEnabled: boolean; technicianLoginsEnabled: boolean; securityGateEnabled: boolean };

/** The roles that count right now: optional roles drop out while their module is off. */
export function activeRoles(roles: readonly string[], modules: ModuleSwitches): RoleKey[] {
  const out: RoleKey[] = [];
  for (const r of roles) {
    if (!(ROLE_KEYS as readonly string[]).includes(r)) continue;
    const key = r as RoleKey;
    const flag = ROLE_MODULE[key];
    if (flag && !modules[flag]) continue;
    if (!out.includes(key)) out.push(key);
  }
  return out;
}

export type Principal = {
  userId: string;
  /** Active roles only (see activeRoles). */
  roles: RoleKey[];
  /** Extra grants from RolePermission rows, per role key. */
  extraGrants?: Partial<Record<RoleKey, readonly string[]>>;
};

export type RecordContext = { assigneeIds?: readonly (string | null | undefined)[] };
export type Decision = { allowed: boolean; scope: Scope | null; reason: string };

export function isOwner(p: Principal): boolean {
  return p.roles.includes('OWNER');
}

/** The widest scope this person holds for a permission, or null. */
export function scopeFor(p: Principal, key: PermissionKey): Scope | null {
  if (isOwner(p)) return 'ALL';
  if (isOwnerOnly(key)) return null;
  let best: Scope | null = null;
  const consider = (s?: Scope) => {
    if (s && (!best || RANK[s] > RANK[best])) best = s;
  };
  for (const role of p.roles) {
    if (role === 'OWNER') continue;
    consider(ROLE_GRANTS[role][key]);
    if (p.extraGrants?.[role]?.includes(key)) consider('ALL');
  }
  return best;
}

/** Allow or deny, with the reason. The single rule used everywhere. */
export function decide(p: Principal, key: PermissionKey, record?: RecordContext): Decision {
  if (!isPermissionKey(key)) return { allowed: false, scope: null, reason: `Unknown permission ${String(key)}` };
  const scope = scopeFor(p, key);
  if (!scope) return { allowed: false, scope: null, reason: 'No role grants this permission' };
  if (scope === 'ALL' || !record) return { allowed: true, scope, reason: 'Granted' };
  const assigned = (record.assigneeIds ?? []).includes(p.userId);
  return assigned ? { allowed: true, scope, reason: 'Assigned to you' } : { allowed: false, scope, reason: 'Not assigned to you' };
}

/** The role name to show beside a person (the most senior active role). */
export function primaryRoleName(roles: readonly RoleKey[]): string {
  const first = ROLE_KEYS.find((r) => roles.includes(r));
  return first ? ROLE_INFO[first].name : 'No role';
}
