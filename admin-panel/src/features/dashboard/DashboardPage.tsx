import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { systemApi } from '@/lib/api/systemApi'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { StatusPill } from '@/components/ui/status-pill'
import { FormattedDate } from '@/components/ui/formatted-date'
import {
  Users,
  Cpu,
  Layers,
  FileSpreadsheet,
  AlertOctagon,
  RefreshCw,
  HardDriveDownload,
  Database,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'

export const DashboardPage: React.FC = () => {
  const { data: metrics, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['overviewMetrics'],
    queryFn: () => systemApi.getOverviewMetrics(),
    refetchInterval: 30000,
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            System Overview
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8.5 gap-2 px-3 text-xs border-border/80 bg-card hover:bg-muted/70 shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
            <span>Refresh Data</span>
          </Button>
        </div>
      </div>

      {isError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-3">
          <AlertOctagon className="h-5 w-5 shrink-0 text-rose-500" />
          <span>Failed to load operational metrics from backend. Please verify that the API server is online.</span>
        </div>
      )}

      {/* Core Entity Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-4 w-20 mb-3" />
              <Skeleton className="h-8 w-16 mb-4" />
              <Skeleton className="h-3 w-28" />
            </Card>
          ))
        ) : (
          <>
            <StatCard
              title="Registered Users"
              value={metrics?.users_count ?? 0}
              description="System operators and managers"
              icon={Users}
              iconColor="indigo"
              action={
                <Link
                  to="/users"
                  className="flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  <span>Manage users</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              }
            />

            <StatCard
              title="Machinery Fleet"
              value={metrics?.machines_count ?? 0}
              description="Active registered machines"
              icon={Cpu}
              iconColor="emerald"
              action={
                <Link
                  to="/machines"
                  className="flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-emerald-500 transition-colors"
                >
                  <span>View catalog</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              }
            />

            <StatCard
              title="Components & Sections"
              value={metrics?.sections_count ?? 0}
              description="Monitored machine assemblies"
              icon={Layers}
              iconColor="sky"
              action={
                <Link
                  to="/sections"
                  className="flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-sky-500 transition-colors"
                >
                  <span>Inspect components</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              }
            />

            <StatCard
              title="Usage Records"
              value={metrics?.usage_records_count ?? 0}
              description="Logged operational hour entries"
              icon={FileSpreadsheet}
              iconColor="purple"
              action={
                <Link
                  to="/usage-records"
                  className="flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-purple-500 transition-colors"
                >
                  <span>View log history</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              }
            />
          </>
        )}
      </div>

      {/* Operational Subsystems */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Database Engine Status */}
        <Card className="border-border/70 bg-card hover:border-border transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Database Engine
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">PostgreSQL</span>
                  <StatusPill
                    variant={metrics?.db_status === 'connected' ? 'connected' : 'disconnected'}
                    pulse={metrics?.db_status === 'connected'}
                    label={metrics?.db_status === 'connected' ? 'Connected' : 'Disconnected'}
                  />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted-foreground">
                  <span>Connection pool & latency</span>
                  <Link to="/system" className="font-medium text-primary hover:underline flex items-center gap-1">
                    Diagnostics <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Backup Subsystem */}
        <Card className="border-border/70 bg-card hover:border-border transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Backup Subsystem
            </CardTitle>
            <HardDriveDownload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Last Snapshot</span>
                  <StatusPill
                    variant={metrics?.last_backup?.status?.toLowerCase() === 'completed' || metrics?.last_backup?.status?.toLowerCase() === 'success' ? 'success' : 'neutral'}
                    label={metrics?.last_backup?.status || 'None'}
                  />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted-foreground">
                  <span className="truncate">
                    {metrics?.last_backup?.time ? (
                      <FormattedDate value={metrics.last_backup.time} format="full" />
                    ) : (
                      'No backup recorded'
                    )}
                  </span>
                  <Link to="/backups" className="font-medium text-primary hover:underline shrink-0 ml-2 flex items-center gap-1">
                    Backups <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Error Watch */}
        <Card className="border-border/70 bg-card hover:border-border transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Error Observability
            </CardTitle>
            <AlertOctagon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Server Exceptions</span>
                  <StatusPill
                    variant={(metrics?.recent_errors_count ?? 0) > 0 ? 'danger' : 'success'}
                    label={`${metrics?.recent_errors_count ?? 0} errors`}
                  />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted-foreground">
                  <span>Stack traces & telemetry</span>
                  <Link to="/errors" className="font-medium text-primary hover:underline flex items-center gap-1">
                    Inspect Logs <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Admin Activity Trail */}
      <Card className="border-border/70 bg-card shadow-xs">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Recent Admin Activity Trail</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Audited security events, entity mutations, and scheduled operations
              </CardDescription>
            </div>
            <Link to="/audit-logs">
              <Button variant="outline" size="sm" className="h-8 text-xs border-border/80 gap-1.5">
                <span>View Full Trail</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !metrics?.recent_activities || metrics.recent_activities.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No recent audit activity records found.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {metrics.recent_activities.map((act) => (
                <div
                  key={act.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3 text-xs hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusPill variant="neutral" size="sm" label={act.action} dot={false} />
                    <span className="font-semibold text-foreground truncate">{act.resource}</span>
                    <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                      by <span className="font-medium text-foreground">{act.admin_email || 'System'}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusPill
                      variant={act.result?.toUpperCase() === 'SUCCESS' ? 'success' : 'danger'}
                      size="sm"
                      label={act.result}
                    />
                    <FormattedDate value={act.created_at} format="time-only" className="text-xs text-muted-foreground" />
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
