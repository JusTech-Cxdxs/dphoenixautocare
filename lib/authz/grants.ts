import { isOwnerOnly, PERMISSION_KEYS, ROLE_GRANTS, type PermissionKey, type RoleKey } from './catalogue';

/** Permissions the Owner may add to a role: not Owner-only, and not already a default of that role. */
export function grantableFor(role: RoleKey): PermissionKey[] {
  if (role === 'OWNER') return [];
  return PERMISSION_KEYS.filter((k) => !isOwnerOnly(k) && !ROLE_GRANTS[role][k]);
}
