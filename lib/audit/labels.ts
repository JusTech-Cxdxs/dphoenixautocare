/** Plain words for audit actions. Unknown actions fall back to their code. */
const LABELS: Record<string, string> = {
  'user.signed_in': 'Signed in',
  'user.sign_in_failed': 'Failed sign-in',
  'user.password_reset_requested': 'Password reset requested',
  'user.password_set': 'Password set',
  'user.invited': 'Invitation sent',
  'user.created': 'Login created',
  'user.role_changed': 'Role changed',
  'access.denied': 'Access refused',
  'settings.updated': 'Settings changed',
  'staff.created': 'Staff added',
  'staff.updated': 'Staff details changed',
  'staff.deactivated': 'Staff switched off',
  'staff.reactivated': 'Staff switched back on',
  'roles.grants_changed': 'Permissions changed',
  'data.create': 'Record created',
  'data.createMany': 'Records created',
  'data.update': 'Record changed',
  'data.updateMany': 'Records changed',
  'data.upsert': 'Record saved',
  'data.delete': 'Record deleted',
  'data.deleteMany': 'Records deleted',
};

export function actionLabel(action: string): string {
  return LABELS[action] ?? action;
}
