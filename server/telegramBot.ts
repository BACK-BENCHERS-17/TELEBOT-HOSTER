// Telegram Bot utility for sending OTP messages
import https from 'https';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
}

function makeRequest(method: string, data: any): Promise<TelegramResponse> {
  return new Promise((resolve, reject) => {
    const url = `${TELEGRAM_API_URL}/${method}`;
    const payload = JSON.stringify(data);

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(url, options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (error) {
          reject(new Error('Failed to parse Telegram API response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

export async function sendOTPToTelegram(username: string, otp: string, chatId?: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not set');
    return false;
  }

  const cleanUsername = username.startsWith('@') ? username.slice(1) : username;

  const message = `🔐 *Token Creation OTP*\n\nYour OTP code is: \`${otp}\`\n\nThis code will expire in 10 minutes.\n\nEnter this code on the website to complete your token creation.\n\n⚠️ Never share this code with anyone.\n\n_If you didn't request this, please ignore this message._`;

  try {
    let targetChatId = chatId;

    if (!targetChatId) {
      const updatesResponse = await makeRequest('getUpdates', { limit: 100, offset: -1 });
      
      if (updatesResponse.ok && updatesResponse.result && Array.isArray(updatesResponse.result)) {
        for (const update of updatesResponse.result.reverse()) {
          const message = update.message;
          if (message && message.from && message.from.username === cleanUsername) {
            targetChatId = message.from.id.toString();
            console.log(`Found chat_id ${targetChatId} for username @${cleanUsername}`);
            break;
          }
        }
      }
    }

    if (targetChatId) {
      const response = await makeRequest('sendMessage', {
        chat_id: targetChatId,
        text: message,
        parse_mode: 'Markdown',
      });

      if (response.ok) {
        console.log(`✅ OTP sent successfully to chat_id ${targetChatId} (@${cleanUsername})`);
        return true;
      }
    }

    const response = await makeRequest('sendMessage', {
      chat_id: `@${cleanUsername}`,
      text: message,
      parse_mode: 'Markdown',
    });

    if (response.ok) {
      console.log(`✅ OTP sent successfully to @${cleanUsername}`);
      return true;
    } else {
      console.error(`❌ Failed to send OTP to @${cleanUsername}:`, response.description);
      return false;
    }
  } catch (error: any) {
    console.error('Error sending OTP via Telegram:', error.message);
    return false;
  }
}

export async function sendTokenRecoveryInstructions(username: string, tokenValue: string, chatId?: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not set');
    return false;
  }

  const cleanUsername = username.startsWith('@') ? username.slice(1) : username;

  const message = `🎉 *Token Recovery Successful*\n\nYour access token is:\n\`${tokenValue}\`\n\n✅ You can now use this token to log in to your dashboard.\n\n⚠️ Keep this token safe and never share it with anyone.`;

  try {
    let targetChatId = chatId;

    if (!targetChatId) {
      const updatesResponse = await makeRequest('getUpdates', { limit: 100, offset: -1 });
      
      if (updatesResponse.ok && updatesResponse.result && Array.isArray(updatesResponse.result)) {
        for (const update of updatesResponse.result.reverse()) {
          const message = update.message;
          if (message && message.from && message.from.username === cleanUsername) {
            targetChatId = message.from.id.toString();
            console.log(`Found chat_id ${targetChatId} for username @${cleanUsername}`);
            break;
          }
        }
      }
    }

    if (targetChatId) {
      const response = await makeRequest('sendMessage', {
        chat_id: targetChatId,
        text: message,
        parse_mode: 'Markdown',
      });

      if (response.ok) {
        console.log(`✅ Token sent successfully to chat_id ${targetChatId} (@${cleanUsername})`);
        return true;
      }
    }

    const response = await makeRequest('sendMessage', {
      chat_id: `@${cleanUsername}`,
      text: message,
      parse_mode: 'Markdown',
    });

    if (response.ok) {
      console.log(`✅ Token sent successfully to @${cleanUsername}`);
      return true;
    } else {
      console.error(`❌ Failed to send token to @${cleanUsername}:`, response.description);
      return false;
    }
  } catch (error: any) {
    console.error('Error sending token via Telegram:', error.message);
    return false;
  }
}

export async function extractChatIdFromUsername(username: string): Promise<string | null> {
  if (!TELEGRAM_BOT_TOKEN) {
    return null;
  }

  const cleanUsername = username.startsWith('@') ? username.slice(1) : username;

  try {
    const updatesResponse = await makeRequest('getUpdates', { limit: 100, offset: -1 });
    
    if (updatesResponse.ok && updatesResponse.result && Array.isArray(updatesResponse.result)) {
      for (const update of updatesResponse.result.reverse()) {
        const message = update.message;
        if (message && message.from && message.from.username === cleanUsername) {
          return message.from.id.toString();
        }
      }
    }
  } catch (error: any) {
    console.error('Error extracting chat_id:', error.message);
  }

  return null;
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendWelcomeMessage(chatId: string, firstName: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not set');
    return false;
  }

  const webAppUrl = 'https://telehost.qzz.io';

  const message = `👋 Welcome, ${firstName}!

🎉 You've successfully logged in to TELE HOST!

Here's what you can do:
✅ Deploy Python and Node.js bots
✅ Monitor bots with real-time logs
✅ Manage environment variables
✅ Auto-restart on crashes (Premium)

🌐 Visit your dashboard: ${webAppUrl}

Need help? Use the menu below to access your dashboard quickly!`;

  try {
    const response = await makeRequest('sendMessage', {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
    });

    if (response.ok) {
      console.log(`✅ Welcome message sent to chat_id ${chatId}`);
      return true;
    } else {
      console.error(`❌ Failed to send welcome message:`, response.description);
      return false;
    }
  } catch (error: any) {
    console.error('Error sending welcome message:', error.message);
    return false;
  }
}

export async function sendVisitNotification(chatId: string, firstName: string, action: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not set');
    return false;
  }

  const message = `🔔 *Activity Notification*\n\nHi ${firstName}!\n\n${action}\n\n_Stay in control of your bots!_`;

  try {
    const response = await makeRequest('sendMessage', {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
    });

    if (response.ok) {
      console.log(`✅ Visit notification sent to chat_id ${chatId}`);
      return true;
    } else {
      console.error(`❌ Failed to send visit notification:`, response.description);
      return false;
    }
  } catch (error: any) {
    console.error('Error sending visit notification:', error.message);
    return false;
  }
}

export async function setMenuButton(): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not set');
    return false;
  }

  const webAppUrl = 'https://telehost.qzz.io';

  try {
    const response = await makeRequest('setChatMenuButton', {
      menu_button: {
        type: 'web_app',
        text: 'Open Dashboard',
        web_app: {
          url: webAppUrl
        }
      }
    });

    if (response.ok) {
      console.log('✅ Menu button set successfully to', webAppUrl);
      return true;
    } else {
      console.error('❌ Failed to set menu button:', response.description);
      return false;
    }
  } catch (error: any) {
    console.error('Error setting menu button:', error.message);
    return false;
  }
}

export async function setBotCommands(): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not set');
    return false;
  }

  const commands = [
    { command: 'start', description: 'Start the bot and get welcome message' },
    { command: 'dashboard', description: 'Open your dashboard' },
    { command: 'help', description: 'Get help and support' },
    { command: 'status', description: 'Check your account status' }
  ];

  try {
    const response = await makeRequest('setMyCommands', {
      commands: commands
    });

    if (response.ok) {
      console.log('✅ Bot commands set successfully');
      return true;
    } else {
      console.error('❌ Failed to set bot commands:', response.description);
      return false;
    }
  } catch (error: any) {
    console.error('Error setting bot commands:', error.message);
    return false;
  }
}

