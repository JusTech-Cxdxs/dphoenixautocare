import { cookies } from 'next/headers';
import { AppShell } from '@/components/AppShell';
import { SIDEBAR_COOKIE } from '@/lib/ui-prefs';
import { requireUser } from '@/lib/auth/session';
import { getPrincipal } from '@/lib/authz/server';
import { decide, primaryRoleName } from '@/lib/authz/catalogue';
import { navigationFor } from '@/lib/navigation';

/** Every signed-in staff page. The session is checked on the server on every request. */
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const [user, principal, jar] = await Promise.all([requireUser(), getPrincipal(), cookies()]);
  return (
    <AppShell
      items={navigationFor(principal)}
      userName={user.name}
      roleName={primaryRoleName(principal.roles)}
      canSearch={decide(principal, 'staff.view').allowed}
      initialCollapsed={jar.get(SIDEBAR_COOKIE)?.value === 'collapsed'}
    >
      {children}
    </AppShell>
  );
}
