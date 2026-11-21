'use client';

import { startTransition, useActionState, type ComponentProps, type FormEvent, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { AuthNotice } from './AuthNotice';
import { EjoSpinner } from './EjoSpinner';
import { buttonCls, errorCls, hintCls, labelCls } from './ui/form';

type State = { ok: boolean; message?: string; fieldErrors?: Record<string, string> } | null;

/**
 * Runs a server action from a form WITHOUT React's automatic form reset, so a
 * validation error never wipes what the person typed. Use with
 * <form onSubmit={onSubmit}> and <SubmitButton pending={pending}>.
 */
export function useFormAction(action: (prev: State, fd: FormData) => Promise<State>) {
  const [state, dispatch, pending] = useActionState(action, null);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
  return { state, pending, onSubmit, errors: state?.fieldErrors ?? {} };
}

/** A submit button that shows it is working and cannot be pressed twice. */
export function SubmitButton({ children, pendingText = 'Saving…', variant = 'primary', full = false, className = '', pending: pendingProp, ...props }: ComponentProps<'button'> & { pendingText?: string; variant?: 'primary' | 'secondary' | 'danger'; full?: boolean; pending?: boolean }) {
  const status = useFormStatus();
  const pending = Boolean(pendingProp) || status.pending;
  return (
    <button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props} className={`${buttonCls(variant, full)} ${className}`}>
      {pending ? (
        <>
          <EjoSpinner />
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** The result of a form action, shown above the form. */
export function FormResult({ state }: { state: State }) {
  if (!state?.message) return null;
  return <AuthNotice kind={state.ok ? 'success' : 'error'}>{state.message}</AuthNotice>;
}

/** A labelled field with its hint or error, wired for screen readers. Pass the control as a render function. */
export function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: (aria: { id: string; name: string; 'aria-invalid'?: true; 'aria-describedby'?: string }) => ReactNode }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      {children({ id, name: id, ...(error ? { 'aria-invalid': true as const } : {}), ...(describedBy ? { 'aria-describedby': describedBy } : {}) })}
      {error ? (
        <p id={`${id}-error`} className={errorCls}>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className={hintCls}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
