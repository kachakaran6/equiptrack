import { query, closePool } from '../src/db/index.js';
import { hashPassword } from '../src/utils/crypto.js';

async function resetPass() {
  const newPass = process.argv[2] || 'admin123';
  const email = process.argv[3] || 'karan@gmail.com';

  const hash = await hashPassword(newPass);
  await query("UPDATE users SET password_hash = $1, role = 'admin', status = 'active' WHERE email = $2", [hash, email]);
  console.log(`✅ Password for ${email} has been set to: ${newPass}`);
  console.log(`✅ Role: admin | Status: active`);
  await closePool();
}

resetPass();
