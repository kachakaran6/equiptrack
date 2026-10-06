import type { FC } from 'react'
import { useQuery } from '@tanstack/react-query'
import { systemApi } from '@/lib/api/systemApi'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusPill } from '@/components/ui/status-pill'
import { FormattedDate } from '@/components/ui/formatted-date'
import {
  Activity,
  Database,
  Server,
  Cpu,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Zap,
  Clock,
  Layers,
} from 'lucide-react'

export const SystemPage: FC = () => {
  const {
    data: sysHealth,
    isLoading: sysLoading,
    refetch: refetchSys,
    isFetching: sysFetching,
  } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: () => systemApi.getSystemHealth(),
    refetchInterval: 30000,
  })

  const {
    data: dbHealth,
    isLoading: dbLoading,
    refetch: refetchDb,
    isFetching: dbFetching,
  } = useQuery({
    queryKey: ['databaseHealth'],
    queryFn: () => systemApi.getDatabaseHealth(),
    refetchInterval: 30000,
  })

  const handleRefreshAll = () => {
    refetchSys()
    refetchDb()
  }

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '0s'
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return `${days > 0 ? `${days}d ` : ''}${hours > 0 ? `${hours}h ` : ''}${minutes}m ${secs}s`
  }

  const isBusy = sysFetching || dbFetching

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span>System &amp; Database Diagnostics</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time server telemetry, process memory heap, and PostgreSQL engine health
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isBusy}
            className="h-9 gap-2 shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isBusy ? 'animate-spin' : ''}`} />
            <span>Refresh Telemetry</span>
          </Button>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Node.js Process
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Server className="h-3.5 w-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {sysLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <StatusPill variant="success" label="ONLINE" pulse size="sm" />
                  <span className="font-mono text-xs font-semibold text-muted-foreground">
                    {sysHealth?.node_version || 'v20.x'}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  Uptime: {formatUptime(sysHealth?.uptime_seconds)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Database Status
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Database className="h-3.5 w-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dbLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <StatusPill
                    variant={dbHealth?.status === 'connected' ? 'connected' : 'disconnected'}
                    label={dbHealth?.status === 'connected' ? 'CONNECTED' : 'DISCONNECTED'}
                    pulse={dbHealth?.status === 'connected'}
                    size="sm"
                  />
                  <span className="font-mono text-xs font-semibold text-muted-foreground">
                    PostgreSQL
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  Database: {dbHealth?.database_name || 'postgres'}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Query Latency
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Zap className="h-3.5 w-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dbLoading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <div className="space-y-1">
                <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                  {dbHealth?.latency_ms ?? 0} <span className="text-xs font-sans font-normal text-muted-foreground">ms</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Roundtrip database ping latency
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Memory Heap
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Cpu className="h-3.5 w-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {sysLoading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <div className="space-y-1">
                <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                  {sysHealth?.memory_usage?.heap_used_mb ?? 0} <span className="text-xs font-sans font-normal text-muted-foreground">MB</span>
                </div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  RSS: {sysHealth?.memory_usage?.rss_mb ?? 0} MB
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diagnostics Detail Grids */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Node.js Runtime Details */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-3 border-b border-border/80">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Application Runtime Telemetry
              </CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-3.5 font-mono text-xs">
            {sysLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between font-sans">
                  <span className="text-muted-foreground">Environment:</span>
                  <span className="font-mono text-xs font-semibold uppercase px-2 py-0.5 rounded bg-muted border border-border text-foreground">
                    {sysHealth?.environment || 'production'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans">Node Engine Version:</span>
                  <span className="text-foreground font-medium">{sysHealth?.node_version}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans">Heap Total Allocated:</span>
                  <span className="text-foreground font-medium tabular-nums">{sysHealth?.memory_usage?.heap_total_mb} MB</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans">Heap Active Used:</span>
                  <span className="text-foreground font-medium tabular-nums">{sysHealth?.memory_usage?.heap_used_mb} MB</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans">Resident Set Size (RSS):</span>
                  <span className="text-foreground font-medium tabular-nums">{sysHealth?.memory_usage?.rss_mb} MB</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans">Server Time:</span>
                  <span className="text-muted-foreground text-[11px]">
                    <FormattedDate value={sysHealth?.timestamp} />
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* PostgreSQL Database Engine Details */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-3 border-b border-border/80">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                PostgreSQL Engine Specifications
              </CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-3.5 font-mono text-xs">
            {dbLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans">Database Engine:</span>
                  <span className="text-foreground font-medium">{dbHealth?.pg_version || 'PostgreSQL 16'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans">Database Disk Footprint:</span>
                  <span className="text-foreground font-medium">{dbHealth?.database_size || '12 MB'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans">Managed Table Count:</span>
                  <span className="text-foreground font-medium">{dbHealth?.tables_count ?? 8} tables</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans">Approx Total Records:</span>
                  <span className="text-foreground font-medium tabular-nums">{dbHealth?.total_records_approx?.toLocaleString() ?? 0}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans">Connection Latency:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">{dbHealth?.latency_ms ?? 0} ms</span>
                </div>

                <div className="flex items-center justify-between font-sans">
                  <span className="text-muted-foreground">Direct SQL Protocol:</span>
                  <StatusPill variant="neutral" label="Restricted to Backend Pool" size="sm" />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
