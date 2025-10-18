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
  tier: { type: String, default: 'FREE' },
  usageCount: { type: Number, default: 0 },
  usageLimit: { type: Number, default: 5 },
  autoRestart: { type: String, default: 'false' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const BotSchema = new mongoose.Schema({
  numericId: { type: Number, unique: true, sparse: true },
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
  numericId: { type: Number, unique: true, sparse: true },
  token: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  isActive: { type: String, default: 'true' },
  createdBy: { type: String, default: 'admin' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date,
});

const EnvironmentVariableSchema = new mongoose.Schema({
  numericId: { type: Number, unique: true, sparse: true },
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
  private botIdCounter = 0;
  private tokenIdCounter = 0;
  private envVarIdCounter = 0;

  async connect() {
    if (this.connected) return;
    
    const mongoUrl = 'mongodb+srv://chandan:chandan@cluster0.cdcw9zq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

    try {
      await mongoose.connect(mongoUrl);
      this.connected = true;
      console.log('✅ Connected to MongoDB successfully');
      
      // Migrate legacy documents without numericId
      console.log('🔄 Checking for legacy documents...');
      
      // Migrate bots
      const botsWithoutId = await BotModel.find({ numericId: { $exists: false } }).lean();
      if (botsWithoutId.length > 0) {
        console.log(`📦 Migrating ${botsWithoutId.length} bots...`);
        let maxId = 0;
        const withId = await BotModel.findOne({ numericId: { $exists: true } }).sort({ numericId: -1 }).lean();
        maxId = (withId as any)?.numericId || 0;
        
        for (const bot of botsWithoutId) {
          await BotModel.findByIdAndUpdate(bot._id, { numericId: ++maxId });
        }
        console.log('✅ Bot migration complete');
      }
      
      // Migrate access tokens
      const tokensWithoutId = await AccessTokenModel.find({ numericId: { $exists: false } }).lean();
      if (tokensWithoutId.length > 0) {
        console.log(`📦 Migrating ${tokensWithoutId.length} access tokens...`);
        let maxId = 0;
        const withId = await AccessTokenModel.findOne({ numericId: { $exists: true } }).sort({ numericId: -1 }).lean();
        maxId = (withId as any)?.numericId || 0;
        
        for (const token of tokensWithoutId) {
          await AccessTokenModel.findByIdAndUpdate(token._id, { numericId: ++maxId });
        }
        console.log('✅ Token migration complete');
      }
      
      // Migrate environment variables
      const envVarsWithoutId = await EnvironmentVariableModel.find({ numericId: { $exists: false } }).lean();
      if (envVarsWithoutId.length > 0) {
        console.log(`📦 Migrating ${envVarsWithoutId.length} environment variables...`);
        let maxId = 0;
        const withId = await EnvironmentVariableModel.findOne({ numericId: { $exists: true } }).sort({ numericId: -1 }).lean();
        maxId = (withId as any)?.numericId || 0;
        
        for (const envVar of envVarsWithoutId) {
          await EnvironmentVariableModel.findByIdAndUpdate(envVar._id, { numericId: ++maxId });
        }
        console.log('✅ Environment variable migration complete');
      }
      
      // Initialize counters from existing data
      const [maxBot, maxToken, maxEnvVar] = await Promise.all([
        BotModel.findOne().sort({ numericId: -1 }).lean(),
        AccessTokenModel.findOne().sort({ numericId: -1 }).lean(),
        EnvironmentVariableModel.findOne().sort({ numericId: -1 }).lean(),
      ]);
      
      this.botIdCounter = (maxBot as any)?.numericId || 0;
      this.tokenIdCounter = (maxToken as any)?.numericId || 0;
      this.envVarIdCounter = (maxEnvVar as any)?.numericId || 0;
      
      console.log(`📊 ID counters: bots=${this.botIdCounter}, tokens=${this.tokenIdCounter}, envVars=${this.envVarIdCounter}`);
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  // User operations
  private mapUserFromMongo(user: any): User {
    const { _id, __v, ...rest } = user;
    return {
      id: _id.toString(),
      email: rest.email || null,
      firstName: rest.firstName || null,
      lastName: rest.lastName || null,
      profileImageUrl: rest.profileImageUrl || null,
      tier: rest.tier || 'FREE',
      usageCount: rest.usageCount || 0,
      usageLimit: rest.usageLimit || 5,
      autoRestart: rest.autoRestart || 'false',
      createdAt: rest.createdAt || null,
      updatedAt: rest.updatedAt || null,
    };
  }

  async getUser(id: string): Promise<User | undefined> {
    await this.connect();
    const user = await UserModel.findById(id).lean<any>();
    return user ? this.mapUserFromMongo(user) : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    await this.connect();
    const user = await UserModel.findOne({ email }).lean<any>();
    return user ? this.mapUserFromMongo(user) : undefined;
  }

  async getAllUsers(): Promise<User[]> {
    await this.connect();
    const users = await UserModel.find().lean<any>();
    return users.map((u: any) => this.mapUserFromMongo(u));
  }

  async createUser(userData: Omit<UpsertUser, 'id'>): Promise<User> {
    await this.connect();
    const user = await UserModel.create(userData);
    return this.mapUserFromMongo(user.toObject());
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    await this.connect();
    const { id, ...rest } = userData;
    const user = await UserModel.findByIdAndUpdate(
      id,
      { ...rest, updatedAt: new Date() },
      { upsert: true, new: true }
    ).lean<any>();
    return this.mapUserFromMongo(user!);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    await this.connect();
    const { id: _, ...updateData } = updates;
    const user = await UserModel.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    ).lean<any>();
    if (!user) throw new Error('User not found');
    return this.mapUserFromMongo(user);
  }

  async incrementUsage(userId: string): Promise<User> {
    await this.connect();
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $inc: { usageCount: 1 }, updatedAt: new Date() },
      { new: true }
    ).lean<any>();
    if (!user) throw new Error('User not found');
    return this.mapUserFromMongo(user);
  }

  // Access Token operations
  private mapTokenFromMongo(token: any): AccessToken {
    const { _id, __v, ...rest } = token;
    return {
      id: rest.numericId,
      token: rest.token,
      userId: rest.userId,
      isActive: rest.isActive || 'true',
      createdBy: rest.createdBy || 'admin',
      createdAt: rest.createdAt || null,
      expiresAt: rest.expiresAt || null,
    };
  }

  async getTokenByValue(token: string): Promise<AccessToken | undefined> {
    await this.connect();
    const accessToken = await AccessTokenModel.findOne({ token }).lean<any>();
    return accessToken ? this.mapTokenFromMongo(accessToken) : undefined;
  }

  async getTokensByUserId(userId: string): Promise<AccessToken[]> {
    await this.connect();
    const tokens = await AccessTokenModel.find({ userId }).lean<any>();
    return tokens.map((t: any) => this.mapTokenFromMongo(t));
  }

  async getAllTokens(): Promise<AccessToken[]> {
    await this.connect();
    const tokens = await AccessTokenModel.find().lean<any>();
    return tokens.map((t: any) => this.mapTokenFromMongo(t));
  }

  async createToken(tokenData: InsertAccessToken): Promise<AccessToken> {
    await this.connect();
    const numericId = ++this.tokenIdCounter;
    const token = await AccessTokenModel.create({ ...tokenData, numericId });
    return this.mapTokenFromMongo(token.toObject());
  }

  async updateToken(id: number, updates: Partial<AccessToken>): Promise<AccessToken> {
    await this.connect();
    const { id: _, ...updateData } = updates;
    const token = await AccessTokenModel.findOneAndUpdate(
      { numericId: id },
      updateData,
      { new: true }
    ).lean<any>();
    if (!token) throw new Error('Token not found');
    return this.mapTokenFromMongo(token);
  }

  async deleteToken(id: number): Promise<void> {
    await this.connect();
    await AccessTokenModel.findOneAndDelete({ numericId: id });
  }

  // Bot operations
  private mapBotFromMongo(bot: any): Bot {
    const { _id, __v, ...rest } = bot;
    return {
      id: rest.numericId,
      userId: rest.userId,
      name: rest.name,
      runtime: rest.runtime,
      status: rest.status || 'stopped',
      zipPath: rest.zipPath || null,
      extractedPath: rest.extractedPath || null,
      entryPoint: rest.entryPoint || null,
      containerId: rest.containerId || null,
      processId: rest.processId || null,
      errorMessage: rest.errorMessage || null,
      createdAt: rest.createdAt || null,
      updatedAt: rest.updatedAt || null,
    };
  }

  async getBotById(id: number): Promise<Bot | undefined> {
    await this.connect();
    const bot = await BotModel.findOne({ numericId: id }).lean<any>();
    return bot ? this.mapBotFromMongo(bot) : undefined;
  }

  async getBotsByUserId(userId: string): Promise<Bot[]> {
    await this.connect();
    const bots = await BotModel.find({ userId }).lean<any>();
    return bots.map((b: any) => this.mapBotFromMongo(b));
  }

  async createBot(botData: InsertBot): Promise<Bot> {
    await this.connect();
    const numericId = ++this.botIdCounter;
    const bot = await BotModel.create({ ...botData, numericId });
    return this.mapBotFromMongo(bot.toObject());
  }

  async updateBot(id: number, updates: Partial<Bot>): Promise<Bot> {
    await this.connect();
    const { id: _, ...updateData } = updates;
    const bot = await BotModel.findOneAndUpdate(
      { numericId: id },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    ).lean<any>();
    if (!bot) throw new Error('Bot not found');
    return this.mapBotFromMongo(bot);
  }

  async deleteBot(id: number): Promise<void> {
    await this.connect();
    await BotModel.findOneAndDelete({ numericId: id });
  }

  // Environment variable operations
  private mapEnvVarFromMongo(envVar: any): EnvironmentVariable {
    const { _id, __v, ...rest } = envVar;
    return {
      id: rest.numericId,
      botId: rest.botId,
      key: rest.key,
      value: rest.value,
      createdAt: rest.createdAt || null,
      updatedAt: rest.updatedAt || null,
    };
  }

  async getEnvVarsByBotId(botId: number): Promise<EnvironmentVariable[]> {
    await this.connect();
    const envVars = await EnvironmentVariableModel.find({ botId }).lean<any>();
    return envVars.map((e: any) => this.mapEnvVarFromMongo(e));
  }

  async createEnvVar(envVarData: InsertEnvironmentVariable): Promise<EnvironmentVariable> {
    await this.connect();
    const numericId = ++this.envVarIdCounter;
    const envVar = await EnvironmentVariableModel.create({ ...envVarData, numericId });
    return this.mapEnvVarFromMongo(envVar.toObject());
  }

  async deleteEnvVar(id: number): Promise<void> {
    await this.connect();
    await EnvironmentVariableModel.findOneAndDelete({ numericId: id });
  }
}
