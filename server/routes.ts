// API Routes and WebSocket setup
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import fs from "fs";
import { promisify } from "util";
import unzipper from "unzipper";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertBotSchema, insertEnvVarSchema } from "@shared/schema";

const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);

// File upload configuration
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Bot process management (simple in-memory for MVP)
const botProcesses = new Map<number, any>();

// WebSocket clients for log streaming
const wsClients = new Map<string, Set<WebSocket>>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get all bots for current user
  app.get("/api/bots", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bots = await storage.getBotsByUserId(userId);
      res.json(bots);
    } catch (error) {
      console.error("Error fetching bots:", error);
      res.status(500).json({ message: "Failed to fetch bots" });
    }
  });

  // Get single bot
  app.get("/api/bots/:id", isAuthenticated, async (req: any, res) => {
    try {
      const botId = parseInt(req.params.id);
      const bot = await storage.getBotById(botId);
      
      if (!bot) {
        return res.status(404).json({ message: "Bot not found" });
      }
      
      // Check ownership
      if (bot.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(bot);
    } catch (error) {
      console.error("Error fetching bot:", error);
      res.status(500).json({ message: "Failed to fetch bot" });
    }
  });

  // Deploy bot (upload ZIP and create bot)
  app.post("/api/bots/deploy", isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, runtime } = req.body;
      const envVars = req.body.envVars ? JSON.parse(req.body.envVars) : [];
      
      // Validate bot data with Zod schema
      const validatedBot = insertBotSchema.safeParse({
        userId,
        name,
        runtime,
        status: 'stopped',
      });
      
      if (!validatedBot.success) {
        return res.status(400).json({ 
          message: "Invalid bot data", 
          errors: validatedBot.error.errors 
        });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const zipPath = req.file.path;
      // Secure extraction path - use UUID to prevent path traversal
      const safeId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const extractPath = path.join('uploads', 'bots', safeId);
      
      // Create extraction directory
      await mkdirAsync(extractPath, { recursive: true });
      
      // Extract ZIP file
      await fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: extractPath }))
        .promise();
      
      // Find bot directory (handle nested folders)
      let botDirectory = extractPath;
      const findBotFiles = async (dir: string): Promise<{ hasRequirementsTxt: boolean; hasPackageJson: boolean; foundDir: string; entryPoint?: string }> => {
        const files = await promisify(fs.readdir)(dir);
        let hasRequirementsTxt = false;
        let hasPackageJson = false;
        let entryPoint: string | undefined;
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = await promisify(fs.stat)(filePath);
          
          if (stat.isDirectory()) {
            // Recursively check subdirectories
            const subResult = await findBotFiles(filePath);
            if (subResult.hasRequirementsTxt || subResult.hasPackageJson) {
              return subResult;
            }
          } else {
            if (file === 'requirements.txt') hasRequirementsTxt = true;
            if (file === 'package.json') hasPackageJson = true;
            if (file === 'main.py' || file === 'bot.py') entryPoint = file;
            if (file === 'index.js' || file === 'bot.js') entryPoint = file;
          }
        }
        
        return { hasRequirementsTxt, hasPackageJson, foundDir: dir, entryPoint };
      };
      
      const { hasRequirementsTxt, hasPackageJson, foundDir, entryPoint } = await findBotFiles(extractPath);
      botDirectory = foundDir;
      
      // Validate runtime matches
      if (runtime === 'python' && !hasRequirementsTxt) {
        await unlinkAsync(zipPath);
        await promisify(fs.rm)(extractPath, { recursive: true, force: true });
        return res.status(400).json({ 
          message: "Error: requirements.txt not found. Python bots must include requirements.txt" 
        });
      }
      
      if (runtime === 'nodejs' && !hasPackageJson) {
        await unlinkAsync(zipPath);
        await promisify(fs.rm)(extractPath, { recursive: true, force: true });
        return res.status(400).json({ 
          message: "Error: package.json not found. Node.js bots must include package.json" 
        });
      }
      
      // Install dependencies
      const { spawn } = require('child_process');
      
      if (runtime === 'python' && hasRequirementsTxt) {
        await new Promise<void>((resolve, reject) => {
          const pip = spawn('pip3', ['install', '-r', 'requirements.txt'], {
            cwd: botDirectory,
            stdio: 'pipe'
          });
          
          pip.on('close', (code: number | null) => {
            if (code === 0) {
              console.log(`✓ Installed Python dependencies for ${name}`);
              resolve();
            } else {
              reject(new Error(`Failed to install Python dependencies (exit code: ${code})`));
            }
          });
        });
      }
      
      if (runtime === 'nodejs' && hasPackageJson) {
        await new Promise<void>((resolve, reject) => {
          const npm = spawn('npm', ['install'], {
            cwd: botDirectory,
            stdio: 'pipe'
          });
          
          npm.on('close', (code: number | null) => {
            if (code === 0) {
              console.log(`✓ Installed Node.js dependencies for ${name}`);
              resolve();
            } else {
              reject(new Error(`Failed to install Node.js dependencies (exit code: ${code})`));
            }
          });
        });
      }
      
      // Create bot record
      const bot = await storage.createBot({
        userId,
        name: validatedBot.data.name,
        runtime: validatedBot.data.runtime,
        status: 'stopped',
        zipPath,
        extractedPath: botDirectory, // Use actual bot directory, not extraction root
      });
      
      // Create environment variables with validation
      for (const envVar of envVars) {
        if (envVar.key && envVar.value) {
          const validatedEnvVar = insertEnvVarSchema.safeParse({
            botId: bot.id,
            key: envVar.key,
            value: envVar.value,
          });
          
          if (validatedEnvVar.success) {
            await storage.createEnvVar(validatedEnvVar.data);
          }
        }
      }
      
      res.json(bot);
    } catch (error) {
      console.error("Error deploying bot:", error);
      res.status(500).json({ message: "Failed to deploy bot" });
    }
  });

  // Start bot
  app.post("/api/bots/:id/start", isAuthenticated, async (req: any, res) => {
    try {
      const botId = parseInt(req.params.id);
      const bot = await storage.getBotById(botId);
      
      if (!bot || bot.userId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Bot not found" });
      }
      
      const updatedBot = await launchBot(botId);
      res.json(updatedBot);
    } catch (error: any) {
      console.error("Error starting bot:", error);
      await storage.updateBot(parseInt(req.params.id), { 
        status: 'error', 
        errorMessage: error.message 
      });
      res.status(500).json({ message: "Failed to start bot" });
    }
  });

  // Stop bot
  app.post("/api/bots/:id/stop", isAuthenticated, async (req: any, res) => {
    try {
      const botId = parseInt(req.params.id);
      const bot = await storage.getBotById(botId);
      
      if (!bot || bot.userId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Bot not found" });
      }
      
      const process = botProcesses.get(botId);
      if (process) {
        process.kill();
        botProcesses.delete(botId);
      }
      
      const updatedBot = await storage.updateBot(botId, { 
        status: 'stopped',
        processId: null,
      });
      
      res.json(updatedBot);
    } catch (error) {
      console.error("Error stopping bot:", error);
      res.status(500).json({ message: "Failed to stop bot" });
    }
  });

  // Restart bot
  app.post("/api/bots/:id/restart", isAuthenticated, async (req: any, res) => {
    try {
      const botId = parseInt(req.params.id);
      const bot = await storage.getBotById(botId);
      
      if (!bot || bot.userId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Bot not found" });
      }
      
      // Stop if running
      const process = botProcesses.get(botId);
      if (process) {
        process.kill();
        botProcesses.delete(botId);
      }
      
      await storage.updateBot(botId, { status: 'stopped' });
      
      // Wait a moment before restarting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Actually restart the bot by calling the launch logic
      const updatedBot = await launchBot(botId);
      
      res.json(updatedBot);
    } catch (error: any) {
      console.error("Error restarting bot:", error);
      await storage.updateBot(parseInt(req.params.id), { 
        status: 'error', 
        errorMessage: error.message 
      });
      res.status(500).json({ message: "Failed to restart bot" });
    }
  });

  // Delete bot
  app.delete("/api/bots/:id", isAuthenticated, async (req: any, res) => {
    try {
      const botId = parseInt(req.params.id);
      const bot = await storage.getBotById(botId);
      
      if (!bot || bot.userId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Bot not found" });
      }
      
      // Stop if running
      const process = botProcesses.get(botId);
      if (process) {
        process.kill();
        botProcesses.delete(botId);
      }
      
      // Clean up files
      if (bot.zipPath && fs.existsSync(bot.zipPath)) {
        await unlinkAsync(bot.zipPath);
      }
      if (bot.extractedPath && fs.existsSync(bot.extractedPath)) {
        await promisify(fs.rm)(bot.extractedPath, { recursive: true, force: true });
      }
      
      // Delete from database
      await storage.deleteBot(botId);
      
      res.json({ message: "Bot deleted" });
    } catch (error) {
      console.error("Error deleting bot:", error);
      res.status(500).json({ message: "Failed to delete bot" });
    }
  });

  // Get environment variables
  app.get("/api/bots/:id/env", isAuthenticated, async (req: any, res) => {
    try {
      const botId = parseInt(req.params.id);
      const bot = await storage.getBotById(botId);
      
      if (!bot || bot.userId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Bot not found" });
      }
      
      const envVars = await storage.getEnvVarsByBotId(botId);
      res.json(envVars);
    } catch (error) {
      console.error("Error fetching env vars:", error);
      res.status(500).json({ message: "Failed to fetch environment variables" });
    }
  });

  // Add environment variable
  app.post("/api/bots/:id/env", isAuthenticated, async (req: any, res) => {
    try {
      const botId = parseInt(req.params.id);
      const bot = await storage.getBotById(botId);
      
      if (!bot || bot.userId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Bot not found" });
      }
      
      const { key, value } = req.body;
      
      // Validate with Zod schema
      const validatedEnvVar = insertEnvVarSchema.safeParse({ botId, key, value });
      
      if (!validatedEnvVar.success) {
        return res.status(400).json({ 
          message: "Invalid environment variable data", 
          errors: validatedEnvVar.error.errors 
        });
      }
      
      const envVar = await storage.createEnvVar(validatedEnvVar.data);
      
      res.json(envVar);
    } catch (error) {
      console.error("Error adding env var:", error);
      res.status(500).json({ message: "Failed to add environment variable" });
    }
  });

  // Delete environment variable
  app.delete("/api/bots/:id/env/:envId", isAuthenticated, async (req: any, res) => {
    try {
      const botId = parseInt(req.params.id);
      const envId = parseInt(req.params.envId);
      const bot = await storage.getBotById(botId);
      
      if (!bot || bot.userId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Bot not found" });
      }
      
      await storage.deleteEnvVar(envId);
      res.json({ message: "Environment variable deleted" });
    } catch (error) {
      console.error("Error deleting env var:", error);
      res.status(500).json({ message: "Failed to delete environment variable" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time logs - from javascript_websocket blueprint
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    let botId: string | null = null;

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'subscribe' && data.botId) {
          const subscribeBotId = String(data.botId);
          botId = subscribeBotId;
          if (!wsClients.has(subscribeBotId)) {
            wsClients.set(subscribeBotId, new Set());
          }
          wsClients.get(subscribeBotId)!.add(ws);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (botId && wsClients.has(botId)) {
        wsClients.get(botId)!.delete(ws);
        if (wsClients.get(botId)!.size === 0) {
          wsClients.delete(botId);
        }
      }
    });
  });

  return httpServer;
}

