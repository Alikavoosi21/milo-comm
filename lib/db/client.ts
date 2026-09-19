import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/validation/env";

let pool: Pool | undefined;

export function getDatabase() {
  pool ??= new Pool({ connectionString: env.DATABASE_URL, max: 5 });
  return drizzle(pool);
}
