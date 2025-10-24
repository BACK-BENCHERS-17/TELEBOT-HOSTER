# Telegram Bot Guide

## How the Platform Bot Works

TELEBOT HOSTER has its own Telegram bot that helps you manage your account and deploy bots. The platform bot responds to the following commands:

### Available Commands

- `/start` - Welcome message and introduction to the platform
- `/dashboard` - Opens your TELEBOT HOSTER dashboard with a button
- `/help` - Shows all available commands and features
- `/status` - View your account status (directs you to dashboard)

### Menu Button

The platform bot also has a menu button that opens your dashboard directly. Click the menu button (☰) next to the message input to access your dashboard quickly!

### How It Works

1. **Webhook System**: The bot uses webhooks to receive and respond to your messages instantly
2. **Command Handling**: Each command triggers a specific response with helpful information
3. **Dashboard Integration**: Commands can open your dashboard directly in Telegram

## Deploying Your Own Bots

You can deploy your own Telegram bots on this platform! Here's how:

### Step 1: Create Your Bot

1. Open Telegram and search for @BotFather
2. Send `/newbot` and follow the instructions
3. Copy your bot token (format: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Step 2: Prepare Your Bot Code

#### Python Example (see example_bots/simple_telegram_bot/)

Your bot needs:
- `bot.py` or `main.py` - Your main bot file
- `requirements.txt` - List of required packages

```python
import os
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text('Hello!')

app = Application.builder().token(BOT_TOKEN).build()
app.add_handler(CommandHandler("start", start))
app.run_polling()
```

#### Node.js Example

```javascript
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, {polling: true});

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Hello!');
});
```

### Step 3: Deploy on TELEBOT HOSTER

1. **Compress your bot files** into a ZIP file
2. **Open your dashboard** on TELEBOT HOSTER
3. **Click "Deploy New Bot"**
4. **Fill in the details**:
   - Bot Name: Give your bot a name
   - Runtime: Select Python or Node.js
   - Upload your ZIP file
5. **Add Environment Variables**:
   - Key: `TELEGRAM_BOT_TOKEN`
   - Value: Your bot token from BotFather
6. **Click "Deploy"**

### Step 4: Start Your Bot

1. Once deployed, click the **"Start"** button
2. Your bot will start running!
3. Go to Telegram and chat with your bot
4. Monitor logs in real-time from the dashboard

## Bot Management Features

- **Real-time Logs**: See what your bot is doing in real-time via WebSocket streaming
- **Start/Stop/Restart**: Control your bot with one click
- **Environment Variables**: Securely store API keys and secrets
- **File Editing**: Edit your bot files directly in the browser
- **Auto-restart**: Premium feature - automatically restart on crashes
- **Resource Monitoring**: Track CPU and RAM usage

## Example Bots

Check out `example_bots/simple_telegram_bot/` for a complete working example with:
- Command handlers
- Message responses
- Error handling
- Proper logging
- Environment variable usage

## Tips for Success

1. **Always use environment variables** for sensitive data like bot tokens
2. **Include all dependencies** in requirements.txt or package.json
3. **Test locally first** before deploying
4. **Monitor your logs** to catch errors early
5. **Use proper error handling** to prevent crashes

## Troubleshooting

### Bot Won't Start

- Check that your TELEGRAM_BOT_TOKEN is set correctly
- Verify your entry point file is correct
- Look at the logs for error messages

### Bot Not Responding

- Make sure the bot is running (status should be "running")
- Check that your bot token is valid
- Review logs for errors

### Dependencies Not Installing

- Ensure requirements.txt or package.json is in the root of your ZIP
- Check that package names are spelled correctly
- View installation logs in the console

## Support

Need help? Contact us at @BACK_BENCHERS_x17 on Telegram!
