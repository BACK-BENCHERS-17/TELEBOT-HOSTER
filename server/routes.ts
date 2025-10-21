// API Routes and WebSocket setup
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { spawn, execSync } from "child_process";
import multer from "multer";
import path from "path";
import fs from "fs";
import { promisify } from "util";
import unzipper from "unzipper";
import archiver from "archiver";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./tokenAuth";
import { ADMIN_CREDENTIALS, DEVELOPER_CONTACT } from "./adminConfig";
import { insertBotSchema, insertEnvVarSchema, insertAccessTokenSchema } from "@shared/schema";
import { nanoid } from "nanoid";

const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);

// Find system Python - works on Render, Replit, and other platforms
function findSystemPython(): string {
  try {
    // Try to find python3 using 'which' command
    const pythonPath = execSync('which python3', { encoding: 'utf-8' }).trim();
    if (pythonPath && fs.existsSync(pythonPath)) {
      return pythonPath;
    }
  } catch {
    // 'which' command failed, try common paths
  }
  
  // Common Python paths across different platforms
  const commonPaths = [
    '/usr/bin/python3',                                        // Most Linux systems, Render
    '/usr/local/bin/python3',                                  // macOS, some Linux
    '/home/runner/workspace/.pythonlibs/bin/python3',          // Replit
    '/opt/render/project/.pythonlibs/bin/python3',            // Render with Python buildpack
  ];
  
  for (const pythonPath of commonPaths) {
    if (fs.existsSync(pythonPath)) {
      return pythonPath;
    }
  }
  
  // Fall back to just 'python3' and hope it's in PATH
  return 'python3';
}

