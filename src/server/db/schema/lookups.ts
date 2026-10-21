import { pgTable, text } from "drizzle-orm/pg-core";

// Reference data the app only reads; rows come from the seed (owner role).

export const countries = pgTable("countries", {
  code: text().primaryKey(),
  name: text().notNull(),
});

export const currencies = pgTable("currencies", {
  code: text().primaryKey(),
  name: text().notNull(),
});

export const departments = pgTable("departments", {
  id: text().primaryKey(),
  name: text().notNull(),
});
