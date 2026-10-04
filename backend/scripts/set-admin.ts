import { query, closePool } from '../src/db/index.js';

async function setAdminRoles() {
  try {
    await query("UPDATE users SET role = 'admin' WHERE email IN ('karan@gmail.com', '1sanjaypathak@gmail.com')");
    const result = await query("SELECT id, email, role, status FROM users");
    console.log('Current User Accounts & Roles:');
    console.table(result.rows);
  } catch (err) {
    console.error('Error updating admin roles:', err);
  } finally {
    await closePool();
  }
}

setAdminRoles();
