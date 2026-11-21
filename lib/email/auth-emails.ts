import { renderEmail, type Business } from './layout';

/** Sign-in related emails. Plain words, one clear button each. */

export function passwordResetEmail(b: Business, name: string, url: string) {
  return {
    subject: `Reset your ${b.displayName} password`,
    ...renderEmail(b, {
      previewText: 'Use this link within one hour to choose a new password.',
      heading: 'Reset your password',
      paragraphs: [`Hello ${name},`, 'We received a request to reset the password for your account. Click the button below to choose a new one.'],
      button: { label: 'Choose a new password', url },
      note: 'This link works once and expires in one hour. If you did not ask for it, you can ignore this email: your password stays the same.',
    }),
  };
}

export function invitationEmail(b: Business, name: string, url: string, invitedBy: string) {
  return {
    subject: `Your ${b.displayName} account is ready`,
    ...renderEmail(b, {
      previewText: 'Choose your password to start using the workshop system.',
      heading: `Welcome, ${name}`,
      paragraphs: [`${invitedBy} has given you access to the ${b.displayName} workshop system.`, 'Click the button below to choose your password. You will then sign in with this email address.'],
      button: { label: 'Choose my password', url },
      note: 'This link works once and expires in 72 hours. If it expires, ask the Owner to send a new one.',
    }),
  };
}

export function passwordChangedEmail(b: Business, name: string, signInUrl: string) {
  return {
    subject: `Your ${b.displayName} password was changed`,
    ...renderEmail(b, {
      previewText: 'If this was not you, reset your password now.',
      heading: 'Your password was changed',
      paragraphs: [`Hello ${name},`, 'The password for your account was just set or changed, and you were signed out on every device.', 'If this was you, there is nothing to do. If it was not, use "Forgot password" on the sign-in page now and tell the Owner.'],
      button: { label: 'Go to sign in', url: signInUrl },
    }),
  };
}

export function verifyEmailEmail(b: Business, name: string, url: string) {
  return {
    subject: `Confirm your email for ${b.displayName}`,
    ...renderEmail(b, {
      previewText: 'Confirm this address to finish setting up your account.',
      heading: 'Confirm your email address',
      paragraphs: [`Hello ${name},`, 'Please confirm this email address to finish setting up your account.'],
      button: { label: 'Confirm my email', url },
      note: 'If you did not expect this email, you can ignore it.',
    }),
  };
}
