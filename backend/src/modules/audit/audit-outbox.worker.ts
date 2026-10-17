import http from 'http';
import https from 'https';
import { query } from '../../db/index.js';
import { env } from '../../config/env.js';

interface OutboxTask {
  id: string;
  audit_log_id: string | null;
  event_name: string;
  distinct_id: string;
  properties: Record<string, unknown>;
  attempt_count: number;
  max_attempts: number;
  created_at: string;
}

export class AuditOutboxWorker {
  private static isRunning = false;
  private static timer: NodeJS.Timeout | null = null;
  private static isProcessing = false;

  private static readonly POLL_INTERVAL_MS = 5000;
  private static readonly BATCH_SIZE = 50;

  /**
   * Starts background processing of pending PostHog outbox events.
   */
  static start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('[AuditOutboxWorker] Started background PostHog analytics outbox worker.');

    // Schedule periodic processing
    this.timer = setInterval(() => {
      this.processBatch().catch((err) => {
        console.error('[AuditOutboxWorker] Batch processing error:', err);
      });
    }, this.POLL_INTERVAL_MS);

    // Initial kick
    setImmediate(() => {
      this.processBatch().catch(() => {});
    });
  }

  /**
   * Stops background worker cleanly.
   */
  static stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[AuditOutboxWorker] Stopped background outbox worker.');
  }

  /**
   * Processes a single batch of pending outbox events.
   */
  static async processBatch(): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;

    try {
      const token = env.POSTHOG_PROJECT_TOKEN;
      if (!token || token.startsWith('phc_your_')) {
        // PostHog not configured, skip delivery silently
        return 0;
      }

      // 1. Fetch pending records ready for retry
      const fetchRes = await query<OutboxTask>(`
        UPDATE audit_outbox
        SET status = 'processing', last_attempt_at = CURRENT_TIMESTAMP
        WHERE id IN (
          SELECT id FROM audit_outbox
          WHERE status = 'pending' AND next_retry_at <= CURRENT_TIMESTAMP
          ORDER BY next_retry_at ASC
          LIMIT ${this.BATCH_SIZE}
          FOR UPDATE SKIP LOCKED
        )
        RETURNING id, audit_log_id, event_name, distinct_id, properties, attempt_count, max_attempts, created_at;
      `);

      const tasks = fetchRes.rows;
      if (tasks.length === 0) {
        return 0;
      }

      console.log(`[AuditOutboxWorker] Delivering ${tasks.length} outbox event(s) to PostHog...`);

      // 2. Prepare PostHog batch payload
      const batchPayload = tasks.map((task) => ({
        event: task.event_name,
        distinct_id: task.distinct_id,
        properties: {
          ...task.properties,
          $lib: 'equiptrack-backend-outbox',
          outbox_id: task.id,
        },
        timestamp: String(task.properties.occurred_at || task.created_at || new Date().toISOString()),
        uuid: task.id,
      }));

      // 3. Send batch to PostHog HTTP Batch API
      const success = await this.sendPostHogBatch(token, env.POSTHOG_HOST, batchPayload);

      if (success) {
        const ids = tasks.map((t) => `'${t.id}'`).join(',');
        await query(`
          UPDATE audit_outbox
          SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP, last_error = NULL
          WHERE id IN (${ids});
        `);
        console.log(`[AuditOutboxWorker] Successfully delivered ${tasks.length} events to PostHog.`);
        return tasks.length;
      } else {
        throw new Error('PostHog batch endpoint rejected payload or returned error status');
      }
    } catch (err: any) {
      console.warn(`[AuditOutboxWorker] PostHog delivery failed: ${err.message}. Scheduling retries with backoff.`);

      // Handle failures with exponential backoff & jitter
      // Fetch currently processing items and update their next_retry_at
      await query(`
        UPDATE audit_outbox
        SET 
          status = CASE 
            WHEN attempt_count + 1 >= max_attempts THEN 'failed'
            ELSE 'pending'
          END,
          attempt_count = attempt_count + 1,
          next_retry_at = CURRENT_TIMESTAMP + (LEAST(3600, POWER(2, attempt_count) * 2 + (RANDOM() * 5)) || ' seconds')::interval,
          last_error = $1
        WHERE status = 'processing';
      `, [err.message || 'Network / Ingestion error']);

      return 0;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Helper that sends batch to PostHog Batch API using native http/https
   */
  private static sendPostHogBatch(
    token: string,
    host: string,
    batch: Array<{ event: string; distinct_id: string; properties: Record<string, unknown>; timestamp: string; uuid: string }>
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const cleanHost = host.replace(/\/+$/, '');
        const targetUrl = new URL(`${cleanHost}/batch/`);

        const postData = JSON.stringify({
          api_key: token,
          batch,
        });

        const isHttps = targetUrl.protocol === 'https:';
        const client = isHttps ? https : http;

        const req = client.request(
          targetUrl,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
              'User-Agent': 'EquipTrack-OutboxWorker/1.0',
            },
            timeout: 15000,
          },
          (res) => {
            let body = '';
            res.on('data', (chunk) => {
              body += chunk;
            });
            res.on('end', () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve(true);
              } else {
                reject(new Error(`PostHog HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
              }
            });
          }
        );

        req.on('error', (err) => {
          reject(err);
        });

        req.on('timeout', () => {
          req.destroy(new Error('PostHog request timed out after 15s'));
        });

        req.write(postData);
        req.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
