import { AuditLogEntry, OutboxEntry } from './audit.types.js';

export const SENSITIVE_FIELD_NAMES = new Set([
  'password',
  'passwordhash',
  'token',
  'secret',
  'jwt',
  'apikey',
  'key',
  'accesstoken',
  'refreshtoken',
  'telegrambottoken',
  'supabaseanonkey',
  'supabaseservicerolekey',
  'posthogpersonalapikey',
  'authorization',
]);

/**
 * Checks if a key matches any sensitive credential pattern regardless of casing or punctuation
 */
export function isSensitiveField(key: string, extraFields: string[] = []): boolean {
  const norm = key.toLowerCase().replace(/[-_]/g, '');
  if (SENSITIVE_FIELD_NAMES.has(norm)) return true;
  for (const extra of extraFields) {
    if (norm === extra.toLowerCase().replace(/[-_]/g, '')) return true;
  }
  // Check substring matches for critical secret terms
  if (norm.includes('password') || norm.includes('secret') || norm.includes('apikey')) return true;
  return false;
}

/**
 * Redacts any sensitive keys in an object shallowly or deeply
 */
export function redactObject(
  obj: Record<string, unknown> | null | undefined,
  extraSensitiveFields: string[] = []
): Record<string, unknown> | null {
  if (!obj || typeof obj !== 'object') return null;

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveField(key, extraSensitiveFields)) {
      result[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = redactObject(value as Record<string, unknown>, extraSensitiveFields);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Computes exact field-level differences between before and after snapshots.
 * Returns changedFields list and safe redacted snapshots.
 */
export function computeDiffAndRedact(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
  extraSensitiveFields: string[] = []
): {
  changedFields: string[];
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
} {
  const safeBefore = redactObject(before, extraSensitiveFields);
  const safeAfter = redactObject(after, extraSensitiveFields);

  if (!safeBefore && !safeAfter) {
    return { changedFields: [], beforeData: null, afterData: null };
  }

  if (!safeBefore && safeAfter) {
    // Record created
    return {
      changedFields: Object.keys(safeAfter),
      beforeData: null,
      afterData: safeAfter,
    };
  }

  if (safeBefore && !safeAfter) {
    // Record deleted
    return {
      changedFields: Object.keys(safeBefore),
      beforeData: safeBefore,
      afterData: null,
    };
  }

  // Update operation: compare field by field using raw values
  const rawBefore = before || {};
  const rawAfter = after || {};
  const allKeys = new Set([...Object.keys(rawBefore), ...Object.keys(rawAfter)]);
  const changedFields: string[] = [];

  for (const key of allKeys) {
    // Ignore internal timestamp differences if only updated_at changed
    if (key === 'updated_at' || key === 'ingested_at') continue;

    const v1 = rawBefore[key];
    const v2 = rawAfter[key];

    const s1 = typeof v1 === 'object' ? JSON.stringify(v1) : String(v1);
    const s2 = typeof v2 === 'object' ? JSON.stringify(v2) : String(v2);

    if (s1 !== s2) {
      changedFields.push(key);
    }
  }

  return {
    changedFields,
    beforeData: safeBefore,
    afterData: safeAfter,
  };
}

/**
 * Maps database audit action to standard PostHog event naming convention (e.g. category.deleted -> category_deleted)
 */
export function mapActionToPostHogEvent(action: string): string {
  return action.replace(/\./g, '_').toLowerCase();
}

/**
 * Builds safe, non-bloated properties for PostHog event envelope
 */
export function buildPostHogProperties(entry: AuditLogEntry, auditLogId?: string): Record<string, unknown> {
  const props: Record<string, unknown> = {
    audit_event_id: auditLogId || entry.id,
    action: entry.action,
    resource_type: entry.resourceType,
    resource_id: entry.resourceId ?? null,
    resource_label: entry.resourceLabel ?? null,
    outcome: entry.outcome ?? 'SUCCESS',
    source: entry.source ?? 'api',
    occurred_at: entry.occurredAt ? entry.occurredAt.toISOString() : new Date().toISOString(),
    actor_user_id: entry.actorUserId ?? null,
    actor_role: entry.actorRole ?? 'user',
    actor_email: entry.actorEmail ?? null,
    request_id: entry.requestId ?? null,
    correlation_id: entry.correlationId ?? null,
    changed_fields: entry.changedFields ?? [],
    application_version: entry.applicationVersion ?? '1.0.0',
    $app_version: entry.applicationVersion ?? '1.0.0',
  };

  // Add non-sensitive metadata if available
  if (entry.metadata && Object.keys(entry.metadata).length > 0) {
    const safeMeta = redactObject(entry.metadata);
    props.metadata = safeMeta;
  }

  return props;
}

/**
 * Prepares an outbox entry specification from an audit log entry
 */
export function createOutboxSpec(entry: AuditLogEntry, auditLogId?: string): OutboxEntry {
  const distinctId = entry.actorUserId || entry.actorEmail || 'system';
  const eventName = mapActionToPostHogEvent(entry.action);
  const properties = buildPostHogProperties(entry, auditLogId);

  return {
    auditLogId,
    eventName,
    distinctId,
    properties,
  };
}
