import { decide, type PermissionKey, type Principal } from '@/lib/authz/catalogue';
import type { IconName } from '@/components/ui/Icon';

/**
 * The menu (grouped as in EJO 100: Overview, Operations, Administration).
 * Each item names the permission its page guards with, so the menu never
 * offers a page the server would refuse. Items appear phase by phase, only
 * once their page exists.
 */
export type NavItem = { key: string; name: string; href: string; icon: IconName; permission: PermissionKey; group: 'Overview' | 'Operations' | 'Administration' };

export const MENU_ITEMS: NavItem[] = [
  { key: 'dashboard', name: 'Dashboard', href: '/dashboard', icon: 'dashboard', permission: 'dashboard.view', group: 'Overview' },
  { key: 'staff', name: 'Staff and logins', href: '/staff', icon: 'users', permission: 'staff.view', group: 'Administration' },
  { key: 'roles', name: 'Roles and permissions', href: '/roles', icon: 'key', permission: 'roles.manage', group: 'Administration' },
  { key: 'audit-log', name: 'Audit log', href: '/audit-log', icon: 'history', permission: 'audit.view', group: 'Administration' },
  { key: 'settings', name: 'Settings', href: '/settings', icon: 'settings', permission: 'settings.manage', group: 'Administration' },
];

export function navigationFor(p: Principal): NavItem[] {
  return MENU_ITEMS.filter((i) => decide(p, i.permission).allowed);
}
