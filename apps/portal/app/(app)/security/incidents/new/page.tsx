import { guardAnyPage } from '@/lib/authz/server';
import { reportIncidentFormAction } from '@/lib/actions/security-form-handlers';
import { SecurityNav } from '@/components/SecurityNav';
import { FormFeedbackBanner } from '@/components/FormFeedbackBanner';
import { FormPendingOverlay } from '@/components/FormPendingOverlay';
import { SubmitButton } from '@/components/SubmitButton';
import { INCIDENT_TYPES, SEVERITY_LABEL } from '@/lib/security-rules';
import { PageHeader } from '@/components/ui';
import { RefineTextButton } from '@/components/enyo/RefineTextButton';

export default async function ReportIncidentPage({ searchParams }: { searchParams: Promise<{ error?: string; related?: string }> }) {
  await guardAnyPage(['security.view'], '/security/incidents');
  const { error, related } = await searchParams;
  const input = 'w-full rounded-[var(--ejo-radius-md)] border border-[var(--ejo-border)] bg-[var(--ejo-bg)] px-3 py-2.5 text-sm text-[var(--ejo-text)]';
  const label = 'mb-1 block text-xs font-medium text-[var(--ejo-text-muted)]';
  return (
    <div className="p-4 sm:p-8">
      <PageHeader
        icon="alert"
        back={{ href: "/security/incidents", label: "Back to Incidents" }}
        title="Report an incident"
      />
      <SecurityNav active="/security/incidents" />
      {error ? <div className="mb-6 max-w-2xl"><FormFeedbackBanner kind="error" message={error} /></div> : null}
      <form action={reportIncidentFormAction} className="max-w-2xl space-y-4 rounded-[var(--ejo-radius-lg)] border border-[var(--ejo-border)] bg-[var(--ejo-surface)] p-4 sm:p-6">
        <FormPendingOverlay />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="incidents-new-type" className={label}>What happened (type)</label>
            <select id="incidents-new-type" name="type" required defaultValue="" className={input}>
              <option value="" disabled>Tap to choose…</option>
              {INCIDENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="incidents-new-severity" className={label}>How serious</label>
            <select id="incidents-new-severity" name="severity" required defaultValue="" className={input}>
              <option value="" disabled>Tap to choose…</option>
              {Object.entries(SEVERITY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}{k === 'HIGH' || k === 'CRITICAL' ? ' — Managers are told too' : ''}</option>)}
            </select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label htmlFor="incidents-new-occurredAt" className={label}>When it happened</label><input id="incidents-new-occurredAt" name="occurredAt" type="datetime-local" required className={input} /></div>
          <div><label htmlFor="incidents-new-location" className={label}>Where</label><input id="incidents-new-location" name="location" required placeholder="e.g. Main gate, workshop bay 3, car park" className={input} /></div>
        </div>
        <div><label htmlFor="incident-description" className={label}>Describe what happened</label><textarea id="incident-description" name="description" required rows={4} placeholder="Say exactly what happened, in order." className={input} /><RefineTextButton targetId="incident-description" /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label htmlFor="incidents-new-peopleInvolved" className={label}>People involved (optional)</label><input id="incidents-new-peopleInvolved" name="peopleInvolved" placeholder="Names, staff or visitors" className={input} /></div>
          <div><label htmlFor="incidents-new-vehiclePlate" className={label}>Vehicle plate (optional)</label><input id="incidents-new-vehiclePlate" name="vehiclePlate" placeholder="e.g. KJA 453 GX" className={`${input} uppercase`} /></div>
        </div>
        <div><label htmlFor="incidents-new-actionTaken" className={label}>Action already taken (optional)</label><input id="incidents-new-actionTaken" name="actionTaken" placeholder="e.g. Visitor escorted out, CSO called" className={input} /></div>
        <div><label htmlFor="incidents-new-relatedNumber" className={label}>Related record number (optional)</label><input id="incidents-new-relatedNumber" name="relatedNumber" defaultValue={related ?? ''} placeholder="A VIS, VP, EP, RT, VX, DLV or CTR number" className={`${input} uppercase`} /></div>
        <SubmitButton label="Report incident" pendingLabel="Reporting…" className="w-full rounded-[var(--ejo-radius-md)] bg-[var(--ejo-primary)] px-4 py-3 text-sm font-medium text-white hover:opacity-90 sm:w-auto" />
      </form>
    </div>
  );
}
