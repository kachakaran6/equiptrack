import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { systemApi } from '@/lib/api/systemApi'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  Cpu,
  Layers,
  FileSpreadsheet,
  AlertOctagon,
  RefreshCw,
  HardDriveDownload,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  Database,
} from 'lucide-react'

export const DashboardPage: React.FC = () => {
  const { data: metrics, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['overviewMetrics'],
    queryFn: () => systemApi.getOverviewMetrics(),
    refetchInterval: 30000,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
            System Overview
          </h1>
          <p className="text-xs text-zinc-400">
            Real-time operational status and core entity counts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 gap-1.5 border-zinc-800 bg-zinc-900/60 text-xs text-zinc-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isError && (
        <div className="rounded-md border border-red-900/60 bg-red-950/20 p-4 text-xs text-red-300">
          Failed to load operational metrics from backend. Please verify that the API server is reachable.
        </div>
      )}

      {/* Core Entity Counts */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-zinc-800/80 bg-zinc-950/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase">
              Users
            </CardTitle>
            <Users className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold font-mono tracking-tight text-zinc-100">
                  {metrics?.users_count ?? 0}
                </div>
                <Link
                  to="/users"
                  className="flex items-center text-[11px] font-mono text-zinc-400 hover:text-zinc-200"
                >
                  Manage <ArrowUpRight className="h-3 w-3 ml-0.5" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-800/80 bg-zinc-950/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase">
              Machines
            </CardTitle>
            <Cpu className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold font-mono tracking-tight text-zinc-100">
                  {metrics?.machines_count ?? 0}
                </div>
                <Link
                  to="/machines"
                  className="flex items-center text-[11px] font-mono text-zinc-400 hover:text-zinc-200"
                >
                  Manage <ArrowUpRight className="h-3 w-3 ml-0.5" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-800/80 bg-zinc-950/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase">
              Sections
            </CardTitle>
            <Layers className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold font-mono tracking-tight text-zinc-100">
                  {metrics?.sections_count ?? 0}
                </div>
                <Link
                  to="/sections"
                  className="flex items-center text-[11px] font-mono text-zinc-400 hover:text-zinc-200"
                >
                  Manage <ArrowUpRight className="h-3 w-3 ml-0.5" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-800/80 bg-zinc-950/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase">
              Usage Records
            </CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold font-mono tracking-tight text-zinc-100">
                  {metrics?.usage_records_count ?? 0}
                </div>
                <Link
                  to="/usage-records"
                  className="flex items-center text-[11px] font-mono text-zinc-400 hover:text-zinc-200"
                >
                  Manage <ArrowUpRight className="h-3 w-3 ml-0.5" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Operational Status Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {/* Database Status */}
        <Card className="border-zinc-800/80 bg-zinc-950/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase flex items-center justify-between">
              <span>Database Engine</span>
              <Database className="h-4 w-4 text-zinc-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  {metrics?.db_status === 'connected' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm font-semibold text-zinc-200">Connected</span>
                      <Badge variant="success" className="ml-auto">PostgreSQL</Badge>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-400" />
                      <span className="text-sm font-semibold text-zinc-200">Disconnected</span>
                      <Badge variant="destructive" className="ml-auto">Offline</Badge>
                    </>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-zinc-500">
                  <span>Latency & Diagnostics</span>
                  <Link to="/system" className="text-zinc-400 hover:underline">View System &rarr;</Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Backup Status */}
        <Card className="border-zinc-800/80 bg-zinc-950/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase flex items-center justify-between">
              <span>Backup Subsystem</span>
              <HardDriveDownload className="h-4 w-4 text-zinc-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Last Execution:</span>
                  <Badge variant={metrics?.last_backup?.status === 'COMPLETED' ? 'success' : 'secondary'}>
                    {metrics?.last_backup?.status || 'None'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-zinc-500">
                  <span className="truncate">
                    {metrics?.last_backup?.time ? new Date(metrics.last_backup.time).toLocaleString() : 'No backup recorded'}
                  </span>
                  <Link to="/backups" className="text-zinc-400 hover:underline ml-2">Backups &rarr;</Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Error Watch */}
        <Card className="border-zinc-800/80 bg-zinc-950/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase flex items-center justify-between">
              <span>Error Watch</span>
              <AlertOctagon className="h-4 w-4 text-zinc-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Recent Server Errors:</span>
                  <Badge variant={metrics && metrics.recent_errors_count > 0 ? 'destructive' : 'secondary'}>
                    {metrics?.recent_errors_count ?? 0} errors
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-zinc-500">
                  <span>Stack traces & logs</span>
                  <Link to="/errors" className="text-zinc-400 hover:underline">Inspect Errors &rarr;</Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Admin Activities */}
      <Card className="border-zinc-800/80 bg-zinc-950/60">
        <CardHeader className="pb-3 border-b border-zinc-800/80">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm text-zinc-200">Recent Admin Activity Trail</CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Latest security events, administrative updates, and backup executions
              </CardDescription>
            </div>
            <Link to="/audit-logs">
              <Button variant="outline" size="sm" className="h-7 text-xs border-zinc-800 bg-zinc-900/50">
                Full Audit Trail
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : !metrics?.recent_activities || metrics.recent_activities.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              No recent audit records found.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {metrics.recent_activities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-center justify-between px-4 py-2.5 text-xs hover:bg-zinc-900/40"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {act.action}
                    </Badge>
                    <span className="text-zinc-300 font-medium">{act.resource}</span>
                    <span className="font-mono text-[11px] text-zinc-500">
                      by {act.admin_email || 'System'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-500">
                    <Badge variant={act.result === 'SUCCESS' ? 'success' : 'destructive'}>
                      {act.result}
                    </Badge>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(act.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
