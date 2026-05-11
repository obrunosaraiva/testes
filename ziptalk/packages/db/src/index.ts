import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

export const createDb = (connectionString: string) => {
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema, casing: "snake_case" });
};

export type Database = ReturnType<typeof createDb>;
export * from "./schema/index.js";
