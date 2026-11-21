/**
 * Load test (no k6): staged virtual users against a running build, reporting
 * p50 / p95 / p99 latency, throughput and errors per stage and per route.
 *
 *   BASE_URL=http://localhost:3100 LOAD_EMAIL=… LOAD_PASSWORD=… npm run load
 *
 * Options (environment):
 *   LOAD_PROFILE   quick (about 1 minute, CI) or full (about 4 minutes)
 *   LOAD_P95_MS    page latency budget per stage, default 1500
 *   LOAD_STRICT=1  also fail when a stage is over the latency budget
 *   FAILOVER_KILL_PID / FAILOVER_AT_MS  kill one app instance mid-run (failover test)
 *   LOAD_REPORT    where to write the JSON summary (default load-report.json)
 *
 * Errors (non-2xx/3xx or network failures) above 1% always fail the run.
 */
import { writeFileSync } from 'node:fs';

const BASE = (process.env.BASE_URL || 'http://localhost:3100').replace(/\/$/, '');
const EMAIL = process.env.LOAD_EMAIL;
const PASSWORD = process.env.LOAD_PASSWORD;
const P95_BUDGET = Number(process.env.LOAD_P95_MS || 1500);
const STRICT = process.env.LOAD_STRICT === '1';
const PROFILE = process.env.LOAD_PROFILE === 'full' ? 'full' : 'quick';

type Stage = { name: string; users: number; seconds: number };
const STAGES: Record<'quick' | 'full', Stage[]> = {
  quick: [
    { name: 'smoke', users: 1, seconds: 5 },
    { name: 'baseline', users: 10, seconds: 15 },
    { name: 'ramp', users: 40, seconds: 15 },
    { name: 'spike', users: 80, seconds: 10 },
    { name: 'recovery', users: 5, seconds: 10 },
  ],
  full: [
    { name: 'smoke', users: 1, seconds: 15 },
    { name: 'baseline', users: 10, seconds: 45 },
    { name: 'ramp', users: 50, seconds: 45 },
    { name: 'spike', users: 120, seconds: 30 },
    { name: 'soak', users: 25, seconds: 90 },
    { name: 'recovery', users: 5, seconds: 20 },
  ],
};

/** What a busy workshop does: open pages poll the pulse, people move between screens. */
const MIX: { route: string; weight: number; signedIn: boolean }[] = [
  { route: '/api/live/pulse', weight: 40, signedIn: true },
  { route: '/dashboard', weight: 20, signedIn: true },
  { route: '/staff', weight: 10, signedIn: true },
  { route: '/audit-log', weight: 10, signedIn: true },
  { route: '/settings', weight: 5, signedIn: true },
  { route: '/api/health', weight: 10, signedIn: false },
  { route: '/login', weight: 5, signedIn: false },
];
const TOTAL = MIX.reduce((n, m) => n + m.weight, 0);
const pickRoute = () => {
  let r = Math.random() * TOTAL;
  for (const m of MIX) if ((r -= m.weight) < 0) return m;
  return MIX[0]!;
};

type Sample = { stage: string; route: string; ms: number; ok: boolean; status: number };
const samples: Sample[] = [];

async function signIn(): Promise<string> {
  if (!EMAIL || !PASSWORD) throw new Error('Set LOAD_EMAIL and LOAD_PASSWORD (a test login on a test database).');
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) });
  const cookies = res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  if (!res.ok || !cookies) throw new Error(`Sign-in for the load test failed: ${res.status} ${await res.text()}`);
  return cookies;
}

async function hit(stage: string, cookie: string) {
  const m = pickRoute();
  const t0 = performance.now();
  let status = 0;
  try {
    const res = await fetch(`${BASE}${m.route}`, { headers: m.signedIn ? { cookie } : {}, redirect: 'manual', signal: AbortSignal.timeout(15_000) });
    status = res.status;
    await res.arrayBuffer();
  } catch {
    status = 0;
  }
  samples.push({ stage, route: m.route, ms: performance.now() - t0, ok: status >= 200 && status < 400, status });
}

