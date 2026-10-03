import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment from backend/.env and build/.env
const backendEnv = fs.existsSync(path.join(__dirname, '../../.env'))
  ? dotenv.parse(fs.readFileSync(path.join(__dirname, '../../.env')))
  : {};

const buildEnvPath = path.join(__dirname, '../../../build/app/intermediates/assets/debug/mergeDebugAssets/flutter_assets/.env');
const buildEnv = fs.existsSync(buildEnvPath)
  ? dotenv.parse(fs.readFileSync(buildEnvPath))
  : {};

const SUPABASE_URL = process.env.SUPABASE_URL || backendEnv.SUPABASE_URL || buildEnv.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || backendEnv.SUPABASE_SERVICE_ROLE_KEY || backendEnv.SUPABASE_ANON_KEY || buildEnv.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: SUPABASE_URL or SUPABASE_ANON_KEY / SERVICE_ROLE_KEY not found in environment.');
  process.exit(1);
}

async function fetchTable(table: string) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    });

    if (!res.ok) {
      return { error: `HTTP ${res.status}: ${await res.text()}` };
    }
    const data = await res.json() as any[];
    const contentRange = res.headers.get('content-range');
    return { data, totalCount: contentRange ? contentRange.split('/')[1] : data.length };
  } catch (err: any) {
    return { error: err.message };
  }
}

async function fetchAuthUsers() {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) {
      return { error: `HTTP ${res.status}: ${await res.text()}` };
    }
    const data = await res.json() as any;
    return { users: data.users || [] };
  } catch (err: any) {
    return { error: err.message };
  }
}

async function inspect() {
  console.log('=== Inspecting Supabase Data Sources ===');
  console.log(`Supabase Host: ${SUPABASE_URL.replace(/:\/\/.*@/, '://***@')}`);

  const authResult = await fetchAuthUsers();
  if (authResult.error) {
    console.log(`Auth Users: ERROR (${authResult.error})`);
  } else {
    console.log(`Auth Users: Found ${authResult.users.length} registered users:`);
    for (const u of authResult.users) {
      console.log(`  - ID: ${u.id} | Email: ${u.email} | Created: ${u.created_at}`);
    }
  }

  for (const table of ['machines', 'sections', 'usage_records']) {
    const result = await fetchTable(table);
    if (result.error) {
      console.log(`Table '${table}': ERROR (${result.error})`);
    } else {
      console.log(`Table '${table}': ${result.data?.length ?? 0} rows found (total range: ${result.totalCount}).`);
      if (result.data && result.data.length > 0) {
        console.log(`  Columns:`, Object.keys(result.data[0]).join(', '));
        const createdByUsers = [...new Set(result.data.map(r => r.created_by).filter(Boolean))];
        console.log(`  Unique created_by IDs: ${createdByUsers.length} (${createdByUsers.slice(0, 3).join(', ')})`);
      }
    }
  }
}

inspect();
