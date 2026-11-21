'use client';

import { Fragment } from 'react';
import { Icon } from '@/components/ui/Icon';
import { StatusChip } from '@/components/ui/StatusChip';
import { FormResult, SubmitButton, useFormAction } from '@/components/forms';
import { saveExtraGrants } from './actions';

export type Cell = { state: 'default' | 'own' | 'never' } | { state: 'grantable'; checked: boolean };
type Column = { key: string; name: string; description: string; off: boolean; people: number };
type Row = { key: string; label: string; group: string; ownerOnly: boolean; cells: Cell[] };

export function GrantsForm({ columns, rows }: { columns: Column[]; rows: Row[] }) {
  const { state, pending, onSubmit } = useFormAction(saveExtraGrants);
  const groups = [...new Set(rows.map((r) => r.group))];
  return (
    <form onSubmit={onSubmit}>
      {state?.message ? (
        <div className="px-4 pt-4 sm:px-5">
          <FormResult state={state} />
        </div>
      ) : null}
      <div className="ejo-scroll-x">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Permissions by role</caption>
          <thead>
            <tr className="border-b border-[var(--ejo-border)]">
              <th scope="col" className="px-4 py-3 text-left sm:px-5">Permission</th>
              {columns.map((c) => (
                <th key={c.key} scope="col" className="px-3 py-3 text-center" title={c.description}>
                  <span className="block text-[var(--ejo-text)]">{c.name}</span>
                  <span className="block font-normal normal-case tracking-normal">{c.people === 1 ? '1 person' : `${c.people} people`}</span>
                  {c.off ? <span className="mt-1 inline-block normal-case tracking-normal"><StatusChip>Module off</StatusChip></span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g}>
                <tr>
                  <th colSpan={columns.length + 1} scope="colgroup" className="px-4 pb-1 pt-4 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ejo-text-muted)] sm:px-5">
                    {g}
                  </th>
                </tr>
                {rows
                  .filter((r) => r.group === g)
                  .map((r) => (
                    <tr key={r.key} className="border-b border-[var(--ejo-border)]">
                      <th scope="row" className="px-4 py-3 text-left font-medium text-[var(--ejo-text)] sm:px-5">
                        {r.label}
                        {r.ownerOnly ? <span className="ml-2 text-xs font-normal text-[var(--ejo-text-muted)]">(Owner only)</span> : null}
                      </th>
                      {r.cells.map((cell, i) => {
                        const col = columns[i]!;
                        return (
                          <td key={col.key} className="px-3 py-3 text-center">
                            {cell.state === 'default' ? (
                              <span className="inline-flex text-[var(--ejo-success)]"><Icon name="check" size={20} strokeWidth={2.4} title={`${col.name}: yes`} /></span>
                            ) : cell.state === 'own' ? (
                              <span className="text-xs font-semibold text-[var(--ejo-text)]" title={`${col.name}: only their own`}>Own only</span>
                            ) : cell.state === 'grantable' ? (
                              <input type="checkbox" name="grant" value={`${col.key}:${r.key}`} defaultChecked={cell.checked} aria-label={`${col.name}: ${r.label}`} className="h-5 w-5 rounded" />
                            ) : (
                              <span className="text-[var(--ejo-text-muted)]" title={`${col.name}: no`}>–<span className="sr-only">{`${col.name}: no`}</span></span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end px-4 py-4 sm:px-5">
        <SubmitButton pending={pending}>Save permissions</SubmitButton>
      </div>
    </form>
  );
}
