const fs = require('fs');
const { Client } = require('pg');

async function applyMigration() {
  const sql = fs.readFileSync('D:/Machine/backend/migrations/022_production_grade_audit_and_outbox.sql', 'utf8');

  // 1. Local DB
  console.log('Applying Migration 022 to local PostgreSQL (127.0.0.1:5433)...');
  const localClient = new Client({ connectionString: 'postgres://postgres:password@127.0.0.1:5433/equiptrack' });
  await localClient.connect();
  await localClient.query(sql);
  await localClient.query(`INSERT INTO schema_migrations (version) VALUES ('022_production_grade_audit_and_outbox.sql') ON CONFLICT DO NOTHING;`);
  console.log('✅ Applied to local DB successfully!');

  // Verify immutability trigger on local DB
  try {
    await localClient.query(`UPDATE audit_logs SET user_email = 'hacked' WHERE id = (SELECT id FROM audit_logs LIMIT 1)`);
    console.error('❌ Tampering was NOT blocked!');
  } catch (err) {
    console.log('✅ Immutability trigger verified: blocked update with message:', err.message);
  }

  await localClient.end();

  // 2. Remote DB
  console.log('\nApplying Migration 022 to remote PostgreSQL (141.148.214.132:5433)...');
  const remoteUrl = 'postgres://postgres:ZOvW4m3ixmmZppFrHf6DffU63EOPHogrTOaCsZ1RcXk9iQJVgbF0vrqx5Hf13RVx@141.148.214.132:5433/equiptrack';
  const remoteClient = new Client({ connectionString: remoteUrl });
  await remoteClient.connect();
  await remoteClient.query(sql);
  await remoteClient.query(`INSERT INTO schema_migrations (version) VALUES ('022_production_grade_audit_and_outbox.sql') ON CONFLICT DO NOTHING;`);
  console.log('✅ Applied to remote DB successfully!');
  await remoteClient.end();
}

applyMigration().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