export async function setWebhook(webhookUrl: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not set');
    return false;
  }

  try {
    const response = await makeRequest('setWebhook', {
      url: webhookUrl,
      allowed_updates: ['message', 'callback_query']
    });

    if (response.ok) {
      console.log('✅ Webhook set successfully to', webhookUrl);
      return true;
    } else {
      console.error('❌ Failed to set webhook:', response.description);
      return false;
    }
  } catch (error: any) {
    console.error('Error setting webhook:', error.message);
    return false;
  }
}

export async function handleBotUpdate(update: any): Promise<void> {
  try {
    const message = update.message;
    if (!message || !message.text) return;

    const chatId = message.chat.id;
    const text = message.text;
    const firstName = message.from?.first_name || 'User';

    const webAppUrl = 'https://telehost.qzz.io';

    // Handle commands
    if (text.startsWith('/start')) {
      await sendMessage(chatId, `👋 Welcome to TELE HOST, ${firstName}!

🤖 I'm here to help you deploy and manage your Telegram bots with ease!

✨ *What you can do:*
• Deploy Python and Node.js bots
• Monitor bots with real-time logs
• Manage environment variables
• Auto-restart on crashes (Premium)
• Edit bot files directly in your browser

🚀 *Get Started:*
Click the menu button below or use /dashboard to open your dashboard!

💡 *Need help?* Use /help to see all available commands.`, 'Markdown');

    } else if (text.startsWith('/dashboard')) {
      await sendMessage(chatId, `🌐 *Open Your Dashboard*

Click here to access your dashboard: ${webAppUrl}

Or use the menu button below! 👇`, 'Markdown', {
        reply_markup: {
          inline_keyboard: [[
            { text: '🚀 Open Dashboard', web_app: { url: webAppUrl } }
          ]]
        }
      });

    } else if (text.startsWith('/help')) {
      await sendMessage(chatId, `📖 *TELE HOST - Help Guide*

*Available Commands:*
/start - Start the bot and see welcome message
/dashboard - Open your dashboard
/help - Show this help message
/status - Check your account status

*Features:*
✅ Deploy bots in seconds
✅ Real-time log monitoring
✅ Environment variable management
✅ File editing in browser
✅ Auto-restart (Premium)

*Support:*
Need assistance? Contact us at @BACK_BENCHERS17

*Getting Started:*
1. Use the menu button to open dashboard
2. Deploy your first bot
3. Monitor and manage with ease!`, 'Markdown');

    } else if (text.startsWith('/status')) {
      await sendMessage(chatId, `📊 *Account Status*

To view your detailed account status, please visit your dashboard:

${webAppUrl}

There you can see:
• Active bots and their status
• Usage limits and tier
• Bot logs and statistics

Use the menu button or /dashboard to access! 👇`, 'Markdown');

    } else {
      // Default response for unknown commands
      await sendMessage(chatId, `I didn't understand that command. 🤔

Try one of these:
/start - Get started
/dashboard - Open dashboard
/help - Get help
/status - Check status

Or click the menu button below! 👇`);
    }
  } catch (error) {
    console.error('Error handling bot update:', error);
  }
}

async function sendMessage(chatId: number, text: string, parseMode?: string, extra?: any): Promise<void> {
  try {
    await makeRequest('sendMessage', {
      chat_id: chatId,
      text: text,
      parse_mode: parseMode,
      ...extra
    });
  } catch (error) {
    console.error('Error sending message:', error);
  }
}
