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
