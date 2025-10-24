# Simple Telegram Bot Example

This is a basic example Telegram bot that demonstrates how to create and deploy bots on TELEBOT HOSTER.

## Features

- ✅ Basic command handling (/start, /help, /about, /echo)
- ✅ Message responses with keyword detection
- ✅ Error handling and logging
- ✅ Environment variable configuration

## Setup Instructions

1. **Get a Bot Token from BotFather:**
   - Open Telegram and search for @BotFather
   - Send `/newbot` and follow the instructions
   - Copy your bot token (looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

2. **Deploy on TELEBOT HOSTER:**
   - Upload this bot as a ZIP file
   - Select "Python" as the runtime
   - Add environment variable: `TELEGRAM_BOT_TOKEN` = your bot token
   - Click "Deploy Bot"

3. **Start the Bot:**
   - Once deployed, click "Start" to run your bot
   - Go to Telegram and search for your bot
   - Send `/start` to begin chatting!

## Commands

- `/start` - Start the bot and see welcome message
- `/help` - Show available commands
- `/about` - Learn about the bot
- `/echo <text>` - Echo your message back

## Customization

You can customize this bot by:
- Adding more commands in the `bot.py` file
- Modifying message responses
- Adding new features like inline keyboards, photos, etc.
- Installing additional packages in `requirements.txt`

## Requirements

- Python 3.8+
- python-telegram-bot library (automatically installed from requirements.txt)
- A Telegram bot token from @BotFather

## Support

For help with TELEBOT HOSTER, contact: @BACK_BENCHERS_x17