// Check if uv is available on the system
function isUvAvailable(): boolean {
  try {
    execSync('which uv', { encoding: 'utf-8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

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

  // Logout route (both GET and POST for compatibility)
  app.post('/api/auth/logout', async (req: any, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get('/api/logout', async (req: any, res) => {
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

  // Alive/health check endpoint for uptime monitoring
  app.get('/api/alive', (req, res) => {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: 'Server is running'
    });
  });

  // Download project as zip (admin only)
  app.get('/api/admin/download-project', isAdmin, async (req: any, res) => {
    try {
      const projectRoot = path.resolve(process.cwd());
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const zipFileName = `telebot-hoster-${timestamp}.zip`;

      // Set response headers
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

      // Create archive
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      // Handle archive errors
      archive.on('error', (err: Error) => {
        console.error('Archive error:', err);
        res.status(500).json({ message: 'Failed to create archive' });
      });

      // Pipe archive data to response
      archive.pipe(res);

      // Files and directories to exclude
      const excludePatterns = [
        'node_modules',
        '.git',
        '.cache',
        'dist',
        'logs',
        '.env',
        '.replit',
        '.upm',
        '*.log',
        '.DS_Store',
        'Thumbs.db',
        'uploads/*.zip',
        'uploads/*.tar.gz'
      ];

      // Add all files except excluded ones
      archive.glob('**/*', {
        cwd: projectRoot,
        ignore: excludePatterns,
        dot: true // Include hidden files like .gitignore, .env.example
      });

      // Finalize the archive
      await archive.finalize();

      console.log(`[Admin] Project downloaded as ${zipFileName}`);
    } catch (error) {
      console.error('Error creating project zip:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to download project' });
      }
    }
  });

  // Push to GitHub (admin only)
  app.post('/api/admin/github-push', isAdmin, async (req: any, res) => {
    try {
      const { repoUrl, branch, token, commitMessage, forcePush } = req.body;

      // Validate inputs
      if (!repoUrl || !token) {
        return res.status(400).json({ message: 'Repository URL and GitHub token are required' });
      }

      // Validate repository URL format - allow dots and common GitHub repo name characters
      const urlPattern = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?$/;
      const trimmedRepoUrl = repoUrl.trim();
      
      if (!urlPattern.test(trimmedRepoUrl) || trimmedRepoUrl.includes(' ')) {
        return res.status(400).json({ 
          message: 'Invalid repository URL. Must be in format: https://github.com/username/repository' 
        });
      }

      // Validate branch name - allow dots, hyphens, underscores, slashes (common in release branches)
      const finalBranch = (branch || 'main').trim();
      const branchPattern = /^[\w.\/-]+$/;
      
      if (!branchPattern.test(finalBranch) || finalBranch.includes(' ')) {
        return res.status(400).json({ 
          message: 'Invalid branch name. Cannot contain spaces or special characters except . - / _' 
        });
      }

      const defaultMessage = `Update from admin panel - ${new Date().toISOString()}`;
      const finalMessage = (commitMessage || defaultMessage).trim();
      
      // Sanitize commit message - remove quotes and special chars that could break git
      const sanitizedMessage = finalMessage.replace(/["'`\\$]/g, '').trim();
      
      // Fall back to default message if sanitization removed everything
      const commitMsg = sanitizedMessage.length > 0 ? sanitizedMessage : defaultMessage;

      console.log('[GitHub Push] Starting push process...');
      
      // Execute git commands safely using spawn
      try {
        // Helper function to run git commands safely with credentials in env
        const runGitCommand = (args: string[], useCredentials = false): Promise<string> => {
          return new Promise((resolve, reject) => {
            const envVars = { ...process.env };
            
            if (useCredentials) {
              // Use authenticated URL with token directly in URL (secure as it's only in memory)
              // This avoids writing credentials to disk
              envVars.GIT_TERMINAL_PROMPT = '0';
            }
            
            const git = spawn('git', args, { 
              stdio: 'pipe',
              env: envVars
            });
            
            let stdout = '';
            let stderr = '';
            
            git.stdout?.on('data', (data) => {
              stdout += data.toString();
            });
            
            git.stderr?.on('data', (data) => {
              stderr += data.toString();
            });
            
            git.on('error', (err) => {
              reject(new Error(`Failed to execute git: ${err.message}`));
            });
            
            git.on('close', (code) => {
              if (code === 0) {
                resolve(stdout);
              } else {
                reject(new Error(stderr || stdout || `Git command failed with exit code ${code}`));
              }
            });
          });
        };

        // Configure git user if not already set
        try {
          await runGitCommand(['config', 'user.email']);
        } catch {
          await runGitCommand(['config', 'user.email', 'admin@telebot-hoster.local']);
          await runGitCommand(['config', 'user.name', 'Telebot Hoster Admin']);
        }

        // Add all files
        console.log('[GitHub Push] Adding files...');
        await runGitCommand(['add', '.']);

        // Check if there are changes to commit
        let hasChanges = false;
        try {
          const status = await runGitCommand(['status', '--porcelain']);
          hasChanges = status.trim().length > 0;
        } catch {
          hasChanges = true;
        }

        if (hasChanges) {
          // Commit changes
          console.log('[GitHub Push] Committing changes...');
          await runGitCommand(['commit', '-m', commitMsg]);
        } else {
          console.log('[GitHub Push] No changes to commit');
        }

        // Push to GitHub using GIT_ASKPASS (secure with temporary script and proper cleanup)
        console.log('[GitHub Push] Pushing to GitHub...');
        
        const askPassScript = path.join('/tmp', `git-askpass-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.sh`);
        const scriptContent = `#!/bin/sh\ncase "$1" in\n  Username*) echo "x-access-token" ;;\n  Password*) echo "${token.replace(/"/g, '\\"')}" ;;\n  *) echo "${token.replace(/"/g, '\\"')}" ;;\nesac`;
        
        // Create askpass script with restrictive permissions (only readable/executable by owner)
        await promisify(fs.writeFile)(askPassScript, scriptContent, { mode: 0o700 });
        
        try {
          await new Promise<void>((resolve, reject) => {
            const pushArgs = forcePush 
              ? ['push', trimmedRepoUrl, finalBranch, '--force']
              : ['push', trimmedRepoUrl, finalBranch];
              
            const git = spawn('git', pushArgs, {
              stdio: 'pipe',
              env: {
                ...process.env,
                GIT_ASKPASS: askPassScript,
                GIT_TERMINAL_PROMPT: '0',
              }
            });
            
            let stdout = '';
            let stderr = '';
            
            git.stdout?.on('data', (data) => {
              stdout += data.toString();
            });
            
            git.stderr?.on('data', (data) => {
              stderr += data.toString();
            });
            
            git.on('error', (err) => {
              reject(new Error(`Failed to execute git push: ${err.message}`));
            });
            
            git.on('close', (code) => {
              if (code === 0) {
                resolve();
              } else {
                // Sanitize error message to remove any token traces
                const sanitizedError = stderr.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[REDACTED]');
                reject(new Error(sanitizedError || stdout || `Push failed with exit code ${code}`));
              }
            });
          });
        } finally {
          // Always clean up askpass script, even if push fails
          try {
            await unlinkAsync(askPassScript);
          } catch (cleanupErr) {
            console.error('[GitHub Push] Warning: Failed to clean up askpass script:', cleanupErr);
          }
        }

        console.log('[GitHub Push] Successfully pushed to GitHub');
        
        res.json({ 
          success: true, 
          message: 'Successfully pushed to GitHub',
          hasChanges,
          branch: finalBranch
        });
      } catch (error: any) {
        const errorMsg = error.message || '';
        console.error('[GitHub Push] Git command failed:', errorMsg);
        
        // Determine appropriate error type and status code
        if (errorMsg.includes('fetch first') || errorMsg.includes('rejected') || errorMsg.includes('! [rejected]')) {
          return res.status(409).json({
            message: 'Remote has changes not present locally',
            details: 'Enable "Force Push" to overwrite remote changes, or pull changes manually first.',
            errorType: 'merge_required'
          });
        }
        
        if (errorMsg.includes('Authentication failed') || errorMsg.includes('Invalid username or password') || errorMsg.includes('403')) {
          return res.status(401).json({
            message: 'GitHub authentication failed',
            details: 'Please check your GitHub token has the required permissions (repo scope).',
            errorType: 'auth_failed'
          });
        }
        
        if (errorMsg.includes('Could not resolve host') || errorMsg.includes('Failed to connect')) {
          return res.status(503).json({
            message: 'Network error',
            details: 'Unable to connect to GitHub. Please check your internet connection.',
            errorType: 'network_error'
          });
        }
        
        if (errorMsg.includes('Repository not found') || errorMsg.includes('404')) {
          return res.status(404).json({
            message: 'Repository not found',
            details: 'The specified GitHub repository does not exist or you don\'t have access to it.',
            errorType: 'repo_not_found'
          });
        }
        
        // Generic git error
        throw new Error(`Git operation failed: ${errorMsg}`);
      }
    } catch (error: any) {
      // Log error securely (ensure no token leakage)
      const safeErrorMsg = error.message ? error.message.replace(/ghp_[a-zA-Z0-9]+/g, '[REDACTED]') : 'Unknown error';
      console.error('[GitHub Push] Error:', safeErrorMsg);
      
      // Return generic 500 for unhandled errors
      res.status(500).json({ 
        message: safeErrorMsg || 'Failed to push to GitHub',
        details: 'An unexpected error occurred. Check server logs for more information.',
        errorType: 'unknown_error'
      });
    }
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
      const { email, firstName, lastName, tier, usageLimit, autoRestart } = req.body;
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      const user = await storage.createUser({
        email,
        firstName,
        lastName,
        tier: tier || 'FREE',
        usageCount: 0,
        usageLimit: tier === 'PREMIUM' ? 999999 : (usageLimit || 5),
        autoRestart: autoRestart || (tier === 'PREMIUM' ? 'true' : 'false'),
      });
      
      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch('/api/admin/users/:id', isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const { tier, usageLimit, autoRestart, usageCount } = req.body;
      
      const updates: any = {};
      if (tier !== undefined) updates.tier = tier;
      if (usageLimit !== undefined) updates.usageLimit = usageLimit;
      if (autoRestart !== undefined) updates.autoRestart = autoRestart;
      if (usageCount !== undefined) updates.usageCount = usageCount;
      
      const updatedUser = await storage.updateUser(userId, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.post('/api/admin/tokens', isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const randomPart = nanoid(8).toUpperCase();
      const token = `BACK-${randomPart}`;
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
      
      // Check user tier and usage limits
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.tier === 'FREE' && user.usageCount >= user.usageLimit) {
        return res.status(403).json({ 
          message: "Usage limit reached. Please upgrade to PREMIUM for unlimited usage.",
          usageCount: user.usageCount,
          usageLimit: user.usageLimit
        });
      }
      
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
          
          // Only use uv if it's available AND we have uv-specific files
          const uvAvailable = isUvAvailable();
          let useUv = uvAvailable && (hasUvLock || (hasPyproject && !hasRequirements));
          
          if (!uvAvailable && hasUvLock) {
            console.log(`[Bot Deploy] Warning: uv.lock found but uv is not installed. Falling back to pip with requirements.txt`);
          }
          
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
                  console.log(`✓ Installed Python dependencies using uv for ${name}`);
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
            const absoluteBotDir = path.resolve(botDirectory);
            const venvPath = path.join(absoluteBotDir, '.venv');
            console.log(`[Bot Deploy] Creating virtual environment at ${venvPath}`);
            
            // Create venv
            await new Promise<void>((resolve, reject) => {
              const venv = spawn('python3', ['-m', 'venv', '.venv'], {
                cwd: absoluteBotDir,
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
              
              // Use the venv's python to run pip - use absolute path
              const pythonPath = path.resolve(path.join(venvPath, 'bin', 'python'));
              console.log(`[Bot Deploy] Using Python at: ${pythonPath}`);
              
              // Check if python exists in venv
              if (!fs.existsSync(pythonPath)) {
                reject(new Error(`Virtual environment Python not found at ${pythonPath}`));
                return;
              }
              
              const installer = spawn(pythonPath, ['-m', 'pip', 'install', '--no-user', '-r', 'requirements.txt'], {
                cwd: absoluteBotDir,
                stdio: 'pipe',
                env: { ...process.env, PIP_USER: '0' }
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
      
      // Increment usage count for FREE tier users
      if (user.tier === 'FREE') {
        await storage.incrementUsage(userId);
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

  // Update bot settings
  app.patch("/api/bots/:id/settings", isAuthenticated, async (req: any, res) => {
    try {
      const botId = parseInt(req.params.id);
      const bot = await storage.getBotById(botId);
      
      if (!bot || bot.userId !== req.user.id) {
        return res.status(404).json({ message: "Bot not found" });
      }
      
      const { name, description, entryPoint } = req.body;
      const updates: any = {};
      
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (entryPoint !== undefined) updates.entryPoint = entryPoint;
      
      const updatedBot = await storage.updateBot(botId, updates);
      res.json(updatedBot);
    } catch (error) {
      console.error("Error updating bot settings:", error);
      res.status(500).json({ message: "Failed to update bot settings" });
    }
  });

  // Get bot resource stats (CPU and RAM)
  app.get("/api/bots/:id/stats", isAuthenticated, async (req: any, res) => {
    try {
      const botId = parseInt(req.params.id);
      const bot = await storage.getBotById(botId);
      
      if (!bot || bot.userId !== req.user.id) {
        return res.status(404).json({ message: "Bot not found" });
      }
      
      const process = botProcesses.get(botId);
      
      if (!process || bot.status !== 'running') {
        return res.json({ cpu: 0, memory: 0, running: false });
      }
      
      // Get process stats using pidusage library would be ideal, but for MVP we'll simulate
      // In production, you'd use: const stats = await pidusage(process.pid);
      const stats = {
        cpu: Math.random() * 30, // Simulated 0-30% CPU
        memory: Math.random() * 100 * 1024 * 1024, // Simulated 0-100MB RAM in bytes
        running: true
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching bot stats:", error);
      res.status(500).json({ message: "Failed to fetch bot stats" });
    }
  });

  // Add package to bot dependencies
  app.post("/api/bots/:id/packages", isAuthenticated, async (req: any, res) => {
    try {
      const botId = parseInt(req.params.id);
      const bot = await storage.getBotById(botId);
      
      if (!bot || bot.userId !== req.user.id) {
        return res.status(404).json({ message: "Bot not found" });
      }
      
      const { packageName } = req.body;
      
      if (!packageName) {
        return res.status(400).json({ message: "Package name is required" });
      }
      
      const botDirectory = bot.extractedPath!;
      
      // Add package based on runtime
      if (bot.runtime === 'python') {
        const requirementsPath = path.join(botDirectory, 'requirements.txt');
        let requirements = '';
        
        if (fs.existsSync(requirementsPath)) {
          requirements = await promisify(fs.readFile)(requirementsPath, 'utf-8');
        }
        
        // Check if package already exists
        if (!requirements.split('\n').some(line => line.trim().startsWith(packageName))) {
          requirements += `\n${packageName}`;
          await promisify(fs.writeFile)(requirementsPath, requirements.trim() + '\n', 'utf-8');
        }
        
        // Install the package using venv's python if it exists
        await new Promise<void>((resolve, reject) => {
          const venvPython = path.join(botDirectory, '.venv', 'bin', 'python');
          const usePython = fs.existsSync(venvPython) ? venvPython : 'python3';
          const args = fs.existsSync(venvPython) ? ['-m', 'pip', 'install', '--no-user', packageName] : ['install', packageName];
          const command = fs.existsSync(venvPython) ? usePython : 'pip';
          
          const pip = spawn(command, args, {
            cwd: botDirectory,
            stdio: 'pipe',
            env: { ...process.env, PIP_USER: '0' }
          });
          
          pip.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Failed to install package (exit code: ${code})`));
          });
        });
      } else if (bot.runtime === 'nodejs') {
        await new Promise<void>((resolve, reject) => {
          const npm = spawn('npm', ['install', packageName], {
            cwd: botDirectory,
            stdio: 'pipe'
          });
          
          npm.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Failed to install package (exit code: ${code})`));
          });
        });
      }
      
      res.json({ message: "Package added successfully", packageName });
    } catch (error: any) {
      console.error("Error adding package:", error);
      res.status(500).json({ message: "Failed to add package: " + error.message });
    }
  });

  // Get list of installed packages
  app.get("/api/bots/:id/packages", isAuthenticated, async (req: any, res) => {
    try {
      const botId = parseInt(req.params.id);
      const bot = await storage.getBotById(botId);
      
      if (!bot || bot.userId !== req.user.id) {
        return res.status(404).json({ message: "Bot not found" });
      }
      
      const botDirectory = bot.extractedPath!;
      const packages: string[] = [];
      
      if (bot.runtime === 'python') {
        const requirementsPath = path.join(botDirectory, 'requirements.txt');
        if (fs.existsSync(requirementsPath)) {
          const content = await promisify(fs.readFile)(requirementsPath, 'utf-8');
          packages.push(...content.split('\n').filter(line => line.trim() && !line.startsWith('#')));
        }
      } else if (bot.runtime === 'nodejs') {
        const packageJsonPath = path.join(botDirectory, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          const content = await promisify(fs.readFile)(packageJsonPath, 'utf-8');
          const packageJson = JSON.parse(content);
          if (packageJson.dependencies) {
            packages.push(...Object.keys(packageJson.dependencies));
          }
        }
      }
      
      res.json(packages);
    } catch (error) {
      console.error("Error fetching packages:", error);
      res.status(500).json({ message: "Failed to fetch packages" });
    }
  });

  // Remove package from bot dependencies
  app.delete("/api/bots/:id/packages/:packageName", isAuthenticated, async (req: any, res) => {
    try {
      const botId = parseInt(req.params.id);
      const bot = await storage.getBotById(botId);
      
      if (!bot || bot.userId !== req.user.id) {
        return res.status(404).json({ message: "Bot not found" });
      }
      
      const packageName = req.params.packageName;
      const botDirectory = bot.extractedPath!;
      
      if (bot.runtime === 'python') {
        const requirementsPath = path.join(botDirectory, 'requirements.txt');
        if (fs.existsSync(requirementsPath)) {
          let requirements = await promisify(fs.readFile)(requirementsPath, 'utf-8');
          const lines = requirements.split('\n').filter(line => 
            !line.trim().startsWith(packageName) && line.trim() !== packageName
          );
          await promisify(fs.writeFile)(requirementsPath, lines.join('\n'), 'utf-8');
        }
      } else if (bot.runtime === 'nodejs') {
        await new Promise<void>((resolve, reject) => {
          const npm = spawn('npm', ['uninstall', packageName], {
            cwd: botDirectory,
            stdio: 'pipe'
          });
          
          npm.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Failed to uninstall package (exit code: ${code})`));
          });
        });
      }
      
      res.json({ message: "Package removed successfully" });
    } catch (error: any) {
      console.error("Error removing package:", error);
      res.status(500).json({ message: "Failed to remove package: " + error.message });
    }
  });

  // File management: List files in bot directory
  app.get("/api/bots/:id/files", isAuthenticated, async (req: any, res) => {
    try {
      const botId = parseInt(req.params.id);
      const bot = await storage.getBotById(botId);
      
      if (!bot || bot.userId !== req.user.id) {
        return res.status(404).json({ message: "Bot not found" });
      }
      
      const dirPath = req.query.path as string || '';
      const fullPath = path.join(bot.extractedPath!, dirPath);
      
      // Security check: ensure path is within bot directory
      const resolvedPath = path.resolve(fullPath);
      const resolvedBase = path.resolve(bot.extractedPath!);
      const relativePath = path.relative(resolvedBase, resolvedPath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ message: "Directory not found" });
      }
      
      const files = await promisify(fs.readdir)(fullPath, { withFileTypes: true });
      const fileList = await Promise.all(files.map(async (file) => {
        const filePath = path.join(fullPath, file.name);
        const stats = await promisify(fs.stat)(filePath);
        return {
          name: file.name,
          type: file.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime
        };
      }));
      
      res.json(fileList);
    } catch (error) {
      console.error("Error listing files:", error);
      res.status(500).json({ message: "Failed to list files" });
    }
  });

  // File management: Read file content
  app.get("/api/bots/:id/files/content", isAuthenticated, async (req: any, res) => {
    try {
      const botId = parseInt(req.params.id);
      const bot = await storage.getBotById(botId);
      
      if (!bot || bot.userId !== req.user.id) {
        return res.status(404).json({ message: "Bot not found" });
      }
      
      const filePath = req.query.path as string;
      if (!filePath) {
        return res.status(400).json({ message: "File path is required" });
      }
      
      const fullPath = path.join(bot.extractedPath!, filePath);
      
      // Security check
      const resolvedPath = path.resolve(fullPath);
      const resolvedBase = path.resolve(bot.extractedPath!);
      const relativePath = path.relative(resolvedBase, resolvedPath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      const content = await promisify(fs.readFile)(fullPath, 'utf-8');
      res.json({ content });
    } catch (error) {
      console.error("Error reading file:", error);
      res.status(500).json({ message: "Failed to read file" });
    }
  });

  // File management: Create or update file
  app.post("/api/bots/:id/files", isAuthenticated, async (req: any, res) => {
    try {
      const botId = parseInt(req.params.id);
      const bot = await storage.getBotById(botId);
      
      if (!bot || bot.userId !== req.user.id) {
        return res.status(404).json({ message: "Bot not found" });
      }
      
      const { path: filePath, content, type } = req.body;
      
      if (!filePath) {
        return res.status(400).json({ message: "File path is required" });
      }
      
      const fullPath = path.join(bot.extractedPath!, filePath);
      
      // Security check
      const resolvedPath = path.resolve(fullPath);
      const resolvedBase = path.resolve(bot.extractedPath!);
      const relativePath = path.relative(resolvedBase, resolvedPath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (type === 'directory') {
        await mkdirAsync(fullPath, { recursive: true });
      } else {
        // Ensure parent directory exists
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          await mkdirAsync(dir, { recursive: true });
        }
        await promisify(fs.writeFile)(fullPath, content || '', 'utf-8');
      }
      
      res.json({ message: "File created successfully" });
    } catch (error) {
      console.error("Error creating file:", error);
      res.status(500).json({ message: "Failed to create file" });
    }
  });

  // File management: Delete file or directory
  app.delete("/api/bots/:id/files", isAuthenticated, async (req: any, res) => {
    try {
      const botId = parseInt(req.params.id);
      const bot = await storage.getBotById(botId);
      
      if (!bot || bot.userId !== req.user.id) {
        return res.status(404).json({ message: "Bot not found" });
      }
      
      const filePath = req.query.path as string;
      
      if (!filePath) {
        return res.status(400).json({ message: "File path is required" });
      }
      
      const fullPath = path.join(bot.extractedPath!, filePath);
      
      // Security check
      const resolvedPath = path.resolve(fullPath);
      const resolvedBase = path.resolve(bot.extractedPath!);
      const relativePath = path.relative(resolvedBase, resolvedPath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      const stats = await promisify(fs.stat)(fullPath);
      if (stats.isDirectory()) {
        await promisify(fs.rm)(fullPath, { recursive: true, force: true });
      } else {
        await unlinkAsync(fullPath);
      }
      
      res.json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  // File management: Rename file or directory
  app.patch("/api/bots/:id/files/rename", isAuthenticated, async (req: any, res) => {
    try {
      const botId = parseInt(req.params.id);
      const bot = await storage.getBotById(botId);
      
      if (!bot || bot.userId !== req.user.id) {
        return res.status(404).json({ message: "Bot not found" });
      }
      
      const { oldPath, newPath } = req.body;
      
      if (!oldPath || !newPath) {
        return res.status(400).json({ message: "Old and new paths are required" });
      }
      
      const fullOldPath = path.join(bot.extractedPath!, oldPath);
      const fullNewPath = path.join(bot.extractedPath!, newPath);
      
      // Security checks
      const resolvedBase = path.resolve(bot.extractedPath!);
      const resolvedOld = path.resolve(fullOldPath);
      const resolvedNew = path.resolve(fullNewPath);
      const relativeOld = path.relative(resolvedBase, resolvedOld);
      const relativeNew = path.relative(resolvedBase, resolvedNew);
      
      if (relativeOld.startsWith('..') || path.isAbsolute(relativeOld) || 
          relativeNew.startsWith('..') || path.isAbsolute(relativeNew)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!fs.existsSync(fullOldPath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      await promisify(fs.rename)(fullOldPath, fullNewPath);
      res.json({ message: "File renamed successfully" });
    } catch (error) {
      console.error("Error renaming file:", error);
      res.status(500).json({ message: "Failed to rename file" });
    }
  });

  // File management: Upload file
  app.post("/api/bots/:id/files/upload", isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const botId = parseInt(req.params.id);
      const bot = await storage.getBotById(botId);
      
      if (!bot || bot.userId !== req.user.id) {
        return res.status(404).json({ message: "Bot not found" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const targetDir = req.body.path || '';
      const fileName = req.file.originalname;
      const fullPath = path.join(bot.extractedPath!, targetDir, fileName);
      
      // Security check
      const resolvedPath = path.resolve(fullPath);
      const resolvedBase = path.resolve(bot.extractedPath!);
      const relativePath = path.relative(resolvedBase, resolvedPath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        await unlinkAsync(req.file.path);
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Ensure target directory exists
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        await mkdirAsync(dir, { recursive: true });
      }
      
      // Move uploaded file to target location
      await promisify(fs.rename)(req.file.path, fullPath);
      
      res.json({ message: "File uploaded successfully", fileName });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
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
  
  // Validate that bot files exist
  if (!bot.extractedPath) {
    throw new Error("Bot files have not been uploaded. Please upload bot files before launching.");
  }
  
  try {
    await promisify(fs.access)(bot.extractedPath, fs.constants.F_OK);
  } catch {
    throw new Error(`Bot files not found at ${bot.extractedPath}. Please re-upload the bot files.`);
  }
  
  // Get environment variables
  const envVars = await storage.getEnvVarsByBotId(botId);
  const botEnv: Record<string, string> = { 
    ...process.env,
    PATH: process.env.PATH || ''
  } as Record<string, string>;
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
  const workingDir = path.resolve(path.dirname(fullEntryPath));
  const entryFileName = path.basename(fullEntryPath);
  
  // Start bot process
  let command: string;
  let args: string[];
  
  if (bot.runtime === 'python') {
    // Check if virtual environment exists - use absolute paths
    const venvPythonPath = path.resolve(path.join(workingDir, '.venv', 'bin', 'python'));
    const uvPythonPath = path.resolve(path.join(workingDir, '.venv', 'bin', 'python'));
    
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
        // No venv, use system python (works on Render, Replit, etc.)
        command = findSystemPython();
        console.log(`[Bot ${botId}] Using system Python: ${command}`);
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
  
  // Handle spawn errors (prevent application crash)
  botProcess.on('error', async (error: Error) => {
    console.error(`[Bot ${botId}] Process spawn error:`, error);
    botProcesses.delete(botId);
    await storage.updateBot(botId, { 
      status: 'error', 
      errorMessage: `Failed to start bot: ${error.message}` 
    });
  });
  
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
    
    // Get user to check auto-restart setting
    const currentBot = await storage.getBotById(botId);
    if (currentBot) {
      const user = await storage.getUser(currentBot.userId);
      
      if (code !== 0 && code !== null) {
        await storage.updateBot(botId, { 
          status: 'error', 
          errorMessage: `Process exited with code ${code}` 
        });
        
        // Auto-restart for premium users with auto-restart enabled
        if (user && user.autoRestart === 'true' && user.tier === 'PREMIUM') {
          console.log(`[Bot ${botId}] Auto-restarting due to error (Premium user with auto-restart enabled)`);
          setTimeout(async () => {
            try {
              await launchBot(botId);
              console.log(`[Bot ${botId}] Successfully auto-restarted`);
            } catch (error) {
              console.error(`[Bot ${botId}] Auto-restart failed:`, error);
            }
          }, 3000);
        }
      } else {
        await storage.updateBot(botId, { status: 'stopped' });
      }
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
