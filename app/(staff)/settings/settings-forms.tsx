'use client';

import { useState, type ReactNode } from 'react';
import { Field, FormResult, SubmitButton, useFormAction } from '@/components/forms';
import { SectionCard } from '@/components/ui/Cards';
import type { IconName } from '@/components/ui/Icon';
import { inputCls } from '@/components/ui/form';
import { saveSettings } from './actions';

export type SettingsValues = {
  businessName: string;
  displayName: string;
  tagline: string;
  phone1: string;
  phone2: string;
  email: string;
  address: string;
  openingHours: string;
  website: string;
  vatEnabled: boolean;
  vatRatePercent: number;
  discountLimitPercent: number;
  estimateNeedsOwner: boolean;
  depositPercent: number | null;
  jobCardPrefix: string;
  invoicePrefix: string;
  receiptPrefix: string;
  supervisorEnabled: boolean;
  technicianLoginsEnabled: boolean;
  securityGateEnabled: boolean;
  appointmentsEnabled: boolean;
  supportEnabled: boolean;
  enyoEnabled: boolean;
  serviceIntervalKm: number;
  serviceIntervalMonths: number;
  dueSoonKm: number;
  dueSoonDays: number;
};

function Section({ section, icon, title, description, children }: { section: string; icon: IconName; title: string; description: string; children: (errors: Record<string, string>) => ReactNode }) {
  const { state, pending, onSubmit, errors } = useFormAction(saveSettings);
  return (
    <div id={section} className="scroll-mt-6">
      <SectionCard icon={icon} title={title} description={description}>
        <form onSubmit={onSubmit} className="space-y-5" aria-label={title}>
          <input type="hidden" name="section" value={section} />
          <FormResult state={state} />
          {children(errors)}
          <div className="flex justify-end border-t border-[var(--ejo-border)] pt-4">
            <SubmitButton pending={pending}>Save {title.toLowerCase()}</SubmitButton>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}

function Text({ name, label, defaultValue, errors, hint, type = 'text', inputMode, step }: { name: string; label: string; defaultValue: string | number; errors: Record<string, string>; hint?: string; type?: string; inputMode?: 'numeric' | 'decimal' | 'email' | 'tel' | 'url'; step?: string }) {
  return (
    <Field id={name} label={label} hint={hint} error={errors[name]}>
      {(a) => <input {...a} type={type} inputMode={inputMode} step={step} defaultValue={defaultValue} className={inputCls} />}
    </Field>
  );
}

/** An on/off switch (a real checkbox underneath, so it works with the keyboard and screen readers). */
function Toggle({ name, label, description, defaultChecked, onChange }: { name: string; label: string; description: string; defaultChecked: boolean; onChange?: (on: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-[var(--ejo-radius-md)] border border-[var(--ejo-border)] bg-[var(--ejo-bg)] p-4 transition-colors hover:border-[var(--ejo-primary)]/50">
      <span>
        <span className="block text-sm font-semibold text-[var(--ejo-text)]">{label}</span>
        <span className="mt-0.5 block text-sm text-[var(--ejo-text-muted)]">{description}</span>
      </span>
      <input type="checkbox" role="switch" name={name} defaultChecked={defaultChecked} onChange={(e) => onChange?.(e.target.checked)} className="peer sr-only" />
      <span aria-hidden="true" className="relative mt-0.5 h-7 w-12 shrink-0 rounded-full bg-[var(--ejo-border)] transition-colors after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-[var(--ejo-primary)] peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ejo-primary)]" />
    </label>
  );
}

export function SettingsForms({ values: v }: { values: SettingsValues }) {
  const [deposit, setDeposit] = useState(v.depositPercent !== null);
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Section section="business" icon="building" title="Business details" description="Printed on estimates, invoices, receipts and every email.">
        {(e) => (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Text name="businessName" label="Registered name" defaultValue={v.businessName} errors={e} />
            </div>
            <Text name="displayName" label="Name on screen" defaultValue={v.displayName} errors={e} />
            <Text name="tagline" label="Tagline" defaultValue={v.tagline} errors={e} />
            <Text name="phone1" label="Main phone" type="tel" inputMode="tel" defaultValue={v.phone1} errors={e} />
            <Text name="phone2" label="Second phone" type="tel" inputMode="tel" defaultValue={v.phone2} errors={e} hint="Optional." />
            <Text name="email" label="Email" type="email" inputMode="email" defaultValue={v.email} errors={e} />
            <Text name="website" label="Website" type="url" inputMode="url" defaultValue={v.website} errors={e} />
            <div className="sm:col-span-2">
              <Text name="address" label="Address" defaultValue={v.address} errors={e} />
            </div>
            <div className="sm:col-span-2">
              <Text name="openingHours" label="Opening hours" defaultValue={v.openingHours} errors={e} />
            </div>
          </div>
        )}
      </Section>

      <Section section="money" icon="percent" title="Money rules" description="VAT, discounts that need your approval, and deposits.">
        {(e) => (
          <div className="space-y-4">
            <Toggle name="vatEnabled" label="Charge VAT" description="Adds VAT to estimates and invoices." defaultChecked={v.vatEnabled} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Text name="vatRatePercent" label="VAT rate (%)" type="number" step="0.01" inputMode="decimal" defaultValue={v.vatRatePercent} errors={e} />
              <Text name="discountLimitPercent" label="Discount limit (%)" type="number" step="0.01" inputMode="decimal" defaultValue={v.discountLimitPercent} errors={e} hint="Bigger discounts need the Owner's approval." />
            </div>
            <Toggle name="estimateNeedsOwner" label="Owner approves every estimate" description="Estimates come to you before the customer sees them." defaultChecked={v.estimateNeedsOwner} />
            <Toggle name="depositRequired" label="Require deposit before work" description="Individual customers only. Never for organisations on credit." defaultChecked={deposit} onChange={setDeposit} />
            {deposit ? <Text name="depositPercent" label="Deposit (% of the approved estimate)" type="number" step="1" inputMode="numeric" defaultValue={v.depositPercent ?? 50} errors={e} hint="Between 1 and 100." /> : null}
          </div>
        )}
      </Section>

      <Section section="modules" icon="sliders" title="Optional modules" description="Switch a step off and the workflow skips it, so nothing gets stuck.">
        {() => (
          <div className="space-y-3">
            <Toggle name="supervisorEnabled" label="Supervisor quality check" description="A supervisor checks each job before it is ready for pickup." defaultChecked={v.supervisorEnabled} />
            <Toggle name="technicianLoginsEnabled" label="Technician logins" description="Technicians sign in to see and update their own jobs." defaultChecked={v.technicianLoginsEnabled} />
            <Toggle name="securityGateEnabled" label="Gate and security" description="Vehicles in and out at the gate, with gate passes." defaultChecked={v.securityGateEnabled} />
            <Toggle name="appointmentsEnabled" label="Appointments" description="Bookings from the front desk and the customer portal." defaultChecked={v.appointmentsEnabled} />
            <Toggle name="supportEnabled" label="Customer support" description="Support requests from customers, with replies by email." defaultChecked={v.supportEnabled} />
            <Toggle name="enyoEnabled" label="Enyo (AI assistant)" description="Ask questions about your own data. Needs the AI key to be set up." defaultChecked={v.enyoEnabled} />
          </div>
        )}
      </Section>

      <div className="space-y-6">
        <Section section="numbers" icon="file" title="Document numbers" description="Prefixes for new documents, e.g. DPA-JC-000001.">
          {(e) => (
            <div className="grid gap-4 sm:grid-cols-3">
              <Text name="jobCardPrefix" label="Job cards" defaultValue={v.jobCardPrefix} errors={e} />
              <Text name="invoicePrefix" label="Invoices" defaultValue={v.invoicePrefix} errors={e} />
              <Text name="receiptPrefix" label="Receipts" defaultValue={v.receiptPrefix} errors={e} />
            </div>
          )}
        </Section>

        <Section section="service" icon="clock" title="Service reminders" description="Defaults for vehicles without their own interval, and when a service counts as due soon.">
          {(e) => (
            <div className="grid gap-4 sm:grid-cols-2">
              <Text name="serviceIntervalKm" label="Service every (km)" type="number" inputMode="numeric" defaultValue={v.serviceIntervalKm} errors={e} />
              <Text name="serviceIntervalMonths" label="Or every (months)" type="number" inputMode="numeric" defaultValue={v.serviceIntervalMonths} errors={e} />
              <Text name="dueSoonKm" label="Due soon within (km)" type="number" inputMode="numeric" defaultValue={v.dueSoonKm} errors={e} />
              <Text name="dueSoonDays" label="Due soon within (days)" type="number" inputMode="numeric" defaultValue={v.dueSoonDays} errors={e} />
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
