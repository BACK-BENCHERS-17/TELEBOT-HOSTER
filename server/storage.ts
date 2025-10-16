// Storage implementation with DatabaseStorage - adapted from javascript_database blueprint
import {
  users,
  bots,
  environmentVariables,
  type User,
  type UpsertUser,
  type Bot,
  type InsertBot,
  type EnvironmentVariable,
  type InsertEnvironmentVariable,
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User operations - Required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Bot operations
  getBotById(id: number): Promise<Bot | undefined>;
  getBotsByUserId(userId: string): Promise<Bot[]>;
  createBot(bot: InsertBot): Promise<Bot>;
  updateBot(id: number, updates: Partial<Bot>): Promise<Bot>;
  deleteBot(id: number): Promise<void>;
  
  // Environment variable operations
  getEnvVarsByBotId(botId: number): Promise<EnvironmentVariable[]>;
  createEnvVar(envVar: InsertEnvironmentVariable): Promise<EnvironmentVariable>;
  deleteEnvVar(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Bot operations
  async getBotById(id: number): Promise<Bot | undefined> {
    const [bot] = await db.select().from(bots).where(eq(bots.id, id));
    return bot;
  }

  async getBotsByUserId(userId: string): Promise<Bot[]> {
    return await db.select().from(bots).where(eq(bots.userId, userId));
  }

  async createBot(botData: InsertBot): Promise<Bot> {
    const [bot] = await db.insert(bots).values(botData).returning();
    return bot;
  }

  async updateBot(id: number, updates: Partial<Bot>): Promise<Bot> {
    const [bot] = await db
      .update(bots)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(bots.id, id))
      .returning();
    return bot;
  }

  async deleteBot(id: number): Promise<void> {
    await db.delete(bots).where(eq(bots.id, id));
  }

  // Environment variable operations
  async getEnvVarsByBotId(botId: number): Promise<EnvironmentVariable[]> {
    return await db
      .select()
      .from(environmentVariables)
      .where(eq(environmentVariables.botId, botId));
  }

  async createEnvVar(envVarData: InsertEnvironmentVariable): Promise<EnvironmentVariable> {
    const [envVar] = await db
      .insert(environmentVariables)
      .values(envVarData)
      .returning();
    return envVar;
  }

  async deleteEnvVar(id: number): Promise<void> {
    await db.delete(environmentVariables).where(eq(environmentVariables.id, id));
  }
}

export const storage = new DatabaseStorage();
