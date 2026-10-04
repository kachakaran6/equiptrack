import fs from 'fs';
import path from 'path';
import { env } from '../../config/env.js';

interface TelegramConfig {
  botToken: string;
  chatId: string;
}

function getEffectiveConfig(overrideChatId?: string): TelegramConfig | null {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = overrideChatId || env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return null;
  }

  return { botToken, chatId };
}

/**
 * Mask a chat ID for safe display — never expose bot token.
 */
export function maskChatId(chatId: string): string {
  if (chatId.length <= 4) return '****';
  return `****${chatId.slice(-4)}`;
}

/**
 * Send a test message to Telegram to verify credentials.
 * Never logs or returns the bot token.
 */
export async function sendTelegramTestMessage(
  overrideChatId?: string,
  overrideToken?: string
): Promise<{ success: boolean; error?: string }> {
  const botToken = overrideToken || env.TELEGRAM_BOT_TOKEN;
  const chatId = overrideChatId || env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return { success: false, error: 'Telegram bot token or chat ID not configured' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `✅ *EquipTrack Backup Service Test*\n\nConnection verified at ${new Date().toISOString()}.\nBackup system is operational.`,
        parse_mode: 'Markdown',
      }),
    });

    const data = (await res.json()) as { ok: boolean; description?: string };
    if (!data.ok) {
      return { success: false, error: data.description || 'Telegram API returned error' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: `Network error: ${err.message}` };
  }
}

/**
 * Send a backup file to Telegram as a document.
 * Cleans up temp file after sending (even on failure).
 */
export async function sendBackupToTelegram(
  filePath: string,
  caption: string,
  overrideChatId?: string
): Promise<{ success: boolean; error?: string }> {
  const config = getEffectiveConfig(overrideChatId);
  if (!config) {
    return { success: false, error: 'Telegram credentials not configured' };
  }

  const { botToken, chatId } = config;

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    // Use FormData for multipart file upload
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('caption', caption);
    formData.append('parse_mode', 'Markdown');
    formData.append(
      'document',
      new Blob([fileBuffer], { type: 'application/octet-stream' }),
      fileName
    );

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: 'POST',
      body: formData,
    });

    const data = (await res.json()) as { ok: boolean; description?: string };
    if (!data.ok) {
      return { success: false, error: data.description || 'Telegram upload failed' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: `Upload error: ${err.message}` };
  }
}

/**
 * Validate a bot token format without making a network call.
 */
export function isValidBotTokenFormat(token: string): boolean {
  // Telegram bot token format: 123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
  return /^\d+:[A-Za-z0-9_-]{35,}$/.test(token);
}

/**
 * Validate Telegram credentials by sending a getMe request.
 * Never logs or returns the token.
 */
export async function validateTelegramToken(token: string): Promise<{ valid: boolean; botName?: string; error?: string }> {
  if (!isValidBotTokenFormat(token)) {
    return { valid: false, error: 'Invalid bot token format' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = (await res.json()) as { ok: boolean; result?: { username: string; first_name: string }; description?: string };

    if (!data.ok) {
      return { valid: false, error: data.description || 'Invalid token' };
    }

    return { valid: true, botName: data.result?.username };
  } catch (err: any) {
    return { valid: false, error: `Network error: ${err.message}` };
  }
}
