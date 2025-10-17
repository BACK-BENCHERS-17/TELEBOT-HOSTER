// Storage implementation with DatabaseStorage - adapted from javascript_database blueprint
import {
  users,
  bots,
  environmentVariables,
  accessTokens,
  type User,
  type UpsertUser,
  type Bot,
  type InsertBot,
  type EnvironmentVariable,
  type InsertEnvironmentVariable,
  type AccessToken,
  type InsertAccessToken,
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: Omit<UpsertUser, 'id'>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Access Token operations
  getTokenByValue(token: string): Promise<AccessToken | undefined>;
  getTokensByUserId(userId: string): Promise<AccessToken[]>;
  getAllTokens(): Promise<AccessToken[]>;
  createToken(token: InsertAccessToken): Promise<AccessToken>;
  updateToken(id: number, updates: Partial<AccessToken>): Promise<AccessToken>;
  deleteToken(id: number): Promise<void>;
  
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(userData: Omit<UpsertUser, 'id'>): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
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

  // Access Token operations
  async getTokenByValue(token: string): Promise<AccessToken | undefined> {
    const [accessToken] = await db.select().from(accessTokens).where(eq(accessTokens.token, token));
    return accessToken;
  }

  async getTokensByUserId(userId: string): Promise<AccessToken[]> {
    return await db.select().from(accessTokens).where(eq(accessTokens.userId, userId));
  }

  async getAllTokens(): Promise<AccessToken[]> {
    return await db.select().from(accessTokens);
  }

  async createToken(tokenData: InsertAccessToken): Promise<AccessToken> {
    const [token] = await db.insert(accessTokens).values(tokenData).returning();
    return token;
  }

  async updateToken(id: number, updates: Partial<AccessToken>): Promise<AccessToken> {
    const [token] = await db
      .update(accessTokens)
      .set(updates)
      .where(eq(accessTokens.id, id))
      .returning();
    return token;
  }

  async deleteToken(id: number): Promise<void> {
    await db.delete(accessTokens).where(eq(accessTokens.id, id));
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
