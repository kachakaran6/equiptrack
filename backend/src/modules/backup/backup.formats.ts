import fs from 'fs';
import path from 'path';
import os from 'os';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';
import { spawnSync } from 'child_process';
import { stringify } from 'csv-stringify/sync';
import { createRequire } from 'module';
import { query } from '../../db/index.js';
import { env } from '../../config/env.js';

const require = createRequire(import.meta.url);
const archiver = require('archiver');

export type BackupFormat = 'sql' | 'json' | 'csv' | 'zip';

export interface BackupResult {
  filePath: string;
  fileName: string;
  format: BackupFormat;
  sizeBytes: number;
  checksum: string;
  tableCount?: number;
}

/**
 * Dynamically discover all public base tables in the PostgreSQL database.
 * Orders parent tables first to preserve foreign key constraints when restoring.
 */
export async function getAllDatabaseTables(): Promise<string[]> {
  try {
    const res = await query<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_type = 'BASE TABLE'
         AND table_name != 'schema_migrations'
       ORDER BY
         CASE
           WHEN table_name = 'users' THEN 1
           WHEN table_name = 'categories' THEN 2
           WHEN table_name = 'machines' THEN 3
           WHEN table_name = 'sections' THEN 4
           WHEN table_name = 'usage_records' THEN 5
           WHEN table_name = 'inventory_products' THEN 6
           WHEN table_name = 'inventory_sub_products' THEN 7
           WHEN table_name = 'inventory_transactions' THEN 8
           WHEN table_name = 'audit_logs' THEN 9
           WHEN table_name = 'error_logs' THEN 10
           WHEN table_name = 'backup_config' THEN 11
           WHEN table_name = 'backup_history' THEN 12
           ELSE 20
         END,
         table_name ASC`
    );
    const tables = res.rows.map((r) => r.table_name);
    return tables.length > 0
      ? tables
      : [
          'users',
          'categories',
          'machines',
          'sections',
          'usage_records',
          'inventory_products',
          'inventory_sub_products',
          'inventory_transactions',
          'audit_logs',
          'error_logs',
          'backup_config',
          'backup_history',
        ];
  } catch (err) {
    console.error('[BackupFormats] Failed to discover tables dynamically, using fallback:', err);
    return [
      'users',
      'categories',
      'machines',
      'sections',
      'usage_records',
      'inventory_products',
      'inventory_sub_products',
      'inventory_transactions',
      'audit_logs',
      'error_logs',
      'backup_config',
      'backup_history',
    ];
  }
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
 * SQL dump via pg_dump (preferred) or dynamic multi-table raw SQL SELECT fallback.
 */
export async function generateSqlBackup(compress: boolean): Promise<BackupResult> {
  const ts = timestamp();
  const ext = compress ? '.sql.gz' : '.sql';
  const fileName = `equiptrack_full_db_${ts}${ext}`;
  const filePath = path.join(backupDir(), fileName);

  const tables = await getAllDatabaseTables();

  // Try pg_dump first
  const pgDumpPath = process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump';
  const dbUrl = env.DATABASE_URL;

  const pgDumpArgs = [
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-privileges',
    '--exclude-table=schema_migrations',
    dbUrl,
  ];

  let sqlContent: Buffer | null = null;
  try {
    const pgResult = spawnSync(pgDumpPath, pgDumpArgs, {
      encoding: 'buffer',
      maxBuffer: 100 * 1024 * 1024, // 100MB
    });

    if (pgResult.status === 0 && pgResult.stdout?.length > 0) {
      sqlContent = pgResult.stdout;
    }
  } catch (err) {
    console.warn('[Backup] pg_dump utility unavailable, proceeding with dynamic SQL fallback generator.');
  }

  if (!sqlContent) {
    // Comprehensive fallback: dynamically generate full SQL DDL + DML for all tables
    sqlContent = Buffer.from(await generateManualSqlDump(tables), 'utf-8');
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
  return { filePath, fileName, format: 'sql', sizeBytes: stat.size, checksum, tableCount: tables.length };
}

async function generateManualSqlDump(tables: string[]): Promise<string> {
  const lines: string[] = [
    '-- ====================================================================',
    '-- EquipTrack Complete PostgreSQL Database Backup',
    `-- Generated: ${new Date().toISOString()}`,
    `-- Total Tables Discovered: ${tables.length}`,
    `-- Tables: ${tables.join(', ')}`,
    '-- ====================================================================',
    '',
    'SET statement_timeout = 0;',
    'SET client_encoding = \'UTF8\';',
    'SET standard_conforming_strings = on;',
    '',
  ];

  // Disable triggers / foreign key constraints during restore if permitted
  lines.push('SET session_replication_role = \'replica\';');
  lines.push('');

  for (const table of tables) {
    try {
      const colRes = await query<{ column_name: string; data_type: string }>(
        `SELECT column_name, data_type
         FROM information_schema.columns
         WHERE table_name = $1 AND table_schema = 'public'
         ORDER BY ordinal_position`,
        [table]
      );
      const cols = colRes.rows.map((r) => r.column_name);

      if (cols.length === 0) continue;

      const dataRes = await query(`SELECT * FROM "${table}"`);

      lines.push(`-- ──────────────────────────────────────────────────────────`);
      lines.push(`-- Table: ${table} (${dataRes.rows.length} rows)`);
      lines.push(`-- ──────────────────────────────────────────────────────────`);
      lines.push(`TRUNCATE TABLE "${table}" CASCADE;`);

      for (const row of dataRes.rows) {
        const values = cols.map((c) => {
          const v = row[c];
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
          if (typeof v === 'number') return String(v);
          if (v instanceof Date) return `'${v.toISOString()}'`;
          if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
          return `'${String(v).replace(/'/g, "''")}'`;
        });
        lines.push(`INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});`);
      }
      lines.push('');
    } catch (err: any) {
      lines.push(`-- Error dumping table ${table}: ${err.message}`);
    }
  }

  lines.push('SET session_replication_role = \'origin\';');
  lines.push('-- Backup completed successfully.');
  return lines.join('\n');
}

