import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDatabase } from "./client";

await migrate(getDatabase(), { migrationsFolder: "drizzle" });
