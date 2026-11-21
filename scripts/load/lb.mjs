#!/usr/bin/env node
/**
 * A tiny round-robin reverse proxy, for the CI failover test ONLY (adapted
 * from EJO 100). In production Vercel balances load across instances.
 * Passive health: an upstream that refuses a connection is skipped for 5 s,
 * and an idempotent request (GET/HEAD) that hit it is retried once on another.
 *
 *   node scripts/load/lb.mjs 3200 http://127.0.0.1:3201 http://127.0.0.1:3202
 *   GET /__lb shows how many requests each upstream served.
 */
import http from 'node:http';

const [port, ...ups] = process.argv.slice(2);
if (!port || ups.length < 2) {
  console.error('usage: lb.mjs <port> <upstream> <upstream> [...]');
  process.exit(1);
}
const upstreams = ups.map((u) => ({ url: new URL(u), downUntil: 0, served: 0, failed: 0 }));
let next = 0;
const pick = (skip) => {
  for (let i = 0; i < upstreams.length; i += 1) {
    const u = upstreams[(next += 1) % upstreams.length];
    if (u !== skip && u.downUntil < Date.now()) return u;
  }
  return upstreams.find((u) => u !== skip) ?? upstreams[0];
};

http
  .createServer((req, res) => {
    if (req.url === '/__lb') {
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify(upstreams.map((u) => ({ url: u.url.href, served: u.served, failed: u.failed, down: u.downUntil > Date.now() }))));
    }
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const attempt = (u, retried) => {
        const p = http.request(
          { host: u.url.hostname, port: u.url.port, method: req.method, path: req.url, headers: req.headers },
          (r) => {
            u.served += 1;
            res.writeHead(r.statusCode ?? 502, r.headers);
            r.pipe(res);
          },
        );
        p.on('error', () => {
          u.failed += 1;
          u.downUntil = Date.now() + 5000;
          if (!retried && ['GET', 'HEAD'].includes(req.method ?? '') && !res.headersSent) return attempt(pick(u), true);
          if (!res.headersSent) {
            res.writeHead(502);
            res.end('upstream unavailable');
          } else res.destroy();
        });
        p.end(body);
      };
      attempt(pick(), false);
    });
  })
  .listen(Number(port), () => console.log(`lb on :${port} -> ${ups.join(', ')}`));
