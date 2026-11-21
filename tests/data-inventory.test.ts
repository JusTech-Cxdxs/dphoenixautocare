import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROLE_INFO, ROLE_KEYS } from '@/lib/authz/catalogue';
import { SKIP_MODELS } from '@/lib/audit/journal';

/**
 * Every table must be accounted for: what it holds and whether the data
 * journal records it. A new model without an entry here fails the build,
 * so nothing unnecessary slips into the database.
 */
const INVENTORY: Record<string, { purpose: string; journaled: boolean }> = {
  User: { purpose: 'Staff logins (Better Auth)', journaled: true },
  Session: { purpose: 'Signed-in sessions (Better Auth)', journaled: false },
  Account: { purpose: 'Password hashes (Better Auth)', journaled: false },
  Verification: { purpose: 'One-time link tokens, stored hashed (Better Auth)', journaled: false },
  Role: { purpose: 'The five roles', journaled: true },
  UserRole: { purpose: 'Which role each login has', journaled: true },
  RolePermission: { purpose: 'Extra grants the Owner adds', journaled: true },
  Setting: { purpose: 'Business details, money rules, modules (one row)', journaled: true },
  Staff: { purpose: 'Everyone who works in the workshop', journaled: true },
  AuditLog: { purpose: 'Append-only history', journaled: false },
  ErrorEvent: { purpose: 'Server errors with a reference', journaled: false },
  RateLimitBucket: { purpose: 'Shared rate-limit counters', journaled: false },
};

const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8');
const models = [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1]!);

describe('data inventory', () => {
  it('lists every model, and only real models', () => {
    expect(models.sort()).toEqual(Object.keys(INVENTORY).sort());
  });

  it('agrees with the data journal about what is skipped', () => {
    for (const [model, info] of Object.entries(INVENTORY)) expect(SKIP_MODELS.has(model), model).toBe(!info.journaled);
  });

  it('maps every table to a snake_case name', () => {
    const blocks = schema.split(/^model\s+/m).slice(1);
    for (const b of blocks) expect(b, b.split(/\s/)[0]).toMatch(/@@map\("[a-z_]+"\)/);
  });

  it('seeds the same roles the code knows', () => {
    const sql = readdirSync(join(process.cwd(), 'prisma/migrations'))
      .map((d) => {
        try {
          return readFileSync(join(process.cwd(), 'prisma/migrations', d, 'migration.sql'), 'utf8');
        } catch {
          return '';
        }
      })
      .join('\n');
    for (const k of ROLE_KEYS) {
      expect(sql).toContain(`'${k}'`);
      expect(sql).toContain(`'${ROLE_INFO[k].name}'`);
      expect(sql).toContain(ROLE_INFO[k].description.replace(/'/g, "''"));
    }
  });
});
