'use client';
import { createAuthClient } from 'better-auth/react';

/** Browser side of staff sign-in. Same origin, so no base URL is needed. */
export const authClient = createAuthClient();
