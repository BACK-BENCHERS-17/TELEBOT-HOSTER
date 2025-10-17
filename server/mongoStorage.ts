import mongoose from 'mongoose';
import type {
  User,
  UpsertUser,
  Bot,
  InsertBot,
  EnvironmentVariable,
  InsertEnvironmentVariable,
  AccessToken,
  InsertAccessToken,
} from "@shared/schema";
import type { IStorage } from "./storage";

// MongoDB Models
const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, sparse: true },
  firstName: String,
  lastName: String,
  profileImageUrl: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const BotSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  runtime: { type: String, required: true },
  status: { type: String, default: 'stopped' },
  zipPath: String,
  extractedPath: String,
  entryPoint: String,
  containerId: String,
  processId: String,
  errorMessage: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const AccessTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  isActive: { type: String, default: 'true' },
  createdBy: { type: String, default: 'admin' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date,
});

const EnvironmentVariableSchema = new mongoose.Schema({
  botId: { type: Number, required: true },
  key: { type: String, required: true },
  value: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const UserModel = mongoose.model('User', UserSchema);
const BotModel = mongoose.model('Bot', BotSchema);
const AccessTokenModel = mongoose.model('AccessToken', AccessTokenSchema);
const EnvironmentVariableModel = mongoose.model('EnvironmentVariable', EnvironmentVariableSchema);

export class MongoStorage implements IStorage {
  private connected = false;

  async connect() {
    if (this.connected) return;
    
    const mongoUrl = 'mongodb+srv://chandan:chandan@cluster0.cdcw9zq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

    try {
      await mongoose.connect(mongoUrl);
      this.connected = true;
      console.log('✅ Connected to MongoDB successfully');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    await this.connect();
    const user = await UserModel.findById(id).lean<any>();
    return user ? { ...user, id: user._id.toString() } as User : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    await this.connect();
    const user = await UserModel.findOne({ email }).lean<any>();
    return user ? { ...user, id: user._id.toString() } as User : undefined;
  }

  async getAllUsers(): Promise<User[]> {
    await this.connect();
    const users = await UserModel.find().lean<any>();
    return users.map((u: any) => ({ ...u, id: u._id.toString() } as User));
  }

  async createUser(userData: Omit<UpsertUser, 'id'>): Promise<User> {
    await this.connect();
    const user = await UserModel.create(userData);
    return { ...user.toObject(), id: user._id.toString() } as User;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    await this.connect();
    const { id, ...rest } = userData;
    const user = await UserModel.findByIdAndUpdate(
      id,
      { ...rest, updatedAt: new Date() },
      { upsert: true, new: true }
    ).lean<any>();
    return { ...user, id: user!._id.toString() } as User;
  }

  // Access Token operations
  async getTokenByValue(token: string): Promise<AccessToken | undefined> {
    await this.connect();
    const accessToken = await AccessTokenModel.findOne({ token }).lean<any>();
    return accessToken ? { ...accessToken, id: Number(accessToken._id.toString().slice(-8), 16) } as AccessToken : undefined;
  }

  async getTokensByUserId(userId: string): Promise<AccessToken[]> {
    await this.connect();
    const tokens = await AccessTokenModel.find({ userId }).lean<any>();
    return tokens.map((t: any) => ({ ...t, id: Number(t._id.toString().slice(-8), 16) } as AccessToken));
  }

  async getAllTokens(): Promise<AccessToken[]> {
    await this.connect();
    const tokens = await AccessTokenModel.find().lean<any>();
    return tokens.map((t: any) => ({ ...t, id: Number(t._id.toString().slice(-8), 16) } as AccessToken));
  }

  async createToken(tokenData: InsertAccessToken): Promise<AccessToken> {
    await this.connect();
    const token = await AccessTokenModel.create(tokenData);
    return { ...token.toObject(), id: Number(token._id.toString().slice(-8), 16) } as AccessToken;
  }

  async updateToken(id: number, updates: Partial<AccessToken>): Promise<AccessToken> {
    await this.connect();
    const tokens = await AccessTokenModel.find().lean<any>();
    const tokenDoc = tokens.find((t: any) => Number(t._id.toString().slice(-8), 16) === id);
    if (!tokenDoc) throw new Error('Token not found');
    
    const token = await AccessTokenModel.findByIdAndUpdate(
      tokenDoc._id,
      updates,
      { new: true }
    ).lean<any>();
    if (!token) throw new Error('Token not found');
    return { ...token, id: Number(token._id.toString().slice(-8), 16) } as AccessToken;
  }

  async deleteToken(id: number): Promise<void> {
    await this.connect();
    const tokens = await AccessTokenModel.find().lean<any>();
    const tokenDoc = tokens.find((t: any) => Number(t._id.toString().slice(-8), 16) === id);
    if (tokenDoc) {
      await AccessTokenModel.findByIdAndDelete(tokenDoc._id);
    }
  }

  // Bot operations
  async getBotById(id: number): Promise<Bot | undefined> {
    await this.connect();
    const bots = await BotModel.find().lean<any>();
    const bot = bots.find((b: any) => Number(b._id.toString().slice(-8), 16) === id);
    return bot ? { 
      ...bot, 
      id: Number(bot._id.toString().slice(-8), 16),
      zipPath: bot.zipPath || null,
      extractedPath: bot.extractedPath || null,
      entryPoint: bot.entryPoint || null,
      containerId: bot.containerId || null,
      processId: bot.processId || null,
      errorMessage: bot.errorMessage || null,
      createdAt: bot.createdAt || null,
      updatedAt: bot.updatedAt || null,
    } as Bot : undefined;
  }

  async getBotsByUserId(userId: string): Promise<Bot[]> {
    await this.connect();
    const bots = await BotModel.find({ userId }).lean<any>();
    return bots.map((b: any) => ({ 
      ...b, 
      id: Number(b._id.toString().slice(-8), 16),
      zipPath: b.zipPath || null,
      extractedPath: b.extractedPath || null,
      entryPoint: b.entryPoint || null,
      containerId: b.containerId || null,
      processId: b.processId || null,
      errorMessage: b.errorMessage || null,
      createdAt: b.createdAt || null,
      updatedAt: b.updatedAt || null,
    } as Bot));
  }

  async createBot(botData: InsertBot): Promise<Bot> {
    await this.connect();
    const bot = await BotModel.create(botData);
    return { 
      ...bot.toObject(), 
      id: Number(bot._id.toString().slice(-8), 16),
      zipPath: bot.zipPath || null,
      extractedPath: bot.extractedPath || null,
      entryPoint: bot.entryPoint || null,
      containerId: bot.containerId || null,
      processId: bot.processId || null,
      errorMessage: bot.errorMessage || null,
      createdAt: bot.createdAt || null,
      updatedAt: bot.updatedAt || null,
    } as Bot;
  }

  async updateBot(id: number, updates: Partial<Bot>): Promise<Bot> {
    await this.connect();
    const bots = await BotModel.find().lean<any>();
    const botDoc = bots.find((b: any) => Number(b._id.toString().slice(-8), 16) === id);
    if (!botDoc) throw new Error('Bot not found');
    
    const bot = await BotModel.findByIdAndUpdate(
      botDoc._id,
      { ...updates, updatedAt: new Date() },
      { new: true }
    ).lean<any>();
    if (!bot) throw new Error('Bot not found');
    return { 
      ...bot, 
      id: Number(bot._id.toString().slice(-8), 16),
      zipPath: bot.zipPath || null,
      extractedPath: bot.extractedPath || null,
      entryPoint: bot.entryPoint || null,
      containerId: bot.containerId || null,
      processId: bot.processId || null,
      errorMessage: bot.errorMessage || null,
      createdAt: bot.createdAt || null,
      updatedAt: bot.updatedAt || null,
    } as Bot;
  }

  async deleteBot(id: number): Promise<void> {
    await this.connect();
    const bots = await BotModel.find().lean<any>();
    const botDoc = bots.find((b: any) => Number(b._id.toString().slice(-8), 16) === id);
    if (botDoc) {
      await BotModel.findByIdAndDelete(botDoc._id);
    }
  }

  // Environment variable operations
  async getEnvVarsByBotId(botId: number): Promise<EnvironmentVariable[]> {
    await this.connect();
    const envVars = await EnvironmentVariableModel.find({ botId }).lean<any>();
    return envVars.map((e: any) => ({ ...e, id: Number(e._id.toString().slice(-8), 16) } as EnvironmentVariable));
  }

  async createEnvVar(envVarData: InsertEnvironmentVariable): Promise<EnvironmentVariable> {
    await this.connect();
    const envVar = await EnvironmentVariableModel.create(envVarData);
    return { ...envVar.toObject(), id: Number(envVar._id.toString().slice(-8), 16) } as EnvironmentVariable;
  }

  async deleteEnvVar(id: number): Promise<void> {
    await this.connect();
    const envVars = await EnvironmentVariableModel.find().lean<any>();
    const envVarDoc = envVars.find((e: any) => Number(e._id.toString().slice(-8), 16) === id);
    if (envVarDoc) {
      await EnvironmentVariableModel.findByIdAndDelete(envVarDoc._id);
    }
  }
}