// Shared function to launch a bot
async function launchBot(botId: number) {
  const bot = await storage.getBotById(botId);
  
  if (!bot) {
    throw new Error("Bot not found");
  }
  
  if (bot.status === 'running') {
    throw new Error("Bot is already running");
  }
  
  // Get environment variables
  const envVars = await storage.getEnvVarsByBotId(botId);
  const botEnv: Record<string, string> = { ...process.env } as Record<string, string>;
  envVars.forEach(v => { botEnv[v.key] = v.value; });
  
  // Find entry point in bot directory
  const botDir = bot.extractedPath!;
  const files = await promisify(fs.readdir)(botDir);
  let entryPoint: string | undefined;
  
  if (bot.runtime === 'python') {
    // Look for common Python entry points
    if (files.includes('main.py')) entryPoint = 'main.py';
    else if (files.includes('bot.py')) entryPoint = 'bot.py';
    else if (files.includes('app.py')) entryPoint = 'app.py';
    else if (files.includes('__main__.py')) entryPoint = '__main__.py';
    
    if (!entryPoint) {
      throw new Error('No Python entry point found (main.py, bot.py, app.py, or __main__.py)');
    }
  } else {
    // Look for common Node.js entry points
    if (files.includes('index.js')) entryPoint = 'index.js';
    else if (files.includes('bot.js')) entryPoint = 'bot.js';
    else if (files.includes('app.js')) entryPoint = 'app.js';
    else if (files.includes('main.js')) entryPoint = 'main.js';
    
    if (!entryPoint) {
      throw new Error('No Node.js entry point found (index.js, bot.js, app.js, or main.js)');
    }
  }
  
  // Start bot process
  const { spawn } = require('child_process');
  let command: string;
  let args: string[];
  
  if (bot.runtime === 'python') {
    command = 'python3';
    args = [entryPoint];
  } else {
    command = 'node';
    args = [entryPoint];
  }
  
  const botProcess = spawn(command, args, {
    cwd: botDir,
    env: botEnv,
  });
  
  // Store process
  botProcesses.set(botId, botProcess);
  
  // Handle process output
  botProcess.stdout.on('data', (data: Buffer) => {
    const log = data.toString();
    broadcastLog(botId.toString(), log);
  });
  
  botProcess.stderr.on('data', (data: Buffer) => {
    const log = `[ERROR] ${data.toString()}`;
    broadcastLog(botId.toString(), log);
  });
  
  botProcess.on('exit', async (code: number | null) => {
    botProcesses.delete(botId);
    if (code !== 0 && code !== null) {
      await storage.updateBot(botId, { 
        status: 'error', 
        errorMessage: `Process exited with code ${code}` 
      });
    } else {
      await storage.updateBot(botId, { status: 'stopped' });
    }
  });
  
  // Update bot status
  const updatedBot = await storage.updateBot(botId, { 
    status: 'running',
    processId: botProcess.pid?.toString(),
    errorMessage: null,
  });
  
  return updatedBot;
}

// Broadcast log to all connected clients for a bot
function broadcastLog(botId: string, message: string) {
  const clients = wsClients.get(botId);
  if (clients) {
    const data = JSON.stringify({ type: 'log', botId, message });
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
}