async function runStage(stage: Stage, cookie: string) {
  const until = Date.now() + stage.seconds * 1000;
  const user = async () => {
    while (Date.now() < until) {
      await hit(stage.name, cookie);
      await new Promise((r) => setTimeout(r, 100 + Math.random() * 400)); // think time
    }
  };
  await Promise.all(Array.from({ length: stage.users }, user));
}

function pct(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]!;
}

function summarise(list: Sample[], seconds: number) {
  const ms = list.map((s) => s.ms).sort((a, b) => a - b);
  const errors = list.filter((s) => !s.ok).length;
  return { requests: list.length, rps: +(list.length / Math.max(1, seconds)).toFixed(1), p50: Math.round(pct(ms, 50)), p95: Math.round(pct(ms, 95)), p99: Math.round(pct(ms, 99)), errorRate: list.length ? +((errors / list.length) * 100).toFixed(2) : 0, errors };
}

async function main() {
  const cookie = await signIn();
  const killPid = Number(process.env.FAILOVER_KILL_PID || 0);
  if (killPid) {
    const at = Number(process.env.FAILOVER_AT_MS || 10_000);
    setTimeout(() => {
      console.log(`[load] killing app instance ${killPid} (failover test)`);
      try {
        process.kill(killPid, 'SIGKILL');
      } catch (e) {
        console.error('[load] could not kill', killPid, e);
      }
    }, at);
  }
  const stages = STAGES[PROFILE];
  console.log(`[load] ${PROFILE} profile against ${BASE}`);
  for (const s of stages) {
    process.stdout.write(`[load] ${s.name}: ${s.users} users for ${s.seconds}s… `);
    await runStage(s, cookie);
    const r = summarise(samples.filter((x) => x.stage === s.name), s.seconds);
    console.log(`p95 ${r.p95} ms, ${r.rps} req/s, errors ${r.errorRate}%`);
  }
  const byStage = Object.fromEntries(stages.map((s) => [s.name, summarise(samples.filter((x) => x.stage === s.name), s.seconds)]));
  const totalSeconds = stages.reduce((n, s) => n + s.seconds, 0);
  const byRoute = Object.fromEntries(MIX.map((m) => [m.route, summarise(samples.filter((x) => x.route === m.route), totalSeconds)]));
  const overall = summarise(samples, totalSeconds);
  const statuses = samples.reduce<Record<string, number>>((acc, s) => ((acc[s.status] = (acc[s.status] ?? 0) + 1), acc), {});
  const report = { base: BASE, profile: PROFILE, at: new Date().toISOString(), overall, byStage, byRoute, statuses, budgetP95Ms: P95_BUDGET };
  writeFileSync(process.env.LOAD_REPORT || 'load-report.json', JSON.stringify(report, null, 2));

  console.log('\nRoute                     requests   p50   p95   p99  errors');
  for (const [route, r] of Object.entries(byRoute)) console.log(`${route.padEnd(24)} ${String(r.requests).padStart(9)} ${String(r.p50).padStart(5)} ${String(r.p95).padStart(5)} ${String(r.p99).padStart(5)} ${String(r.errorRate).padStart(6)}%`);
  console.log(`\nOverall: ${overall.requests} requests, ${overall.rps} req/s, p95 ${overall.p95} ms, errors ${overall.errorRate}%  statuses ${JSON.stringify(statuses)}`);

  const slow = Object.entries(byStage).filter(([, r]) => r.p95 > P95_BUDGET);
  for (const [name, r] of slow) console.log(`[load] ${STRICT ? 'FAIL' : 'warning'}: ${name} p95 ${r.p95} ms is over the ${P95_BUDGET} ms budget`);
  if (overall.errorRate > 1) {
    console.error(`[load] FAIL: error rate ${overall.errorRate}% is over 1%`);
    process.exit(1);
  }
  if (STRICT && slow.length) process.exit(1);
}

main().catch((e) => {
  console.error('[load] FAILED', e instanceof Error ? e.message : e);
  process.exit(1);
});
