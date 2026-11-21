/**
 * Errors whose message is safe to show to the person. Anything else is logged
 * with a reference and shown as a general message (lib/actions.ts).
 */
export class UserError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'UserError';
  }
}

export class ForbiddenError extends UserError {
  constructor(message = 'You do not have permission to do this.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}
