import { describe, expect, it } from 'vitest';
import { activeRoles, decide, isOwnerOnly, PERMISSION_KEYS, primaryRoleName, ROLE_GRANTS, ROLE_INFO, ROLE_KEYS, scopeFor, type PermissionKey, type Principal } from '@/lib/authz/catalogue';
import { grantableFor } from '@/lib/authz/grants';

const ALL_ON = { supervisorEnabled: true, technicianLoginsEnabled: true, securityGateEnabled: true };
const ALL_OFF = { supervisorEnabled: false, technicianLoginsEnabled: false, securityGateEnabled: false };
const who = (roles: Principal['roles'], extraGrants?: Principal['extraGrants']): Principal => ({ userId: 'u1', roles, extraGrants });

describe('authorisation catalogue', () => {
  it('gives the Owner every permission', () => {
    for (const k of PERMISSION_KEYS) expect(decide(who(['OWNER']), k).allowed).toBe(true);
  });

  it('never gives an Owner-only permission to another role, even as an extra grant', () => {
    const ownerOnly = PERMISSION_KEYS.filter(isOwnerOnly);
    expect(ownerOnly).toEqual(expect.arrayContaining(['settings.manage', 'audit.view', 'roles.manage', 'staff.manage']));
    for (const role of ROLE_KEYS.filter((r) => r !== 'OWNER')) {
      for (const k of ownerOnly) {
        expect(decide(who([role], { [role]: [k] }), k).allowed, `${role} ${k}`).toBe(false);
      }
    }
  });

  it('lets Front Desk see the dashboard and staff, but not manage them', () => {
    const fd = who(['FRONT_DESK']);
    expect(decide(fd, 'dashboard.view').allowed).toBe(true);
    expect(decide(fd, 'staff.view').allowed).toBe(true);
    expect(decide(fd, 'staff.manage').allowed).toBe(false);
    expect(decide(fd, 'settings.manage').allowed).toBe(false);
  });

  it('limits a technician to records assigned to him', () => {
    const t = who(['TECHNICIAN']);
    expect(scopeFor(t, 'dashboard.view')).toBe('ASSIGNED');
    expect(decide(t, 'dashboard.view', { assigneeIds: ['u1'] }).allowed).toBe(true);
    expect(decide(t, 'dashboard.view', { assigneeIds: ['someone-else'] }).allowed).toBe(false);
  });

  it('applies an extra grant the Owner added', () => {
    expect(decide(who(['SECURITY']), 'staff.view').allowed).toBe(false);
    expect(decide(who(['SECURITY'], { SECURITY: ['staff.view'] }), 'staff.view').allowed).toBe(true);
  });

  it('refuses a person with no roles, and unknown permissions', () => {
    expect(decide(who([]), 'dashboard.view').allowed).toBe(false);
    expect(decide(who(['OWNER']), 'nope.nothing' as PermissionKey).allowed).toBe(false);
  });

  it('drops optional roles while their module is off', () => {
    expect(activeRoles(['SUPERVISOR', 'TECHNICIAN', 'SECURITY', 'FRONT_DESK'], ALL_OFF)).toEqual(['FRONT_DESK']);
    expect(activeRoles(['SUPERVISOR', 'TECHNICIAN', 'SECURITY'], ALL_ON)).toEqual(['SUPERVISOR', 'TECHNICIAN', 'SECURITY']);
    expect(activeRoles(['OWNER', 'MADE_UP'], ALL_OFF)).toEqual(['OWNER']);
  });

  it('describes every role and grants something to each', () => {
    for (const r of ROLE_KEYS) expect(ROLE_INFO[r].name.length).toBeGreaterThan(0);
    for (const r of ROLE_KEYS.filter((x) => x !== 'OWNER') as Exclude<(typeof ROLE_KEYS)[number], 'OWNER'>[]) expect(Object.keys(ROLE_GRANTS[r]).length).toBeGreaterThan(0);
    expect(primaryRoleName(['FRONT_DESK', 'OWNER'])).toBe('Owner');
    expect(primaryRoleName([])).toBe('No role');
  });

  it('offers only grantable permissions to each role', () => {
    expect(grantableFor('OWNER')).toEqual([]);
    for (const r of ['FRONT_DESK', 'SUPERVISOR', 'TECHNICIAN', 'SECURITY'] as const) {
      for (const k of grantableFor(r)) {
        expect(isOwnerOnly(k)).toBe(false);
        expect(ROLE_GRANTS[r][k]).toBeUndefined();
      }
    }
  });
});
