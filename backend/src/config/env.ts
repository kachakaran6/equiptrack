import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/equiptrack'),
  JWT_SECRET: z.string().min(16).default('equiptrack-default-secret-change-in-production-key-32'),
  JWT_EXPIRES_IN: z.string().default('365d'),
  CORS_ORIGINS: z.string().default('*'),

  // Telegram backup credentials (never exposed in API responses)
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),

  // Backup scheduler defaults (can be overridden by DB config)
  BACKUP_ENABLED: z.coerce.boolean().default(true),
  BACKUP_CRON: z.string().default('0 2 * * *'),
  BACKUP_TIMEZONE: z.string().default('Asia/Kolkata'),
  BACKUP_FORMAT: z.enum(['sql', 'json', 'csv', 'zip']).default('sql'),
  BACKUP_COMPRESSION: z.enum(['none', 'gzip']).default('gzip'),
  BACKUP_RETENTION_DAYS: z.coerce.number().default(30),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
