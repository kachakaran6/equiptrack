import pg from 'pg';

const COOLIFY_EXTERNAL_DB = 'postgres://postgres:ZOvW4m3ixmmZppFrHf6DffU63EOPHogrTOaCsZ1RcXk9iQJVgbF0vrqx5Hf13RVx@141.148.214.132:5433';

async function inspect() {
  console.log('Connecting to self-hosted PostgreSQL at 141.148.214.132:5433...');

  // 1. Check all databases
  const adminPool = new pg.Pool({ connectionString: `${COOLIFY_EXTERNAL_DB}/postgres` });
  try {
    const dbs = await adminPool.query('SELECT datname FROM pg_database WHERE datistemplate = false');
    console.log('Databases found:', dbs.rows.map(r => r.datname));
  } catch (e) {
    console.error('Error listing databases:', e);
  } finally {
    await adminPool.end();
  }

  // 2. Connect to equiptrack database
  const pool = new pg.Pool({ connectionString: `${COOLIFY_EXTERNAL_DB}/equiptrack` });
  try {
    // List all tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('\nTables in equiptrack DB:', tables.rows.map(r => r.table_name));

    // Check categories table in full
    const categories = await pool.query('SELECT * FROM categories ORDER BY created_at ASC');
    console.log(`\nCategories (${categories.rows.length}):`);
    for (const c of categories.rows) {
      console.log(`  - ID: ${c.id} | Name: "${c.name}" | User: ${c.user_id} | Machine: ${c.machine_id} | Created: ${c.created_at}`);
    }

    // Check schema_migrations
    const migrations = await pool.query('SELECT * FROM schema_migrations ORDER BY version ASC');
    console.log('\nApplied Migrations:');
    for (const m of migrations.rows) {
      console.log(`  - ${m.version} (${m.applied_at})`);
    }

    // Check sections and distinct category_id
    const sectionsCat = await pool.query(`
      SELECT DISTINCT category_id, COUNT(*) as count 
      FROM sections 
      GROUP BY category_id
    `);
    console.log('\nSections Category IDs distribution:', sectionsCat.rows);

    // Check inventory_products
    const inv = await pool.query('SELECT id, name, user_id FROM inventory_products');
    console.log(`\nInventory Products (${inv.rows.length}):`, inv.rows);

    // Check backup_history
    const backups = await pool.query('SELECT * FROM backup_history ORDER BY created_at DESC LIMIT 5');
    console.log(`\nBackup history (${backups.rows.length}):`, backups.rows);

  } catch (e) {
    console.error('Error inspecting equiptrack DB:', e);
  } finally {
    await pool.end();
  }
}

inspect();
