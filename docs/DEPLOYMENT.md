# Deployment

The app runs on Vercel and the database on Supabase (Pro). The live address
will be a subdomain of dphoenixautocare.com.

## 1. Supabase

1. Create the project in the region closest to Lagos that Supabase offers.
   Note the region: Vercel's functions must run in the same one.
2. From Project Settings, Database, copy two connection strings:
   - the **transaction pooler** (port 6543); add `?pgbouncer=true` → `DATABASE_URL`;
   - the **direct connection** (port 5432) → `DIRECT_URL`.
3. Daily backups are included in Pro. Point-in-time recovery is optional.

## 2. Vercel

1. Import the GitHub repository. `vercel.json` sets the build command:
   `npm run vercel-build`, which generates the Prisma client, applies
   migrations and the post-deploy SQL (production deploys only), then builds.
2. In Settings, Functions, set the function region to match Supabase.
3. Set the environment variables listed in `.env.example` for Production.
   The production build stops with a clear message if a required one is
   missing, and the previous deploy stays live.
4. Preview deployments never touch the production database
   (`scripts/db-deploy.mjs` runs only when `VERCEL_ENV=production`). Give
   previews their own database, or leave them without one.

## 3. The first Owner login

From a computer with the production `DATABASE_URL` and `DIRECT_URL`:

```bash
OWNER_EMAIL=<the Owner's work email> npm run db:seed
```

Then open the site and use "Forgot password" with that email to choose the
password. No password is ever typed into a command or stored in a file.

To apply migrations by hand to the production database (normally the Vercel
build does it), the deploy script needs an explicit flag:

```bash
npm run db:deploy -- --production
```

## 4. The subdomain

In the DNS for dphoenixautocare.com, add the record Vercel shows for the chosen
subdomain, for example:

| Type | Name | Value |
|---|---|---|
| CNAME | app | cname.vercel-dns.com |

Then set `BETTER_AUTH_URL` to `https://app.dphoenixautocare.com` and redeploy.

## 5. Rolling back

Vercel's "Instant rollback" returns to the previous build. Because database
changes are additive, the previous build runs on the newer database.
