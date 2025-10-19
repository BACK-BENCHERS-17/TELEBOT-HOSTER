# 🚀 Keep Your App Running 24/7

This guide explains how to keep your Telegram Bot Hoster application running continuously without interruptions.

## ✅ What's Been Set Up

Your application now includes:

1. **`/api/alive` endpoint** - Health check endpoint that returns server status
2. **`/alive` page** - Web interface showing setup instructions and monitoring URL
3. **PM2 Configuration** - Auto-restart on crashes
4. **Keep-alive scripts** - Self-ping mechanism

---

## 🎯 Recommended Solution: Deploy on Replit

### **For Production (Best Option)**

1. **Click "Publish"** in the top-right corner of Replit
2. **Select "Reserved VM"** deployment
3. **Configure:**
   - Choose CPU/RAM based on your needs
   - Set environment variables (ADMIN_USERNAME, ADMIN_PASSWORD, etc.)
4. **Click "Publish"**

**Benefits:**
- ✅ Runs 24/7 without stopping
- ✅ Automatic restarts on crashes
- ✅ Dedicated resources
- ✅ Custom domain support
- ✅ Production-ready infrastructure

---

## 🔄 Alternative: PM2 Process Manager

### **For Development/Testing**

PM2 automatically restarts your app if it crashes:

```bash
# Start with PM2
./start-pm2.sh

# Check status
pm2 status

# View logs
pm2 logs

# Restart
pm2 restart all

# Stop
pm2 stop all
```

**PM2 Features:**
- ✅ Auto-restart on crash
- ✅ Log management
- ✅ Process monitoring
- ✅ Zero-downtime restarts

---

## ⏰ External Monitoring (Free Tier Workaround)

If you're on Replit's free tier, use external monitors to ping your app:

### **UptimeRobot (Free)**

1. Visit [uptimerobot.com](https://uptimerobot.com)
2. Create account and add new monitor
3. **Type:** HTTP(s)
4. **URL:** `https://your-repl-url.replit.dev/api/alive`
5. **Interval:** 5 minutes

### **Cron-job.org (Free)**

1. Visit [cron-job.org](https://cron-job.org)
2. Create account and add cron job
3. **URL:** `https://your-repl-url.replit.dev/api/alive`
4. **Schedule:** `*/5 * * * *` (every 5 minutes)

**Note:** External monitors can help but won't guarantee 100% uptime. For critical apps, use Reserved VM deployment.

---

## 📊 Monitoring Your App

### **Check Health Status**

Visit: `https://your-repl-url.replit.dev/api/alive`

Response:
```json
{
  "status": "alive",
  "timestamp": "2025-10-19T12:00:00.000Z",
  "uptime": 3600,
  "message": "Server is running"
}
```

### **View Instructions**

Visit: `https://your-repl-url.replit.dev/alive`

This page shows:
- Your monitoring URL
- Setup instructions for each method
- Current server status

---

## 🛠️ Files Created

- `ecosystem.config.cjs` - PM2 configuration
- `start-pm2.sh` - PM2 startup script
- `keep-alive.js` - Self-ping service
- `/api/alive` endpoint - Health check API
- `/alive` page - Setup guide UI

---

## 💡 Best Practices

### **For Production Apps:**
✅ Use Replit Reserved VM Deployment  
✅ Set up environment variables properly  
✅ Monitor uptime with UptimeRobot  
✅ Set up alerts for downtime  

### **For Development:**
✅ Use PM2 for auto-restart  
✅ Monitor logs regularly  
✅ Test thoroughly before deploying  

### **Security:**
✅ Always set ADMIN_USERNAME and ADMIN_PASSWORD  
✅ Use strong passwords  
✅ Enable HTTPS (automatic on Replit)  

---

## 📞 Need Help?

Visit the `/alive` page in your app for interactive setup guides and current monitoring URLs.

---

## Quick Start

1. **Deploy on Replit (Recommended):**
   - Click "Publish" → Reserved VM → Configure → Publish ✨

2. **Or use PM2 for auto-restart:**
   ```bash
   ./start-pm2.sh
   ```

3. **Or setup external monitoring:**
   - Visit `/alive` page
   - Copy the monitoring URL
   - Add to UptimeRobot or Cron-job.org

That's it! Your app will now run 24/7! 🎉
