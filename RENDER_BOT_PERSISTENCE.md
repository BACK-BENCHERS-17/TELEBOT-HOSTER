# Bot File Persistence on Render - Important Information

## ⚠️ Critical Information About Bot Files on Render

### The Issue

When deploying to Render, **uploaded bot files will not persist** across service restarts or redeployments because:

1. The `uploads/` directory is excluded from Git (via `.gitignore`)
2. Render creates a fresh deployment from your Git repository each time
3. User-uploaded content is stored in the ephemeral file system

### What This Means

- ❌ **Bot files will be lost** when Render restarts your service (after 15 min inactivity on free tier)
- ❌ **Bot files will be lost** when you redeploy your application
- ✅ **Bot files ARE included** in the admin panel download (ZIP file)
- ✅ **Bot files persist** during normal runtime (until restart/redeploy)

---

## ✅ Solutions Implemented

### 1. Download Functionality Fixed

The admin panel download now **includes all bot files** in the ZIP:
- All uploaded bots in `uploads/bots/`
- All bot source code and dependencies
- Latest state of all files

**What to do:**
- Download the project regularly through the admin panel
- Keep backups of your bot files
- Re-upload bots after Render redeploys

### 2. UV Package Manager Support

The deployment now supports both Python dependency managers:

**UV (Fast Python Package Manager):**
- Automatically detected if `uv.lock` or `pyproject.toml` exists
- Installed during Render build process
- Falls back to pip if uv is not available

**PIP (Traditional Python Package Manager):**
- Used when `requirements.txt` exists
- Creates virtual environment (`.venv`)
- Fully compatible with all Python bots

**Error Fixed:**
The "spawn uv ENOENT" error has been resolved by:
- Installing uv during Render build
- Adding uv to PATH in start command
- Intelligent fallback to pip if uv is unavailable
- Clear warning messages when uv is not installed

---

## 📋 Recommended Workflow for Render

### Option 1: Use Database for Bot Storage (Recommended for Production)

For production deployments where bot files need to persist:

1. Store bot files in **MongoDB GridFS** or **Object Storage** (S3, Cloudflare R2, etc.)
2. Modify the storage layer to save/load bot files from database instead of filesystem
3. This requires code modifications (contact developer for implementation)

### Option 2: Manual Re-upload After Restart

For development/testing deployments:

1. **Before Render goes inactive:**
   - Go to Admin Panel → Download Project
   - Save the ZIP file locally

2. **After Render restart:**
   - Log in to the admin panel
   - Re-upload your bots manually
   - Configure environment variables again

3. **For frequent restarts:**
   - Consider upgrading to a paid Render plan
   - Paid plans don't spin down and have better persistence

### Option 3: Keep Bots in Git (Not Recommended)

You could commit bot files to Git, but this has downsides:
- Bloats repository size
- Security concerns (bot tokens in code)
- Not practical for user-uploaded content
- Goes against .gitignore best practices

---

## 🔧 Technical Details of Fixes

### Changes Made to `server/routes.ts`

1. **Download Endpoint Updated (Line 187-202):**
   ```typescript
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
     'uploads/*.zip',       // Only exclude temp zip files
     'uploads/*.tar.gz'     // Only exclude temp archives
   ];
   // uploads/bots/ is NOW INCLUDED in downloads
   ```

2. **UV Detection Function Added (Line 54-62):**
   ```typescript
   function isUvAvailable(): boolean {
     try {
       execSync('which uv', { encoding: 'utf-8', stdio: 'pipe' });
       return true;
     } catch {
       return false;
     }
   }
   ```

3. **Smart Dependency Installation (Line 610-656):**
   - Checks if uv is available on the system
   - Uses uv if available AND bot has uv.lock/pyproject.toml
   - Falls back to pip + venv if uv is not available
   - Logs clear warnings when falling back

### Changes Made to `render.yaml`

1. **UV Installation in Build Command:**
   ```yaml
   buildCommand: |
     # Install uv for Python package management
     curl -LsSf https://astral.sh/uv/install.sh | sh
     export PATH="$HOME/.local/bin:$PATH"
     npm install && npm run build
   ```

2. **UV Available at Runtime:**
   ```yaml
   startCommand: |
     # Ensure uv is in PATH for runtime
     export PATH="$HOME/.local/bin:$PATH"
     npm start
   ```

---

## 🚀 Deploying the Fixed Version

### Step 1: Update Your Repository

```bash
# Push the updated code to your Git repository
git add .
git commit -m "Fix bot file persistence and uv support"
git push origin main
```

### Step 2: Render Will Auto-Deploy

If you have `autoDeploy: true` in render.yaml (default):
- Render detects the push automatically
- Runs the new build command (installs uv)
- Starts with the new start command (uv in PATH)

### Step 3: Verify the Fix

1. Check Render build logs for:
   ```
   Installing uv...
   uv installation pending (will be available at runtime)
   ```

2. Upload a bot with `uv.lock`:
   - Should install successfully
   - No "spawn uv ENOENT" error

3. Download project from admin panel:
   - ZIP should contain `uploads/bots/` directory
   - All bot files should be included

---

## 📞 Support

If you encounter issues:

1. **Check Render Logs:**
   - Go to Render Dashboard → Your Service → Logs
   - Look for "Bot Deploy" messages
   - Check for uv installation messages

2. **Common Issues:**

   **"spawn uv ENOENT" still appearing:**
   - Redeploy on Render (not just restart)
   - Check build logs to ensure uv installed
   - Verify start command includes PATH export

   **Bot files missing after restart:**
   - Expected behavior on free tier
   - Download project before restart
   - Consider database storage solution

   **Dependencies not installing:**
   - Check bot has requirements.txt OR uv.lock
   - Verify Python syntax in dependency files
   - Check Render logs for specific error

3. **Get Help:**
   - Contact: `DEVELOPER_CONTACT` (set in environment variables)
   - Check Render community forums
   - Review Render documentation

---

## 📚 Additional Resources

- [Render Deployment Guide](DEPLOYMENT.md)
- [Keep Alive Guide](KEEP_ALIVE_GUIDE.md)
- [UV Package Manager](https://github.com/astral-sh/uv)
- [Render Persistent Disks](https://render.com/docs/disks) (Paid feature)

---

**Last Updated:** October 2025  
**Status:** ✅ All fixes implemented and tested
