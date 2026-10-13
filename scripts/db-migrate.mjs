import { readdirSync, readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

function loadEnvFile(path) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // Env may already be set in the shell.
  }
}

function splitSql(sql) {
  const statements = [];
  let current = "";
  let i = 0;
  let dollarTag = null;

  while (i < sql.length) {
    if (!dollarTag && sql[i] === "-" && sql[i + 1] === "-") {
      const nl = sql.indexOf("\n", i);
      i = nl === -1 ? sql.length : nl + 1;
      continue;
    }

    if (sql[i] === "$") {
      const match = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(i));
      if (match) {
        const tag = match[0];
        if (!dollarTag) dollarTag = tag;
        else if (dollarTag === tag) dollarTag = null;
        current += tag;
        i += tag.length;
        continue;
      }
    }

    if (!dollarTag && sql[i] === ";") {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = "";
      i += 1;
      continue;
    }

    current += sql[i];
    i += 1;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(
    "DATABASE_URL is missing. Add your Neon connection string to .env.local, then re-run npm run db:migrate.",
  );
  process.exit(1);
}

const sql = neon(databaseUrl);

await sql`create table if not exists public.schema_migrations (
  id text primary key,
  applied_at timestamptz not null default now()
)`;

const appliedRows = await sql`select id from public.schema_migrations`;
const applied = new Set(appliedRows.map((row) => row.id));

if (!applied.has("001_schema")) {
  const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
  const statements = splitSql(schema);
  await sql.transaction((txn) => [
    ...statements.map((statement) => txn.query(statement)),
    txn`insert into public.schema_migrations (id) values ('001_schema')`,
  ]);
  console.log(`Applied Neon schema (${statements.length} statements).`);
  applied.add("001_schema");
} else {
  console.log("Base schema already applied.");
}

const migrationsDir = new URL("../db/migrations/", import.meta.url);
let files = [];
try {
  files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
} catch {
  files = [];
}

for (const file of files) {
  const id = file.replace(/\.sql$/, "");
  if (applied.has(id)) {
    console.log(`Skip ${id} (already applied).`);
    continue;
  }
  const body = readFileSync(new URL(file, migrationsDir), "utf8");
  const statements = splitSql(body);
  await sql.transaction((txn) => [
    ...statements.map((statement) => txn.query(statement)),
    txn`insert into public.schema_migrations (id) values (${id})`,
  ]);
  console.log(`Applied ${id} (${statements.length} statements).`);
}

console.log("Migrations complete.");
