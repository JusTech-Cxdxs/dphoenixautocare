## What this changes

## How it was checked

- [ ] `npm run lint` and `npm run typecheck`
- [ ] `npm test` (with `TEST_DATABASE_URL`)
- [ ] `npm run build` and `npm run e2e`
- [ ] Screens checked at desktop and phone width

## Baseline

- [ ] Every new server action, page and route checks permission on the server
- [ ] Database changes are additive (new migration only; `npm run db:check` passes)
- [ ] Every new table is in `tests/data-inventory.test.ts`
- [ ] Changes write a business audit entry
- [ ] No secrets, real names or real personal data
- [ ] Plain words, Naira, DD/MM/YYYY, Africa/Lagos
