import { pool } from '../src/db/index.js';
import { Pool } from 'pg';

async function main() {
  const remotePool = new Pool({
    connectionString: 'postgres://postgres:ZOvW4m3ixmmZppFrHf6DffU63EOPHogrTOaCsZ1RcXk9iQJVgbF0vrqx5Hf13RVx@141.148.214.132:5433/equiptrack'
  });

  const sql = "UPDATE sections SET user_id = '275d380b-eb06-404d-8789-cd176e29b21b' WHERE id IN ('18c86330-b2d0-4e98-afba-d9200f582c81', 'f3d0a65e-c0c1-43cc-b250-ab10793e2117')";

  const localRes = await pool.query(sql);
  console.log(`[Local] Updated ${localRes.rowCount} sections`);

  const remoteRes = await remotePool.query(sql);
  console.log(`[Remote] Updated ${remoteRes.rowCount} sections`);

  await remotePool.end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
