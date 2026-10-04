import fs from 'fs';
import path from 'path';
import os from 'os';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';
import { spawnSync } from 'child_process';
import { stringify } from 'csv-stringify/sync';
import { createRequire } from 'module';
import { query, pool } from '../../db/index.js';
import { env } from '../../config/env.js';

const require = createRequire(import.meta.url);
const archiver = require('archiver');

export type BackupFormat = 'sql' | 'json' | 'csv' | 'zip';

const BACKUP_TABLES = ['users', 'machines', 'sections', 'usage_records'];

export interface BackupResult {
  filePath: string;
  fileName: string;
  format: BackupFormat;
  sizeBytes: number;
  checksum: string;
}

function backupDir(): string {
  const dir = path.join(os.tmpdir(), 'equiptrack-backups');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

async function fileChecksum(filePath: string): Promise<string> {
  const { createHash } = await import('crypto');
  const hash = createHash('sha256');
  const stream = fs.createReadStream(filePath);
  for await (const chunk of stream) {
    hash.update(chunk as Buffer);
  }
  return hash.digest('hex');
}

/**
 * SQL dump via pg_dump (preferred) or raw SQL SELECT fallback.
 */
export async function generateSqlBackup(compress: boolean): Promise<BackupResult> {
  const ts = timestamp();
  const ext = compress ? '.sql.gz' : '.sql';
  const fileName = `equiptrack_${ts}${ext}`;
  const filePath = path.join(backupDir(), fileName);

  // Try pg_dump first
  const pgDumpPath = process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump';
  const dbUrl = env.DATABASE_URL;

  // Use safe argument array — never interpolate user input into shell string
  const pgDumpArgs = [
    '--clean', '--if-exists', '--no-owner', '--no-privileges',
    '--exclude-table=schema_migrations',
    dbUrl,
  ];

  const pgResult = spawnSync(pgDumpPath, pgDumpArgs, {
    encoding: 'buffer',
    maxBuffer: 100 * 1024 * 1024, // 100MB
  });

  let sqlContent: Buffer;

  if (pgResult.status === 0 && pgResult.stdout?.length > 0) {
    sqlContent = pgResult.stdout;
  } else {
    // Fallback: generate SQL manually from pg pool
    sqlContent = Buffer.from(await generateManualSqlDump(), 'utf-8');
  }

  if (compress) {
    await new Promise<void>((resolve, reject) => {
      const ws = createWriteStream(filePath);
      const gz = createGzip();
      gz.on('error', reject);
      ws.on('error', reject);
      ws.on('finish', resolve);
      gz.pipe(ws);
      gz.end(sqlContent);
    });
  } else {
    fs.writeFileSync(filePath, sqlContent);
  }

  const stat = fs.statSync(filePath);
  const checksum = await fileChecksum(filePath);
  return { filePath, fileName, format: 'sql', sizeBytes: stat.size, checksum };
}

async function generateManualSqlDump(): Promise<string> {
  const lines: string[] = [
    '-- EquipTrack Manual SQL Dump',
    `-- Generated: ${new Date().toISOString()}`,
    '-- Tables: users, machines, sections, usage_records',
    '',
  ];

  for (const table of BACKUP_TABLES) {
    const colRes = await query<{ column_name: string; data_type: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = $1 AND table_schema = 'public'
       ORDER BY ordinal_position`,
      [table]
    );
    const cols = colRes.rows.map((r) => r.column_name);
    const dataRes = await query(`SELECT ${cols.map((c) => `"${c}"`).join(', ')} FROM "${table}"`);

    lines.push(`-- Table: ${table}`);
    lines.push(`TRUNCATE TABLE "${table}" CASCADE;`);
    for (const row of dataRes.rows) {
      const values = cols.map((c) => {
        const v = row[c];
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
        if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
        return String(v);
      });
      lines.push(`INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * JSON backup — excludes password_hash for safety (documented decision).
 */
export async function generateJsonBackup(compress: boolean): Promise<BackupResult> {
  const ts = timestamp();
  const ext = compress ? '.json.gz' : '.json';
  const fileName = `equiptrack_${ts}${ext}`;
  const filePath = path.join(backupDir(), fileName);

  const backup: Record<string, unknown> = {
    backupVersion: 1,
    createdAt: new Date().toISOString(),
    database: 'equiptrack',
    tables: {},
  };

  for (const table of BACKUP_TABLES) {
    let selectCols = '*';
    // Exclude password hashes from JSON backup (security decision — documented)
    if (table === 'users') {
      selectCols = 'id, email, role, status, created_at, updated_at';
    }
    const res = await query(`SELECT ${selectCols} FROM "${table}" ORDER BY created_at ASC`);
    (backup.tables as Record<string, unknown>)[table] = res.rows;
  }

  const jsonContent = JSON.stringify(backup, null, 2);

  if (compress) {
    await pipeline(
      async function* () { yield Buffer.from(jsonContent, 'utf-8'); },
      createGzip(),
      createWriteStream(filePath)
    );
  } else {
    fs.writeFileSync(filePath, jsonContent, 'utf-8');
  }

  const stat = fs.statSync(filePath);
  const checksum = await fileChecksum(filePath);
  return { filePath, fileName, format: 'json', sizeBytes: stat.size, checksum };
}

/**
 * CSV/ZIP backup — one CSV per table, packaged as .zip
 */
export async function generateCsvBackup(): Promise<BackupResult> {
  const ts = timestamp();
  const fileName = `equiptrack_${ts}.zip`;
  const filePath = path.join(backupDir(), fileName);

  return new Promise(async (resolve, reject) => {
    const output = createWriteStream(filePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', async () => {
      try {
        const stat = fs.statSync(filePath);
        const checksum = await fileChecksum(filePath);
        resolve({ filePath, fileName, format: 'csv', sizeBytes: stat.size, checksum });
      } catch (e) {
        reject(e);
      }
    });

    archive.on('error', reject);
    archive.pipe(output);

    for (const table of BACKUP_TABLES) {
      let selectCols = '*';
      if (table === 'users') {
        selectCols = 'id, email, role, status, created_at, updated_at';
      }
      const res = await query(`SELECT ${selectCols} FROM "${table}" ORDER BY created_at ASC`);

      if (res.rows.length === 0) {
        archive.append('', { name: `${table}.csv` });
        continue;
      }

      const headers = Object.keys(res.rows[0]);
      const csvData = stringify(res.rows, {
        header: true,
        columns: headers,
        cast: {
          object: (v) => (v === null ? '' : JSON.stringify(v)),
          boolean: (v) => String(v),
        },
      });

      archive.append(csvData, { name: `${table}.csv` });
    }

    archive.finalize();
  });
}

/**
 * Main backup dispatch function.
 */
export async function generateBackup(format: BackupFormat, compress: boolean): Promise<BackupResult> {
  switch (format) {
    case 'sql':
      return generateSqlBackup(compress);
    case 'json':
      return generateJsonBackup(compress);
    case 'csv':
    case 'zip':
      return generateCsvBackup();
    default:
      throw new Error(`Unsupported backup format: ${format}`);
  }
}

/**
 * Safely delete a temp backup file. Never throws.
 */
export function cleanupBackupFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('[Backup] Failed to clean temp file:', err);
  }
}
