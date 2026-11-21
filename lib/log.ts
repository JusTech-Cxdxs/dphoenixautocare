/**
 * Structured JSON logs (one line each) for Vercel's log view and any log
 * drain. Never pass passwords, tokens or customer personal data.
 */
type Fields = Record<string, unknown>;

function write(level: 'info' | 'warn' | 'error', event: string, fields?: Fields) {
  const line = JSON.stringify({ level, event, at: new Date().toISOString(), ...fields });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else process.stdout.write(`${line}\n`);
}

export const log = {
  info: (event: string, fields?: Fields) => write('info', event, fields),
  warn: (event: string, fields?: Fields) => write('warn', event, fields),
  error: (event: string, fields?: Fields) => write('error', event, fields),
};