/**
 * JSON backup — covers 100% of all database tables.
 */
export async function generateJsonBackup(compress: boolean): Promise<BackupResult> {
  const ts = timestamp();
  const ext = compress ? '.json.gz' : '.json';
  const fileName = `equiptrack_full_db_${ts}${ext}`;
  const filePath = path.join(backupDir(), fileName);

  const tables = await getAllDatabaseTables();

  const backup: Record<string, unknown> = {
    backupVersion: 2,
    createdAt: new Date().toISOString(),
    database: 'equiptrack',
    totalTables: tables.length,
    tableNames: tables,
    tables: {},
  };

  for (const table of tables) {
    try {
      const res = await query(`SELECT * FROM "${table}"`);
      (backup.tables as Record<string, unknown>)[table] = res.rows;
    } catch (err: any) {
      console.error(`[BackupJSON] Failed to fetch table ${table}:`, err);
      (backup.tables as Record<string, unknown>)[table] = [];
    }
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
  return { filePath, fileName, format: 'json', sizeBytes: stat.size, checksum, tableCount: tables.length };
}

/**
 * CSV / ZIP backup — dynamic CSV export for EVERY database table packaged into a ZIP archive.
 */
export async function generateCsvBackup(): Promise<BackupResult> {
  const ts = timestamp();
  const fileName = `equiptrack_full_db_${ts}.zip`;
  const filePath = path.join(backupDir(), fileName);

  const tables = await getAllDatabaseTables();

  return new Promise(async (resolve, reject) => {
    const output = createWriteStream(filePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', async () => {
      try {
        const stat = fs.statSync(filePath);
        const checksum = await fileChecksum(filePath);
        resolve({ filePath, fileName, format: 'csv', sizeBytes: stat.size, checksum, tableCount: tables.length });
      } catch (e) {
        reject(e);
      }
    });

    archive.on('error', reject);
    archive.pipe(output);

    // Also include a manifest JSON file inside the ZIP archive
    const manifest = {
      backupType: 'CSV_ZIP_ARCHIVE',
      database: 'equiptrack',
      createdAt: new Date().toISOString(),
      tablesCount: tables.length,
      tables,
    };
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

    for (const table of tables) {
      try {
        const res = await query(`SELECT * FROM "${table}"`);

        if (res.rows.length === 0) {
          // Empty table: create CSV with column headers from schema
          const colRes = await query<{ column_name: string }>(
            `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public' ORDER BY ordinal_position`,
            [table]
          );
          const headerLine = colRes.rows.map((c) => c.column_name).join(',') + '\n';
          archive.append(headerLine, { name: `${table}.csv` });
          continue;
        }

        const headers = Object.keys(res.rows[0]);
        const csvData = stringify(res.rows, {
          header: true,
          columns: headers,
          cast: {
            object: (v) => (v === null ? '' : JSON.stringify(v)),
            boolean: (v) => String(v),
            date: (v) => v.toISOString(),
          },
        });

        archive.append(csvData, { name: `${table}.csv` });
      } catch (err: any) {
        console.error(`[BackupCSV] Error archiving table ${table}:`, err);
        archive.append(`-- Error exporting table ${table}: ${err.message}`, { name: `${table}_error.txt` });
      }
    }

    archive.finalize();
  });
}

/**
 * Main backup dispatch function.
 */
export async function generateBackup(format: BackupFormat, compress: boolean): Promise<BackupResult> {
  const normFormat = (format || 'sql').toLowerCase() as BackupFormat;
  switch (normFormat) {
    case 'sql':
      return generateSqlBackup(compress);
    case 'json':
      return generateJsonBackup(compress);
    case 'csv':
    case 'zip':
      return generateCsvBackup();
    default:
      return generateSqlBackup(compress);
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

