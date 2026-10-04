import pg from 'pg';

const COOLIFY_EXTERNAL_DB = 'postgres://postgres:ZOvW4m3ixmmZppFrHf6DffU63EOPHogrTOaCsZ1RcXk9iQJVgbF0vrqx5Hf13RVx@141.148.214.132:5433/equiptrack';

async function main() {
  const pool = new pg.Pool({ connectionString: COOLIFY_EXTERNAL_DB });
  try {
    const checkUsers = await pool.query('SELECT id, email, role, status FROM users ORDER BY created_at ASC');
    console.log('Current users in DB:');
    console.table(checkUsers.rows);

    const updateRes = await pool.query(`
      UPDATE users 
      SET role = 'admin', status = 'active'
      WHERE LOWER(email) IN ('karan@gmail.com', '1sanjaypathak@gmail.com', 'admin@equiptrack.internal')
      RETURNING id, email, role, status
    `);
    console.log('Promoted Admin Users:');
    console.table(updateRes.rows);

    // If no users were updated, promote all existing users to admin
    if (updateRes.rows.length === 0 && checkUsers.rows.length > 0) {
      const fallback = await pool.query(`UPDATE users SET role = 'admin', status = 'active' RETURNING id, email, role, status`);
      console.log('Fallback promoted users:');
      console.table(fallback.rows);
    }
  } catch (err: any) {
    console.error('Error ensuring admin roles:', err.message);
  } finally {
    await pool.end();
  }
}

main();
