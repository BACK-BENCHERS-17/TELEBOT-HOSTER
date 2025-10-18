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
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: Omit<UpsertUser, 'id'>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  incrementUsage(userId: string): Promise<User>;
  
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

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async incrementUsage(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        usageCount: sql`${users.usageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
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

// In-Memory Storage Implementation (no database required)
export class MemStorage implements IStorage {
  private users: User[] = [];
  private bots: Bot[] = [];
  private tokens: AccessToken[] = [];
  private envVars: EnvironmentVariable[] = [];
  private userIdCounter = 0;
  private botIdCounter = 0;
  private tokenIdCounter = 0;
  private envVarIdCounter = 0;

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.find(u => u.id === id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.users.find(u => u.email === email);
  }

  async getAllUsers(): Promise<User[]> {
    return [...this.users];
  }

  async createUser(userData: Omit<UpsertUser, 'id'>): Promise<User> {
    const user: User = {
      id: `user_${++this.userIdCounter}_${Date.now()}`,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      tier: userData.tier || 'FREE',
      usageCount: userData.usageCount || 0,
      usageLimit: userData.usageLimit || 5,
      autoRestart: userData.autoRestart || 'false',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.push(user);
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingIndex = this.users.findIndex(u => u.id === userData.id);
    const user: User = {
      id: userData.id || `user_${++this.userIdCounter}_${Date.now()}`,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      tier: userData.tier || 'FREE',
      usageCount: userData.usageCount || 0,
      usageLimit: userData.usageLimit || 5,
      autoRestart: userData.autoRestart || 'false',
      createdAt: userData.createdAt || new Date(),
      updatedAt: new Date(),
    };
    
    if (existingIndex >= 0) {
      this.users[existingIndex] = user;
    } else {
      this.users.push(user);
    }
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const userIndex = this.users.findIndex(u => u.id === id);
    if (userIndex === -1) throw new Error('User not found');
    
    this.users[userIndex] = { 
      ...this.users[userIndex], 
      ...updates,
      updatedAt: new Date()
    };
    return this.users[userIndex];
  }

  async incrementUsage(userId: string): Promise<User> {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error('User not found');
    
    this.users[userIndex] = {
      ...this.users[userIndex],
      usageCount: this.users[userIndex].usageCount + 1,
      updatedAt: new Date()
    };
    return this.users[userIndex];
  }

  // Access Token operations
  async getTokenByValue(token: string): Promise<AccessToken | undefined> {
    return this.tokens.find(t => t.token === token);
  }

  async getTokensByUserId(userId: string): Promise<AccessToken[]> {
    return this.tokens.filter(t => t.userId === userId);
  }

  async getAllTokens(): Promise<AccessToken[]> {
    return [...this.tokens];
  }

  async createToken(tokenData: InsertAccessToken): Promise<AccessToken> {
    const token: AccessToken = {
      id: ++this.tokenIdCounter,
      token: tokenData.token,
      userId: tokenData.userId,
      isActive: tokenData.isActive || 'true',
      createdBy: tokenData.createdBy || 'admin',
      createdAt: new Date(),
      expiresAt: tokenData.expiresAt || null,
    };
    this.tokens.push(token);
    return token;
  }

  async updateToken(id: number, updates: Partial<AccessToken>): Promise<AccessToken> {
    const tokenIndex = this.tokens.findIndex(t => t.id === id);
    if (tokenIndex === -1) throw new Error('Token not found');
    
    this.tokens[tokenIndex] = { ...this.tokens[tokenIndex], ...updates };
    return this.tokens[tokenIndex];
  }

  async deleteToken(id: number): Promise<void> {
    this.tokens = this.tokens.filter(t => t.id !== id);
  }

  // Bot operations
  async getBotById(id: number): Promise<Bot | undefined> {
    return this.bots.find(b => b.id === id);
  }

  async getBotsByUserId(userId: string): Promise<Bot[]> {
    return this.bots.filter(b => b.userId === userId);
  }

  async createBot(botData: InsertBot): Promise<Bot> {
    const bot: Bot = {
      id: ++this.botIdCounter,
      userId: botData.userId,
      name: botData.name,
      description: botData.description || null,
      runtime: botData.runtime,
      status: botData.status || 'stopped',
      zipPath: botData.zipPath || null,
      extractedPath: botData.extractedPath || null,
      entryPoint: botData.entryPoint || null,
      containerId: botData.containerId || null,
      processId: botData.processId || null,
      errorMessage: botData.errorMessage || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.bots.push(bot);
    return bot;
  }

  async updateBot(id: number, updates: Partial<Bot>): Promise<Bot> {
    const botIndex = this.bots.findIndex(b => b.id === id);
    if (botIndex === -1) throw new Error('Bot not found');
    
    this.bots[botIndex] = { 
      ...this.bots[botIndex], 
      ...updates,
      updatedAt: new Date()
    };
    return this.bots[botIndex];
  }

  async deleteBot(id: number): Promise<void> {
    this.bots = this.bots.filter(b => b.id !== id);
  }

  // Environment variable operations
  async getEnvVarsByBotId(botId: number): Promise<EnvironmentVariable[]> {
    return this.envVars.filter(e => e.botId === botId);
  }

  async createEnvVar(envVarData: InsertEnvironmentVariable): Promise<EnvironmentVariable> {
    const envVar: EnvironmentVariable = {
      id: ++this.envVarIdCounter,
      botId: envVarData.botId,
      key: envVarData.key,
      value: envVarData.value,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.envVars.push(envVar);
    return envVar;
  }

  async deleteEnvVar(id: number): Promise<void> {
    this.envVars = this.envVars.filter(e => e.id !== id);
  }
}

// Import MongoDB storage
import { MongoStorage } from './mongoStorage';

// Use MongoDB storage
export const storage = new MongoStorage();
