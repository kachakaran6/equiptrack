import pg from 'pg';
import { runMigration } from './migrate-from-supabase/migrate.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Coolify external DB URL
const COOLIFY_EXTERNAL_DB = 'postgres://postgres:ZOvW4m3ixmmZppFrHf6DffU63EOPHogrTOaCsZ1RcXk9iQJVgbF0vrqx5Hf13RVx@141.148.214.132:5433';

async function main() {
  console.log('Connecting to Coolify PostgreSQL instance at 141.148.214.132:5433...');

  // 1. Ensure equiptrack database exists
  const adminPool = new pg.Pool({ connectionString: `${COOLIFY_EXTERNAL_DB}/postgres` });
  try {
    const res = await adminPool.query("SELECT 1 FROM pg_database WHERE datname = 'equiptrack'");
    if (res.rows.length === 0) {
      console.log("Creating database 'equiptrack' on Coolify server...");
      await adminPool.query('CREATE DATABASE "equiptrack"');
      console.log("Database 'equiptrack' created.");
    } else {
      console.log("Database 'equiptrack' already exists.");
    }
  } finally {
    await adminPool.end();
  }

  // 2. Run SQL Schema migrations (001 to 006)
  console.log('\nRunning SQL migrations on Coolify PostgreSQL...');
  const targetDbUrl = `${COOLIFY_EXTERNAL_DB}/equiptrack`;
  const pool = new pg.Pool({ connectionString: targetDbUrl });
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const migrationsDir = path.resolve(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    const appliedRes = await client.query('SELECT version FROM schema_migrations');
    const appliedVersions = new Set(appliedRes.rows.map((r) => r.version));

    for (const file of files) {
      if (appliedVersions.has(file)) continue;
      console.log(`Applying ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✅ Applied ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }

  // 3. Run Supabase data migration
  console.log('\nMigrating Supabase production data into Coolify PostgreSQL...');
  process.env.DATABASE_URL = targetDbUrl;
  await runMigration();
  console.log('\n✨ Coolify production database migration completed successfully!');
}

main().catch(err => {
  console.error('Fatal Coolify DB Migration Error:', err);
  process.exit(1);
});
