#!/usr/bin/env python3
"""
Simple Telegram Bot Example for TELEBOT HOSTER
This bot demonstrates basic commands and message handling.
"""

import os
import sys
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Get bot token from environment variable
BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')

if not BOT_TOKEN:
    logger.error("❌ TELEGRAM_BOT_TOKEN environment variable is not set!")
    logger.error("Please add TELEGRAM_BOT_TOKEN in the bot settings.")
    sys.exit(1)

# Command handlers
async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send a message when /start is issued."""
    user = update.effective_user
    await update.message.reply_text(
        f"👋 Hello {user.first_name}!\n\n"
        f"I'm a simple example bot running on TELEBOT HOSTER! 🤖\n\n"
        f"Try these commands:\n"
        f"/help - Show available commands\n"
        f"/about - Learn about this bot\n"
        f"/echo <message> - Echo your message back\n\n"
        f"Or just send me any message and I'll respond!"
    )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send a message when /help is issued."""
    await update.message.reply_text(
        "📖 *Available Commands:*\n\n"
        "/start - Start the bot\n"
        "/help - Show this help message\n"
        "/about - Learn about this bot\n"
        "/echo <text> - Echo your message\n\n"
        "You can also just send me any text message!",
        parse_mode='Markdown'
    )

async def about_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send information about the bot."""
    await update.message.reply_text(
        "ℹ️ *About This Bot*\n\n"
        "This is a simple example Telegram bot hosted on TELEBOT HOSTER.\n\n"
        "🌐 Platform: TELEBOT HOSTER\n"
        "💻 Language: Python\n"
        "📚 Library: python-telegram-bot\n\n"
        "You can deploy your own bots just like this one!",
        parse_mode='Markdown'
    )

async def echo_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Echo the user's message."""
    if context.args:
        message = ' '.join(context.args)
        await update.message.reply_text(f"🔄 You said: {message}")
    else:
        await update.message.reply_text("Please provide a message to echo!\n\nExample: /echo Hello World")

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle regular text messages."""
    user_message = update.message.text
    user_name = update.effective_user.first_name
    
    # Simple responses based on message content
    if "hello" in user_message.lower() or "hi" in user_message.lower():
        await update.message.reply_text(f"Hello {user_name}! 👋 How can I help you today?")
    elif "how are you" in user_message.lower():
        await update.message.reply_text("I'm doing great! Thanks for asking! 😊")
    elif "bye" in user_message.lower():
        await update.message.reply_text("Goodbye! Come back soon! 👋")
    else:
        await update.message.reply_text(
            f"You said: {user_message}\n\n"
            f"Try using /help to see what I can do!"
        )

async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Log errors caused by updates."""
    logger.error(f"Update {update} caused error {context.error}")

def main():
    """Start the bot."""
    logger.info("🚀 Starting bot...")
    
    # Create the Application
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Register command handlers
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("about", about_command))
    application.add_handler(CommandHandler("echo", echo_command))
    
    # Register message handler for non-command messages
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    # Register error handler
    application.add_error_handler(error_handler)
    
    # Start the bot
    logger.info("✅ Bot is running! Press Ctrl+C to stop.")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()
