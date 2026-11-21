'use client';

import { useState } from 'react';
import { Field, FormResult, SubmitButton, useFormAction } from '@/components/forms';
import { inputCls } from '@/components/ui/form';
import { ROLE_INFO, ROLE_KEYS, ROLE_MODULE, type RoleKey } from '@/lib/authz/catalogue';
import { changeRole, createStaff, giveLogin, resendInvite, setStaffActive, updateStaff } from './actions';

type Modules = Record<'supervisorEnabled' | 'technicianLoginsEnabled' | 'securityGateEnabled', boolean>;
type Details = { name: string; roleTitle: string; phone: string | null; isTechnician: boolean };

function RoleSelect({ errors, modules, defaultValue }: { errors: Record<string, string>; modules: Modules; defaultValue?: string }) {
  return (
    <Field id="role" label="Role" error={errors.role} hint="What they can do in the system.">
      {(a) => (
        <select {...a} defaultValue={defaultValue ?? 'FRONT_DESK'} className={inputCls}>
          {ROLE_KEYS.map((k: RoleKey) => {
            const flag = ROLE_MODULE[k];
            const off = flag ? !modules[flag] : false;
            return (
              <option key={k} value={k}>
                {ROLE_INFO[k].name}
                {off ? ' (module off: cannot sign in until switched on)' : ''}
              </option>
            );
          })}
        </select>
      )}
    </Field>
  );
}

function CheckCard({ name, label, description, defaultChecked, checked, onChange }: { name: string; label: string; description: string; defaultChecked?: boolean; checked?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[var(--ejo-radius-md)] border border-[var(--ejo-border)] bg-[var(--ejo-bg)] p-4 hover:border-[var(--ejo-primary)]/50">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} checked={checked} onChange={onChange ? (e) => onChange(e.target.checked) : undefined} className="mt-0.5 h-5 w-5 rounded" />
      <span>
        <span className="block text-sm font-semibold text-[var(--ejo-text)]">{label}</span>
        <span className="block text-sm text-[var(--ejo-text-muted)]">{description}</span>
      </span>
    </label>
  );
}

function DetailFields({ errors, values }: { errors: Record<string, string>; values?: Details }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="name" label="Full name" error={errors.name}>
          {(a) => <input {...a} defaultValue={values?.name} autoComplete="off" required maxLength={80} className={inputCls} />}
        </Field>
        <Field id="roleTitle" label="Job title" error={errors.roleTitle} hint='For example "Front Desk Officer" or "Senior Technician".'>
          {(a) => <input {...a} defaultValue={values?.roleTitle} required maxLength={60} className={inputCls} />}
        </Field>
        <Field id="phone" label="Phone" error={errors.phone} hint="Optional.">
          {(a) => <input {...a} type="tel" inputMode="tel" defaultValue={values?.phone ?? ''} maxLength={30} className={inputCls} />}
        </Field>
      </div>
      <CheckCard name="isTechnician" label="This person is a technician" description="Jobs can be assigned to them by name." defaultChecked={values?.isTechnician} />
    </>
  );
}

export function NewStaffForm({ modules }: { modules: Modules }) {
  const { state, pending, onSubmit, errors } = useFormAction(createStaff);
  const [login, setLogin] = useState(false);
  return (
    <form onSubmit={onSubmit} className="space-y-5" aria-label="Add staff member">
      <FormResult state={state} />
      <DetailFields errors={errors} />
      <CheckCard name="giveLogin" label="Give them a login" description="We email them a link to choose their own password." checked={login} onChange={setLogin} />
      {login ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="email" label="Work email" error={errors.email}>
            {(a) => <input {...a} type="email" inputMode="email" autoComplete="off" maxLength={160} className={inputCls} />}
          </Field>
          <RoleSelect errors={errors} modules={modules} />
        </div>
      ) : null}
      <div className="flex justify-end border-t border-[var(--ejo-border)] pt-4">
        <SubmitButton pending={pending}>Add staff member</SubmitButton>
      </div>
    </form>
  );
}

export function EditStaffForm({ id, values }: { id: string; values: Details }) {
  const { state, pending, onSubmit, errors } = useFormAction(updateStaff);
  return (
    <form onSubmit={onSubmit} className="space-y-5" aria-label="Staff details">
      <input type="hidden" name="id" value={id} />
      <FormResult state={state} />
      <DetailFields errors={errors} values={values} />
      <div className="flex justify-end">
        <SubmitButton pending={pending}>Save details</SubmitButton>
      </div>
    </form>
  );
}

export function GiveLoginForm({ id, modules }: { id: string; modules: Modules }) {
  const { state, pending, onSubmit, errors } = useFormAction(giveLogin);
  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-label="Give a login">
      <input type="hidden" name="id" value={id} />
      <FormResult state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="email" label="Work email" error={errors.email}>
          {(a) => <input {...a} type="email" inputMode="email" autoComplete="off" maxLength={160} className={inputCls} />}
        </Field>
        <RoleSelect errors={errors} modules={modules} />
      </div>
      <div className="flex justify-end">
        <SubmitButton pending={pending}>Create login and email a link</SubmitButton>
      </div>
    </form>
  );
}

export function ChangeRoleForm({ id, current, modules }: { id: string; current: string; modules: Modules }) {
  const { state, pending, onSubmit, errors } = useFormAction(changeRole);
  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-label="Change role">
      <input type="hidden" name="id" value={id} />
      <FormResult state={state} />
      <RoleSelect errors={errors} modules={modules} defaultValue={current} />
      <div className="flex justify-end">
        <SubmitButton pending={pending} variant="secondary">
          Change role
        </SubmitButton>
      </div>
    </form>
  );
}

export function ResendInviteButton({ id }: { id: string }) {
  const { state, pending, onSubmit } = useFormAction(resendInvite);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <FormResult state={state} />
      <SubmitButton pending={pending} variant="secondary" pendingText="Sending…">
        Send new link
      </SubmitButton>
    </form>
  );
}

export function ActiveToggle({ id, active, name }: { id: string; active: boolean; name: string }) {
  const { state, pending, onSubmit } = useFormAction(setStaffActive);
  return (
    <form
      onSubmit={(e) => {
        if (active && !window.confirm(`Switch ${name} off? They will be signed out and cannot sign in until switched back on.`)) {
          e.preventDefault();
          return;
        }
        onSubmit(e);
      }}
      className="space-y-3"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={active ? 'false' : 'true'} />
      <FormResult state={state} />
      <SubmitButton pending={pending} variant={active ? 'danger' : 'primary'}>
        {active ? 'Switch off' : 'Switch back on'}
      </SubmitButton>
    </form>
  );
}
