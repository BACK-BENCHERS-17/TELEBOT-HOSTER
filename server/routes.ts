// API Routes and WebSocket setup
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { spawn } from "child_process";
import multer from "multer";
import path from "path";
import fs from "fs";
import { promisify } from "util";
import unzipper from "unzipper";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./tokenAuth";
import { ADMIN_CREDENTIALS, DEVELOPER_CONTACT } from "./adminConfig";
import { insertBotSchema, insertEnvVarSchema, insertAccessTokenSchema } from "@shared/schema";
import { nanoid } from "nanoid";

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
  setupAuth(app);

  // Token login route
  app.post('/api/auth/token-login', async (req: any, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      const accessToken = await storage.getTokenByValue(token);
      
      if (!accessToken || accessToken.isActive !== 'true') {
        return res.status(401).json({ message: "Invalid or inactive token" });
      }

      const user = await storage.getUser(accessToken.userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      req.session.userId = user.id;
      req.session.save();
      
      res.json({ user });
    } catch (error) {
      console.error("Error during token login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Admin login route
  app.post('/api/auth/admin-login', async (req: any, res) => {
    try {
      const { username, password } = req.body;
      
      if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        req.session.isAdmin = true;
        req.session.save();
        res.json({ success: true });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      console.error("Error during admin login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout route
  app.post('/api/auth/logout', async (req: any, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  // Get current user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      res.json(req.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Check admin status
  app.get('/api/auth/admin-check', async (req: any, res) => {
    res.json({ isAdmin: !!req.session.isAdmin });
  });

  // Get developer contact info
  app.get('/api/auth/contact-info', async (req, res) => {
    res.json({ contact: DEVELOPER_CONTACT });
  });

  // Admin routes for token management
  app.get('/api/admin/users', isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/tokens', isAdmin, async (req: any, res) => {
    try {
      const tokens = await storage.getAllTokens();
      const tokensWithUsers = await Promise.all(
        tokens.map(async (token) => {
          const user = await storage.getUser(token.userId);
          return { ...token, user };
        })
      );
      res.json(tokensWithUsers);
    } catch (error) {
      console.error("Error fetching tokens:", error);
      res.status(500).json({ message: "Failed to fetch tokens" });
    }
  });

  app.post('/api/admin/users', isAdmin, async (req: any, res) => {
    try {
      const { email, firstName, lastName } = req.body;
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      const user = await storage.createUser({
        email,
        firstName,
        lastName,
      });
      
      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.post('/api/admin/tokens', isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const token = nanoid(32);
      const accessToken = await storage.createToken({
        token,
        userId,
        isActive: 'true',
        createdBy: 'admin',
      });
      
      res.json(accessToken);
    } catch (error) {
      console.error("Error creating token:", error);
      res.status(500).json({ message: "Failed to create token" });
    }
  });

  app.patch('/api/admin/tokens/:id', isAdmin, async (req: any, res) => {
    try {
      const tokenId = parseInt(req.params.id);
      const { isActive } = req.body;
      
      const updatedToken = await storage.updateToken(tokenId, { isActive });
      res.json(updatedToken);
    } catch (error) {
      console.error("Error updating token:", error);
      res.status(500).json({ message: "Failed to update token" });
    }
  });

  app.delete('/api/admin/tokens/:id', isAdmin, async (req: any, res) => {
    try {
      const tokenId = parseInt(req.params.id);
      await storage.deleteToken(tokenId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting token:", error);
      res.status(500).json({ message: "Failed to delete token" });
    }
  });

  // Get all bots for current user
  app.get("/api/bots", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      if (bot.userId !== req.user.id) {
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
      const userId = req.user.id;
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
      
      // Find bot directory and entry point (handle nested folders)
      let botDirectory = extractPath;
      let entryPointPath: string | undefined;
      
      const findBotFiles = async (dir: string, basePath: string): Promise<{ 
        hasRequirementsTxt: boolean; 
        hasPackageJson: boolean; 
        dependencyDir?: string;
        entryPointPath?: string;
        foundFiles?: string[];
      }> => {
        const files = await promisify(fs.readdir)(dir);
        let hasRequirementsTxt = false;
        let hasPackageJson = false;
        let localEntryPoint: string | undefined;
        let dependencyDir: string | undefined;
        let entryPointPath: string | undefined;
        let foundFiles: string[] = [];
        
        // Check files in current directory
        let pythonFiles: string[] = [];
        let jsFiles: string[] = [];
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = await promisify(fs.stat)(filePath);
          
          if (!stat.isDirectory()) {
            foundFiles.push(file);
            
            const lowerFile = file.toLowerCase();
            
            if (lowerFile === 'requirements.txt') {
              hasRequirementsTxt = true;
              dependencyDir = dir;
            }
            if (lowerFile === 'pyproject.toml' || lowerFile === 'uv.lock') {
              hasRequirementsTxt = true; // Treat pyproject.toml/uv.lock as Python dependencies
              dependencyDir = dir;
            }
            if (lowerFile === 'package.json') {
              hasPackageJson = true;
              dependencyDir = dir;
            }
            // Check for preferred entry points (case-insensitive)
            if (lowerFile === 'main.py' || lowerFile === 'bot.py' || lowerFile === 'app.py' || lowerFile === '__main__.py') {
              localEntryPoint = file;
            }
            if (lowerFile === 'index.js' || lowerFile === 'bot.js' || lowerFile === 'app.js' || lowerFile === 'main.js') {
              localEntryPoint = file;
            }
            // Collect all Python and JS files as fallback options
            if (lowerFile.endsWith('.py')) {
              pythonFiles.push(file);
            }
            if (lowerFile.endsWith('.js')) {
              jsFiles.push(file);
            }
          }
        }
        
        // If no preferred entry point found, use any .py or .js file as fallback
        if (!localEntryPoint) {
          if (hasRequirementsTxt && pythonFiles.length > 0) {
            localEntryPoint = pythonFiles[0];
          } else if (hasPackageJson && jsFiles.length > 0) {
            localEntryPoint = jsFiles[0];
          }
        }
        
        // If we found both dependency manifest and entry point here, use this directory
        if ((hasRequirementsTxt || hasPackageJson) && localEntryPoint) {
          entryPointPath = path.relative(basePath, path.join(dir, localEntryPoint));
          return { hasRequirementsTxt, hasPackageJson, dependencyDir, entryPointPath, foundFiles };
        }
        
        // If we found dependency manifest but no entry point, search subdirectories for entry point
        if (hasRequirementsTxt || hasPackageJson) {
          if (!localEntryPoint) {
            // Search subdirectories for entry point
            for (const file of files) {
              const filePath = path.join(dir, file);
              const stat = await promisify(fs.stat)(filePath);
              if (stat.isDirectory()) {
                const subResult = await findBotFiles(filePath, basePath);
                if (subResult.entryPointPath) {
                  return {
                    hasRequirementsTxt,
                    hasPackageJson,
                    dependencyDir,
                    entryPointPath: subResult.entryPointPath,
                    foundFiles: [...foundFiles, ...(subResult.foundFiles || [])]
                  };
                }
              }
            }
          } else {
            // Calculate relative path for local entry point
            entryPointPath = path.relative(basePath, path.join(dir, localEntryPoint));
          }
          // Return with whatever we found
          return { hasRequirementsTxt, hasPackageJson, dependencyDir, entryPointPath, foundFiles };
        }
        
        // No manifest found, recursively search subdirectories
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = await promisify(fs.stat)(filePath);
          if (stat.isDirectory()) {
            const subResult = await findBotFiles(filePath, basePath);
            if (subResult.hasRequirementsTxt || subResult.hasPackageJson) {
              return { ...subResult, foundFiles: [...foundFiles, ...(subResult.foundFiles || [])] };
            }
          }
        }
        
        return { hasRequirementsTxt, hasPackageJson, foundFiles };
      };
      
      const { hasRequirementsTxt, hasPackageJson, dependencyDir, entryPointPath: foundEntryPoint, foundFiles } = await findBotFiles(extractPath, extractPath);
      botDirectory = dependencyDir || extractPath;
      // Make entryPoint relative to botDirectory, not extractPath
      if (foundEntryPoint) {
        const fullEntryPath = path.join(extractPath, foundEntryPoint);
        entryPointPath = path.relative(botDirectory, fullEntryPath);
      }
      
      console.log(`[Bot Deploy] Found files: ${foundFiles?.join(', ') || 'none'}`);
      console.log(`[Bot Deploy] Entry point: ${entryPointPath || 'not found'}`);
      
      // Validate runtime matches
      if (runtime === 'python' && !hasRequirementsTxt) {
        await unlinkAsync(zipPath);
        await promisify(fs.rm)(extractPath, { recursive: true, force: true });
        return res.status(400).json({ 
          message: `Error: requirements.txt, pyproject.toml, or uv.lock not found. Python bots must include one of these files. Found files: ${foundFiles?.join(', ') || 'none'}` 
        });
      }
      
      if (runtime === 'nodejs' && !hasPackageJson) {
        await unlinkAsync(zipPath);
        await promisify(fs.rm)(extractPath, { recursive: true, force: true });
        return res.status(400).json({ 
          message: `Error: package.json not found. Node.js bots must include package.json. Found files: ${foundFiles?.join(', ') || 'none'}` 
        });
      }
      
      // Validate entry point was found
      if (!entryPointPath) {
        await unlinkAsync(zipPath);
        await promisify(fs.rm)(extractPath, { recursive: true, force: true });
        const expectedFiles = runtime === 'python' 
          ? 'main.py, bot.py, app.py, or __main__.py'
          : 'index.js, bot.js, app.js, or main.js';
        return res.status(400).json({ 
          message: `Error: No entry point found. ${runtime === 'python' ? 'Python' : 'Node.js'} bots must include ${expectedFiles}. Found files: ${foundFiles?.join(', ') || 'none'}` 
        });
      }
      
      // Install dependencies
      if (runtime === 'python' && hasRequirementsTxt) {
        try {
          // Check if we have uv.lock or pyproject.toml (use uv) or requirements.txt (use pip)
          const files = await promisify(fs.readdir)(botDirectory);
          const hasUvLock = files.some(f => f.toLowerCase() === 'uv.lock');
          const hasPyproject = files.some(f => f.toLowerCase() === 'pyproject.toml');
          const hasRequirements = files.some(f => f.toLowerCase() === 'requirements.txt');
          
          let useUv = hasUvLock || (hasPyproject && !hasRequirements);
          
          if (useUv) {
            // Use uv to install dependencies
            await new Promise<void>((resolve, reject) => {
              let stdoutData = '';
              let stderrData = '';
              
              console.log(`[Bot Deploy] Using uv to install dependencies`);
              const installer = spawn('uv', ['sync'], {
                cwd: botDirectory,
                stdio: 'pipe',
                env: { ...process.env }
              });
              
              installer.stdout?.on('data', (data) => {
                stdoutData += data.toString();
                console.log(`[Bot Deploy] uv stdout: ${data.toString().trim()}`);
              });
              
              installer.stderr?.on('data', (data) => {
                stderrData += data.toString();
                console.error(`[Bot Deploy] uv stderr: ${data.toString().trim()}`);
              });
              
              installer.on('error', (err) => {
                console.error(`[Bot Deploy] Failed to spawn uv:`, err);
                reject(new Error(`Failed to start uv: ${err.message}`));
              });
              
              installer.on('close', (code: number | null) => {
                if (code === 0) {
                  console.log(`✓ Installed Python dependencies for ${name}`);
                  resolve();
                } else {
                  const errorMsg = stderrData || stdoutData || `Unknown error (exit code: ${code})`;
                  console.error(`[Bot Deploy] uv failed with code ${code}. Error: ${errorMsg}`);
                  reject(new Error(`Failed to install Python dependencies: ${errorMsg}`));
                }
              });
            });
          } else {
            // Create virtual environment for pip-based bots
            const venvPath = path.join(botDirectory, '.venv');
            console.log(`[Bot Deploy] Creating virtual environment at ${venvPath}`);
            
            // Create venv
            await new Promise<void>((resolve, reject) => {
              const venv = spawn('python3', ['-m', 'venv', '.venv'], {
                cwd: botDirectory,
                stdio: 'pipe'
              });
              
              venv.on('error', (err) => {
                console.error(`[Bot Deploy] Failed to create venv:`, err);
                reject(new Error(`Failed to create virtual environment: ${err.message}`));
              });
              
              venv.on('close', (code: number | null) => {
                if (code === 0) {
                  console.log(`[Bot Deploy] Virtual environment created`);
                  resolve();
                } else {
                  reject(new Error(`Failed to create virtual environment (exit code: ${code})`));
                }
              });
            });
            
            // Install dependencies using python -m pip (more reliable)
            await new Promise<void>((resolve, reject) => {
              let stdoutData = '';
              let stderrData = '';
              
              console.log(`[Bot Deploy] Installing dependencies using venv pip`);
              
              // Use the venv's python to run pip
              const pythonPath = path.join(venvPath, 'bin', 'python');
              const installer = spawn(pythonPath, ['-m', 'pip', 'install', '-r', 'requirements.txt'], {
                cwd: botDirectory,
                stdio: 'pipe',
                env: { ...process.env }
              });
              
              installer.stdout?.on('data', (data) => {
                stdoutData += data.toString();
                console.log(`[Bot Deploy] pip stdout: ${data.toString().trim()}`);
              });
              
              installer.stderr?.on('data', (data) => {
                stderrData += data.toString();
                console.error(`[Bot Deploy] pip stderr: ${data.toString().trim()}`);
              });
              
              installer.on('error', (err) => {
                console.error(`[Bot Deploy] Failed to spawn pip:`, err);
                reject(new Error(`Failed to start pip: ${err.message}`));
              });
              
              installer.on('close', (code: number | null) => {
                if (code === 0) {
                  console.log(`✓ Installed Python dependencies for ${name}`);
                  resolve();
                } else {
                  const errorMsg = stderrData || stdoutData || `Unknown error (exit code: ${code})`;
                  console.error(`[Bot Deploy] pip failed with code ${code}. Error: ${errorMsg}`);
                  reject(new Error(`Failed to install Python dependencies: ${errorMsg}`));
                }
              });
            });
          }
        } catch (error: any) {
          console.error(`[Bot Deploy] Dependency installation error:`, error);
          await unlinkAsync(zipPath);
          await promisify(fs.rm)(extractPath, { recursive: true, force: true });
          return res.status(500).json({ 
            message: `Failed to install dependencies: ${error.message}` 
          });
        }
      }
      
      if (runtime === 'nodejs' && hasPackageJson) {
        try {
          await new Promise<void>((resolve, reject) => {
            const npm = spawn('npm', ['install'], {
              cwd: botDirectory,
              stdio: 'pipe'
            });
            
            npm.on('error', (err: any) => {
              console.error(`[Bot Deploy] Failed to spawn npm:`, err);
              reject(new Error(`Failed to start npm: ${err.message}`));
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
        } catch (error: any) {
          console.error(`[Bot Deploy] Dependency installation error:`, error);
          await unlinkAsync(zipPath);
          await promisify(fs.rm)(extractPath, { recursive: true, force: true });
          return res.status(500).json({ 
            message: `Failed to install dependencies: ${error.message}` 
          });
        }
      }
      
      // Create bot record
      const bot = await storage.createBot({
        userId,
        name: validatedBot.data.name,
        runtime: validatedBot.data.runtime,
        status: 'stopped',
        zipPath,
        extractedPath: botDirectory, // Directory where dependencies are installed
        entryPoint: entryPointPath, // Relative path to entry file from botDirectory
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
      
      if (!bot || bot.userId !== req.user.id) {
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
      
      if (!bot || bot.userId !== req.user.id) {
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
      
      if (!bot || bot.userId !== req.user.id) {
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
      
      if (!bot || bot.userId !== req.user.id) {
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
      
      if (!bot || bot.userId !== req.user.id) {
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
      
      if (!bot || bot.userId !== req.user.id) {
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
      
      if (!bot || bot.userId !== req.user.id) {
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
  
  // Get the entry point - use stored path or search for it
  let entryPointRelativePath: string;
  
  if (bot.entryPoint) {
    // Use the stored entry point path (relative to extractedPath)
    entryPointRelativePath = bot.entryPoint;
  } else {
    // Fallback: search for entry point in extracted directory
    const extractedDir = bot.extractedPath!;
    const files = await promisify(fs.readdir)(extractedDir);
    
    if (bot.runtime === 'python') {
      if (files.includes('main.py')) entryPointRelativePath = 'main.py';
      else if (files.includes('bot.py')) entryPointRelativePath = 'bot.py';
      else if (files.includes('app.py')) entryPointRelativePath = 'app.py';
      else if (files.includes('__main__.py')) entryPointRelativePath = '__main__.py';
      else throw new Error('No Python entry point found');
    } else {
      if (files.includes('index.js')) entryPointRelativePath = 'index.js';
      else if (files.includes('bot.js')) entryPointRelativePath = 'bot.js';
      else if (files.includes('app.js')) entryPointRelativePath = 'app.js';
      else if (files.includes('main.js')) entryPointRelativePath = 'main.js';
      else throw new Error('No Node.js entry point found');
    }
  }
  
  // Build full path to entry point
  const extractedPath = bot.extractedPath!;
  const fullEntryPath = path.join(extractedPath, entryPointRelativePath);
  const workingDir = path.dirname(fullEntryPath);
  const entryFileName = path.basename(fullEntryPath);
  
  // Start bot process
  let command: string;
  let args: string[];
  
  if (bot.runtime === 'python') {
    // Check if virtual environment exists
    const venvPythonPath = path.join(workingDir, '.venv', 'bin', 'python');
    const uvPythonPath = path.join(workingDir, '.venv', 'bin', 'python');
    
    try {
      await promisify(fs.access)(venvPythonPath, fs.constants.X_OK);
      // venv exists and is executable, use it
      command = venvPythonPath;
      console.log(`[Bot ${botId}] Using virtual environment Python: ${venvPythonPath}`);
    } catch {
      // Check for uv's .venv
      try {
        await promisify(fs.access)(uvPythonPath, fs.constants.X_OK);
        command = uvPythonPath;
        console.log(`[Bot ${botId}] Using uv virtual environment Python: ${uvPythonPath}`);
      } catch {
        // No venv, use system python
        command = 'python3';
        console.log(`[Bot ${botId}] Using system Python`);
      }
    }
    args = [entryFileName];
  } else {
    command = 'node';
    args = [entryFileName];
  }
  
  const botProcess = spawn(command, args, {
    cwd: workingDir,
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
