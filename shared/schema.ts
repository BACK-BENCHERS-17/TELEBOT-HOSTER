import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  serial,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - Required for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Bots table - Stores deployed Telegram bots
export const bots = pgTable("bots", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  runtime: varchar("runtime", { length: 50 }).notNull(), // 'python' or 'nodejs'
  status: varchar("status", { length: 50 }).notNull().default('stopped'), // 'running', 'stopped', 'error', 'deploying'
  zipPath: text("zip_path"), // Path to uploaded ZIP file
  extractedPath: text("extracted_path"), // Path to extracted bot files
  containerId: varchar("container_id"), // Docker container ID (for future use)
  processId: varchar("process_id"), // Process ID for running bot
  errorMessage: text("error_message"), // Last error message if any
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const botsRelations = relations(bots, ({ one, many }) => ({
  user: one(users, {
    fields: [bots.userId],
    references: [users.id],
  }),
  envVars: many(environmentVariables),
}));

export const usersRelations = relations(users, ({ many }) => ({
  bots: many(bots),
}));

export type Bot = typeof bots.$inferSelect;
export type InsertBot = typeof bots.$inferInsert;

export const insertBotSchema = createInsertSchema(bots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Environment Variables table - Stores bot secrets and config
export const environmentVariables = pgTable("environment_variables", {
  id: serial("id").primaryKey(),
  botId: integer("bot_id").notNull().references(() => bots.id, { onDelete: "cascade" }),
  key: varchar("key", { length: 255 }).notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const envVarsRelations = relations(environmentVariables, ({ one }) => ({
  bot: one(bots, {
    fields: [environmentVariables.botId],
    references: [bots.id],
  }),
}));

export type EnvironmentVariable = typeof environmentVariables.$inferSelect;
export type InsertEnvironmentVariable = typeof environmentVariables.$inferInsert;

export const insertEnvVarSchema = createInsertSchema(environmentVariables).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
