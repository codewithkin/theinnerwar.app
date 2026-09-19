// Structured logging for the newsletter. One JSON-ish line per event so it
// greps well locally and parses in hosted log viewers.
// LOG_LEVEL=debug|info|warn|error (default info).

type Level = "debug" | "info" | "warn" | "error";
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const level = (env?.LOG_LEVEL ?? "info").toLowerCase() as Level;
  return ORDER[level] ?? ORDER.info;
}

function serialize(value: unknown): unknown {
  if (value instanceof Error) {
    const e = value as Error & { code?: string; responseCode?: number; command?: string };
    return { name: e.name, message: e.message, code: e.code, responseCode: e.responseCode, command: e.command };
  }
  return value;
}

/** Hides most of an address so logs don't become a mailing list. */
export function redactEmail(email?: string | null) {
  if (!email) return email;
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

export function createLogger(scope: string) {
  const write = (level: Level, event: string, fields?: Record<string, unknown>) => {
    if (ORDER[level] < threshold()) return;
    const data = fields
      ? Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, serialize(v)]))
      : undefined;
    const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${scope} ${event}${data ? " " + JSON.stringify(data) : ""}`;
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  };
  return {
    debug: (event: string, fields?: Record<string, unknown>) => write("debug", event, fields),
    info: (event: string, fields?: Record<string, unknown>) => write("info", event, fields),
    warn: (event: string, fields?: Record<string, unknown>) => write("warn", event, fields),
    error: (event: string, fields?: Record<string, unknown>) => write("error", event, fields),
  };
}
