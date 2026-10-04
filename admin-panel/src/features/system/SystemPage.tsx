import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { systemApi } from '@/lib/api/systemApi'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Activity,
  Database,
  Server,
  Cpu,
  Clock,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Zap,
} from 'lucide-react'

export const SystemPage: React.FC = () => {
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
            <Activity className="h-5 w-5 text-zinc-400" />
            System &amp; Database Diagnostics
          </h1>
          <p className="text-xs text-zinc-400">
            Real-time server telemetry, process memory heap, and PostgreSQL engine health
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isBusy}
            className="h-8 gap-1.5 border-zinc-800 bg-zinc-900/60 text-xs text-zinc-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isBusy ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </Button>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-950/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase flex items-center justify-between">
              <span>Node.js Process</span>
              <Server className="h-4 w-4 text-zinc-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sysLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="font-bold text-zinc-100 text-sm">ONLINE</span>
                  <Badge variant="outline" className="ml-auto font-mono text-[10px]">
                    {sysHealth?.node_version || 'v20.x'}
                  </Badge>
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  Uptime: {formatUptime(sysHealth?.uptime_seconds)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-950/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase flex items-center justify-between">
              <span>Database Status</span>
              <Database className="h-4 w-4 text-zinc-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dbLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {dbHealth?.status === 'connected' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span className="font-bold text-zinc-100 text-sm">CONNECTED</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-400" />
                      <span className="font-bold text-zinc-100 text-sm">DISCONNECTED</span>
                    </>
                  )}
                  <Badge variant={dbHealth?.status === 'connected' ? 'success' : 'destructive'} className="ml-auto text-[10px]">
                    PG
                  </Badge>
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  DB: {dbHealth?.database_name || 'postgres'}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-950/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase flex items-center justify-between">
              <span>Query Latency</span>
              <Zap className="h-4 w-4 text-zinc-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dbLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="space-y-1">
                <div className="text-2xl font-bold font-mono text-zinc-100">
                  {dbHealth?.latency_ms ?? 0} ms
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  Roundtrip ping time
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-950/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase flex items-center justify-between">
              <span>Memory Heap</span>
              <Cpu className="h-4 w-4 text-zinc-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sysLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="space-y-1">
                <div className="text-2xl font-bold font-mono text-zinc-100">
                  {sysHealth?.memory_usage?.heap_used_mb ?? 0} MB
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  RSS: {sysHealth?.memory_usage?.rss_mb ?? 0} MB
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diagnostics Detail Grids */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Node.js Runtime Details */}
        <Card className="border-zinc-800 bg-zinc-950/60">
          <CardHeader className="pb-3 border-b border-zinc-800">
            <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase">
              Application Runtime Telemetry
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 font-mono text-xs">
            {sysLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Environment:</span>
                  <Badge variant="outline" className="text-[10px]">
                    {sysHealth?.environment || 'production'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Node Engine Version:</span>
                  <span className="text-zinc-200">{sysHealth?.node_version}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Heap Total Allocated:</span>
                  <span className="text-zinc-200">{sysHealth?.memory_usage?.heap_total_mb} MB</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Heap Active Used:</span>
                  <span className="text-zinc-200">{sysHealth?.memory_usage?.heap_used_mb} MB</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Resident Set Size (RSS):</span>
                  <span className="text-zinc-200">{sysHealth?.memory_usage?.rss_mb} MB</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Server Time:</span>
                  <span className="text-zinc-400 text-[11px]">
                    {sysHealth?.timestamp ? new Date(sysHealth.timestamp).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* PostgreSQL Database Engine Details */}
        <Card className="border-zinc-800 bg-zinc-950/60">
          <CardHeader className="pb-3 border-b border-zinc-800">
            <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase">
              PostgreSQL Engine Specifications
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 font-mono text-xs">
            {dbLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Database Engine:</span>
                  <span className="text-zinc-200">{dbHealth?.pg_version || 'PostgreSQL 16'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Database Disk Footprint:</span>
                  <span className="text-zinc-200">{dbHealth?.database_size || '12 MB'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Managed Table Count:</span>
                  <span className="text-zinc-200">{dbHealth?.tables_count ?? 8} tables</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Approx Total Records:</span>
                  <span className="text-zinc-200">{dbHealth?.total_records_approx?.toLocaleString() ?? 0}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Connection Latency:</span>
                  <span className="text-emerald-400 font-bold">{dbHealth?.latency_ms ?? 0} ms</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Direct SQL Protocol:</span>
                  <Badge variant="secondary" className="text-[10px]">Restricted to Backend Pool</Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
