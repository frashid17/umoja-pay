import "server-only";

import { Pool, type QueryResultRow } from "pg";

let pool: Pool | undefined;

function connectionString() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Missing DATABASE_URL. Set your Neon connection string.");
  }
  // Prefer libpq-compatible SSL semantics for node-postgres v8+
  const u = new URL(url);
  if (!u.searchParams.has("uselibpqcompat")) {
    u.searchParams.set("uselibpqcompat", "true");
  }
  if (!u.searchParams.get("sslmode")) {
    u.searchParams.set("sslmode", "require");
  }
  return u.toString();
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: connectionString(),
      ssl: { rejectUnauthorized: false },
      max: 10,
      // Neon compute wake can take a few seconds
      connectionTimeoutMillis: 30_000,
      idleTimeoutMillis: 20_000,
    });
    pool.on("error", (err) => {
      console.error("[db] idle client error", err);
    });
  }
  return pool;
}

function toParamQuery(strings: TemplateStringsArray, values: unknown[]) {
  let text = "";
  const params: unknown[] = [];
  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) {
      params.push(values[i]);
      text += `$${params.length}`;
    }
  }
  return { text, params };
}

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = normalize(nested);
    }
    return out;
  }
  return value;
}

async function queryWithRetry<T extends QueryResultRow>(
  text: string,
  params: unknown[],
  attempts = 3,
): Promise<T[]> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await getPool().query<T>(text, params);
      return result.rows.map((row) => normalize(row) as T);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retryable =
        /timeout|ECONN|ENOTFOUND|fetch failed|Connection terminated|sorry, too many clients/i.test(
          message,
        );
      if (!retryable || i === attempts - 1) break;
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastError;
}

/** Run a SQL query and return rows with dates as ISO strings. */
export async function q<T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> {
  const { text, params } = toParamQuery(strings, values);
  return queryWithRetry<T & QueryResultRow>(text, params);
}

export function one<T>(rows: T[]): T | null {
  return rows[0] ?? null;
}

export async function countOf(strings: TemplateStringsArray, ...values: unknown[]): Promise<number> {
  const rows = await q<{ count: number }>(strings, ...values);
  return Number(rows[0]?.count ?? 0);
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

export function dbMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Database request failed";
}
