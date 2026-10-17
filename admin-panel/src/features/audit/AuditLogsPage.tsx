import type { FC } from 'react'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { auditApi, type AuditQueryParams } from '@/lib/api/auditApi'
import type { AuditLog } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusPill } from '@/components/ui/status-pill'
import { FormattedDate } from '@/components/ui/formatted-date'
import { CopyableCode } from '@/components/ui/copyable-code'
import { StatCard } from '@/components/ui/stat-card'
import {
  Search,
  RefreshCw,
  Clock,
  Shield,
  FileCode,
  Activity,
  Download,
  Send,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  ArrowRight,
  Laptop,
  Smartphone,
  Server,
} from 'lucide-react'

export const AuditLogsPage: FC = () => {
  const queryClient = useQueryClient()

  // State
  const [searchTerm, setSearchTerm] = useState('')
  const [resourceType, setResourceType] = useState<string>('')
  const [outcome, setOutcome] = useState<string>('')
  const [source, setSource] = useState<string>('')
  const [page, setPage] = useState(1)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const limit = 20

  const queryParams: AuditQueryParams = useMemo(() => ({
    page,
    limit,
    search: searchTerm || undefined,
    resource_type: resourceType || undefined,
    outcome: outcome || undefined,
    source: source || undefined,
  }), [page, limit, searchTerm, resourceType, outcome, source])

  // Fetch Audit Logs
  const { data: logsResponse, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['adminAuditLogs', queryParams],
    queryFn: () => auditApi.listAuditLogs(queryParams),
    refetchInterval: 15000,
  })

  // Fetch Outbox Stats
  const { data: outboxStats, refetch: refetchStats } = useQuery({
    queryKey: ['adminAuditOutboxStats'],
    queryFn: () => auditApi.getOutboxStats(),
    refetchInterval: 10000,
  })

  // Flush Outbox Mutation
  const flushMutation = useMutation({
    mutationFn: () => auditApi.retryOutbox(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAuditOutboxStats'] })
      queryClient.invalidateQueries({ queryKey: ['adminAuditLogs'] })
    },
  })

  const auditLogs = logsResponse?.data || []
  const pagination = logsResponse?.pagination || { page: 1, limit, total: 0, totalPages: 1 }

  // Action Badge styling helper
  const getActionBadgeColor = (action: string) => {
    if (action.includes('created') || action.includes('register')) {
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    }
    if (action.includes('deleted') || action.includes('removed')) {
      return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
    }
    if (action.includes('updated') || action.includes('changed')) {
      return 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30'
    }
    return 'bg-muted text-muted-foreground border-border'
  }

  // Source icon helper
  const getSourceIcon = (src?: string) => {
    switch (src) {
      case 'mobile_app':
        return <Smartphone className="h-3.5 w-3.5 text-sky-500" />
      case 'admin_panel':
        return <Laptop className="h-3.5 w-3.5 text-indigo-500" />
      default:
        return <Server className="h-3.5 w-3.5 text-amber-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-indigo-500" />
            <span>Forensic Audit Trail</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Immutable PostgreSQL audit ledger with transactional PostHog analytics integration.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const url = auditApi.getExportCsvUrl(queryParams)
              window.open(url, '_blank')
            }}
            className="h-9 gap-2 shadow-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch()
              refetchStats()
            }}
            disabled={isFetching}
            className="h-9 gap-2 shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Operational Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Audit Events"
          value={pagination.total.toLocaleString()}
          description="Authoritative recorded operations"
          icon={Layers}
          iconColor="indigo"
        />

        <StatCard
          title="PostHog Outbox Delivered"
          value={outboxStats?.deliveredCount?.toLocaleString() ?? '—'}
          description="Synchronized analytics events"
          icon={CheckCircle2}
          iconColor="emerald"
        />

        <StatCard
          title="Outbox Pending Queue"
          value={outboxStats?.pendingCount ?? 0}
          description={
            outboxStats?.oldestPendingAgeSeconds !== null && outboxStats?.oldestPendingAgeSeconds !== undefined
              ? `Oldest: ${Math.round(outboxStats.oldestPendingAgeSeconds)}s ago`
              : 'Zero backlog'
          }
          icon={Clock}
          iconColor={outboxStats?.pendingCount ? 'amber' : 'zinc'}
          action={
            (outboxStats?.pendingCount || 0) > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => flushMutation.mutate()}
                disabled={flushMutation.isPending}
                className="h-7 px-2 text-xs gap-1 text-amber-600 hover:text-amber-700 dark:text-amber-400"
              >
                <Send className="h-3 w-3" />
                <span>Flush</span>
              </Button>
            ) : undefined
          }
        />

        <StatCard
          title="Failed Outbox Events"
          value={outboxStats?.failedCount ?? 0}
          description="Dead-lettered deliveries"
          icon={AlertTriangle}
          iconColor={outboxStats?.failedCount ? 'rose' : 'zinc'}
          action={
            (outboxStats?.failedCount || 0) > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => flushMutation.mutate()}
                disabled={flushMutation.isPending}
                className="h-7 px-2 text-xs gap-1 text-rose-600 hover:text-rose-700 dark:text-rose-400"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Retry</span>
              </Button>
            ) : undefined
          }
        />
      </div>

      {/* Filters and Search Bar */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search user, email, resource ID, action, IP..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Resource Type Filter */}
            <select
              aria-label="Filter by resource type"
              value={resourceType}
              onChange={(e) => {
                setResourceType(e.target.value)
                setPage(1)
              }}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Resource Types</option>
              <option value="category">Category</option>
              <option value="machine">Machine</option>
              <option value="section">Section</option>
              <option value="usage_record">Usage Record</option>
              <option value="inventory_product">Inventory Product</option>
              <option value="user">User Account</option>
              <option value="system">System / Backup</option>
            </select>

            {/* Outcome Filter */}
            <select
              aria-label="Filter by outcome"
              value={outcome}
              onChange={(e) => {
                setOutcome(e.target.value)
                setPage(1)
              }}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Outcomes</option>
              <option value="SUCCESS">Success Only</option>
              <option value="FAILURE">Failure Only</option>
            </select>

            {/* Source Filter */}
            <select
              aria-label="Filter by request source"
              value={source}
              onChange={(e) => {
                setSource(e.target.value)
                setPage(1)
              }}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Sources</option>
              <option value="mobile_app">Mobile App</option>
              <option value="admin_panel">Admin Panel</option>
              <option value="api">Direct API</option>
              <option value="worker">System Worker</option>
            </select>

            {(searchTerm || resourceType || outcome || source) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('')
                  setResourceType('')
                  setOutcome('')
                  setSource('')
                  setPage(1)
                }}
                className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold text-xs text-muted-foreground">Timestamp (UTC)</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Actor</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Action</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Resource</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Source</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Outcome</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">PostHog</TableHead>
                <TableHead className="text-right font-semibold text-xs text-muted-foreground">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : auditLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Activity className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm font-medium text-foreground">No audit logs found</p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {searchTerm || resourceType || outcome || source
                          ? 'No audit records match your selected filters.'
                          : 'Recorded operations will appear in this timeline.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                auditLogs.map((log) => {
                  const eventTime = log.occurred_at || log.created_at || ''
                  const actorDisplay = log.actor_email || log.admin_email || 'System'
                  const resType = log.resource_type || log.resource || 'unknown'
                  const resLabel = log.resource_label || ''

                  return (
                    <TableRow key={log.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        <FormattedDate value={eventTime} />
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-foreground">{actorDisplay}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {log.actor_role ? `role: ${log.actor_role}` : ''}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span
                          className={`font-mono text-xs font-semibold px-2 py-0.5 rounded-md border ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 font-mono text-xs text-foreground">
                            <span className="font-semibold">{resType}</span>
                            {resLabel && <span className="text-muted-foreground font-sans truncate max-w-[120px]">({resLabel})</span>}
                          </div>
                          {log.resource_id && (
                            <CopyableCode value={log.resource_id} truncateLength={8} className="text-[10px]" />
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
                          {getSourceIcon(log.source)}
                          <span>{log.source ? log.source.replace('_', ' ') : 'API'}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <StatusPill
                          variant={(log.outcome || log.result) === 'SUCCESS' ? 'success' : 'danger'}
                          label={log.outcome || log.result || 'SUCCESS'}
                          size="sm"
                        />
                      </TableCell>

                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded ${
                            log.outbox_status === 'delivered'
                              ? 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400'
                              : log.outbox_status === 'failed'
                              ? 'text-rose-600 bg-rose-500/10 dark:text-rose-400'
                              : 'text-amber-600 bg-amber-500/10 dark:text-amber-400'
                          }`}
                        >
                          {log.outbox_status === 'delivered' ? 'synced' : log.outbox_status || 'synced'}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
                        >
                          <FileCode className="h-3.5 w-3.5" />
                          <span>Inspect</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card">
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{auditLogs.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
            <span className="font-semibold text-foreground">{Math.min(page * limit, pagination.total)}</span> of{' '}
            <span className="font-semibold text-foreground">{pagination.total.toLocaleString()}</span> entries
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1 || isLoading}
              className="h-8 px-2.5 text-xs gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </Button>

            <span className="text-xs font-mono text-muted-foreground px-2">
              Page {page} of {Math.max(1, pagination.totalPages)}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
              disabled={page >= pagination.totalPages || isLoading}
              className="h-8 px-2.5 text-xs gap-1"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Forensic Inspection Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-500" />
              <DialogTitle className="text-base font-semibold">
                Audit Event: {selectedLog?.action}
              </DialogTitle>
            </div>
            <DialogDescription className="font-mono text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
              <Clock className="h-3.5 w-3.5" />
              <span>
                Occurred: {selectedLog && new Date(selectedLog.occurred_at || selectedLog.created_at || '').toUTCString()}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-border bg-muted/30 p-3.5">
              <div>
                <div className="text-[11px] text-muted-foreground font-medium">Actor Identity</div>
                <div className="text-xs font-semibold text-foreground mt-0.5 truncate">
                  {selectedLog?.actor_email || selectedLog?.admin_email || 'System'}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  role: {selectedLog?.actor_role || 'user'}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-muted-foreground font-medium">Resource Target</div>
                <div className="text-xs font-mono font-semibold text-foreground mt-0.5">
                  {selectedLog?.resource_type || selectedLog?.resource}
                </div>
                {selectedLog?.resource_label && (
                  <div className="text-[11px] text-muted-foreground font-sans truncate">
                    "{selectedLog.resource_label}"
                  </div>
                )}
              </div>

              <div>
                <div className="text-[11px] text-muted-foreground font-medium">Execution Outcome</div>
                <div className="mt-0.5">
                  <StatusPill
                    variant={(selectedLog?.outcome || selectedLog?.result) === 'SUCCESS' ? 'success' : 'danger'}
                    label={selectedLog?.outcome || selectedLog?.result || 'SUCCESS'}
                    size="sm"
                  />
                </div>
              </div>

              <div>
                <div className="text-[11px] text-muted-foreground font-medium">Origin Source</div>
                <div className="text-xs font-mono text-foreground mt-0.5 capitalize">
                  {selectedLog?.source || 'API'}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-muted-foreground font-medium">Client IP Address</div>
                <div className="text-xs font-mono text-foreground mt-0.5">
                  {selectedLog?.ip_address || '127.0.0.1'}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-muted-foreground font-medium">PostHog Status</div>
                <div className="text-xs font-mono text-foreground mt-0.5 capitalize text-emerald-600 dark:text-emerald-400">
                  {selectedLog?.outbox_status || 'delivered'}
                </div>
              </div>
            </div>

            {/* Changed Fields Tags */}
            {selectedLog?.changed_fields && selectedLog.changed_fields.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-foreground">Modified Fields:</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedLog.changed_fields.map((field) => (
                    <span
                      key={field}
                      className="font-mono text-[11px] bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25 px-2 py-0.5 rounded-md"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Before vs After Visual Diff */}
            {(selectedLog?.before_data || selectedLog?.after_data) && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Before & After State Diff:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-rose-500/5 p-3">
                    <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mb-1.5">
                      Before State
                    </div>
                    <pre className="overflow-x-auto text-[10px] font-mono text-foreground/90 max-h-48">
                      {selectedLog.before_data
                        ? JSON.stringify(selectedLog.before_data, null, 2)
                        : '(null — new record created)'}
                    </pre>
                  </div>

                  <div className="rounded-lg border border-border bg-emerald-500/5 p-3">
                    <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5">
                      After State
                    </div>
                    <pre className="overflow-x-auto text-[10px] font-mono text-foreground/90 max-h-48">
                      {selectedLog.after_data
                        ? JSON.stringify(selectedLog.after_data, null, 2)
                        : '(null — record deleted)'}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Event Metadata / Reason */}
            {selectedLog?.reason && (
              <div className="space-y-1">
                <div className="text-xs font-semibold text-foreground">Audit Reason:</div>
                <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-xs text-foreground">
                  {selectedLog.reason}
                </div>
              </div>
            )}

            {/* Raw JSON Details / Metadata */}
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-foreground">Complete Technical Payload:</div>
              <pre className="overflow-x-auto rounded-xl border border-border bg-muted/50 p-3.5 text-[11px] font-mono text-foreground/90 max-h-48">
                {JSON.stringify(
                  {
                    id: selectedLog?.id,
                    request_id: selectedLog?.request_id,
                    correlation_id: selectedLog?.correlation_id,
                    metadata: selectedLog?.metadata || selectedLog?.details,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
