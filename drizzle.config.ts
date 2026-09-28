import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for database migrations. Copy .env.example to .env and configure it first.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema/*.ts",
  out: "./drizzle",
  dbCredentials: { url: databaseUrl },
});
