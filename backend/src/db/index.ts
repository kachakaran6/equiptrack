import { Pool, QueryResult, QueryResultRow } from 'pg';
import { env } from '../config/env.js';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export type QueryFn = <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
) => Promise<QueryResult<T>>;

let customQueryHandler: QueryFn | null = null;

// Proxy pool.connect to support in-memory test mocks seamlessly
const originalConnect = pool.connect.bind(pool);
(pool as any).connect = async function (...args: any[]) {
  if (customQueryHandler) {
    return {
      query: async (text: string, params?: any[]) => {
        const clean = text.trim().toUpperCase();
        if (clean === 'BEGIN' || clean === 'COMMIT' || clean === 'ROLLBACK') {
          return { rows: [], rowCount: 0 };
        }
        if (clean.includes('INSERT INTO AUDIT_LOGS')) {
          return { rows: [{ id: 'mock-audit-id-' + Date.now() }], rowCount: 1 };
        }
        if (clean.includes('INSERT INTO AUDIT_OUTBOX')) {
          return { rows: [{ id: 'mock-outbox-id-' + Date.now() }], rowCount: 1 };
        }
        return customQueryHandler!(text, params);
      },
      release: () => {},
    };
  }
  return (originalConnect as any)(...args);
};

export function setCustomQueryHandler(fn: QueryFn | null): void {
  customQueryHandler = fn;
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  if (customQueryHandler) {
    return customQueryHandler<T>(text, params);
  }

  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (env.NODE_ENV === 'development') {
    console.log(`[SQL] executed query in ${duration}ms:`, { text: text.trim().replace(/\s+/g, ' '), rows: res.rowCount });
  }
  return res;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
  }
}
