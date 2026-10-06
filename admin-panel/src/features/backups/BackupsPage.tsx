import type { FC } from 'react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { backupApi, type TriggerBackupInput } from '@/lib/api/backupApi'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusPill } from '@/components/ui/status-pill'
import { FormattedDate } from '@/components/ui/formatted-date'
import {
  HardDriveDownload,
  Send,
  CalendarClock,
  History,
  Play,
  RefreshCw,
  CheckCircle,
  Database,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'

export const BackupsPage: FC = () => {
  const queryClient = useQueryClient()
  const [isRunOpen, setIsRunOpen] = useState(false)
  const [runParams, setRunParams] = useState<TriggerBackupInput>({
    format: 'SQL',
    compression: 'GZIP',
    send_to_telegram: true,
  })
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['backupConfig'],
    queryFn: () => backupApi.getConfig(),
  })

  const { data: history = [], isLoading: historyLoading, refetch, isFetching } = useQuery({
    queryKey: ['backupHistory'],
    queryFn: () => backupApi.getHistory(),
  })

  const triggerMutation = useMutation({
    mutationFn: (input: TriggerBackupInput) => backupApi.triggerBackup(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['backupHistory'] })
      queryClient.invalidateQueries({ queryKey: ['overviewMetrics'] })
      setIsRunOpen(false)
      setSuccessMsg(`Backup generated successfully! (Destination: ${data.backup?.destination || 'Local storage'})`)
      setTimeout(() => setSuccessMsg(null), 6000)
    },
    onError: (err: Error) => setErrorMsg(err.message),
  })

  const lastBackup = history[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span>Backup &amp; Disaster Recovery</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Database snapshots, scheduled automated exports, and Telegram cloud delivery
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 gap-2 shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setErrorMsg(null)
              setIsRunOpen(true)
            }}
            className="h-9 gap-2 shadow-xs"
          >
            <Play className="h-4 w-4" />
            <span>Run Backup Now</span>
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Last Snapshot Status */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Last Snapshot Status
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <HardDriveDownload className="h-3.5 w-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {historyLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : lastBackup ? (
              <>
                <div className="flex items-center justify-between">
                  <StatusPill
                    variant={lastBackup.status === 'COMPLETED' ? 'success' : 'danger'}
                    label={lastBackup.status}
                    size="sm"
                  />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    Format: <strong className="text-foreground">{lastBackup.format}</strong>
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground pt-1 flex items-center justify-between">
                  <span>Executed:</span>
                  <FormattedDate value={lastBackup.started_at} />
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  Target: {lastBackup.destination}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground py-2 text-xs">No backups recorded yet.</div>
            )}
          </CardContent>
        </Card>

        {/* Telegram Cloud Sync */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Telegram Delivery
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Send className="h-3.5 w-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {configLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Bot Integration:</span>
                  <StatusPill
                    variant={config?.telegram_configured ? 'success' : 'neutral'}
                    label={config?.telegram_configured ? 'Active' : 'Unconfigured'}
                    size="sm"
                  />
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  Target Chat: {config?.telegram_chat_id_masked || 'None'}
                </div>
                <div className="pt-1">
                  <Link to="/backups/telegram" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium">
                    <span>Manage Telegram credentials</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Automated Schedule */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Scheduled Cron
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <CalendarClock className="h-3.5 w-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {configLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Auto Backups:</span>
                  <StatusPill
                    variant={config?.enabled ? 'success' : 'neutral'}
                    label={config?.enabled ? 'Enabled' : 'Disabled'}
                    size="sm"
                  />
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  Cron: {config?.cron_expression || '0 2 * * *'} ({config?.timezone || 'UTC'})
                </div>
                <div className="pt-1">
                  <Link to="/backups/schedule" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium">
                    <span>Configure Schedule &amp; Retention</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Navigation Quick Links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link to="/backups/telegram" className="group block">
          <Card className="h-full border-border bg-card p-4 transition-all duration-150 hover:border-indigo-500/50 hover:shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-indigo-500/10 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  <Send className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Telegram Configuration
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground pl-10.5">
              Bot token &amp; direct chat broadcast channel
            </p>
          </Card>
        </Link>

        <Link to="/backups/schedule" className="group block">
          <Card className="h-full border-border bg-card p-4 transition-all duration-150 hover:border-indigo-500/50 hover:shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-indigo-500/10 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  <CalendarClock className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Cron &amp; Schedule Policy
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground pl-10.5">
              Set automated interval, compression, and retention
            </p>
          </Card>
        </Link>

        <Link to="/backups/history" className="group block">
          <Card className="h-full border-border bg-card p-4 transition-all duration-150 hover:border-indigo-500/50 hover:shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-indigo-500/10 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  <History className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Backup Execution History
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground pl-10.5">
              Audit all previous dumps, sizes, and destinations
            </p>
          </Card>
        </Link>
      </div>

      {/* On-Demand Trigger Dialog */}
      <Dialog open={isRunOpen} onOpenChange={setIsRunOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-500" />
              <DialogTitle className="text-base font-semibold">
                Trigger On-Demand Backup
              </DialogTitle>
            </div>
            <DialogDescription>
              Execute an immediate PostgreSQL database snapshot using the backend backup subsystem.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Export Format</Label>
              <Select
                value={runParams.format}
                onValueChange={(val: 'SQL' | 'JSON' | 'CSV' | 'ZIP') =>
                  setRunParams({ ...runParams, format: val })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SQL">PostgreSQL SQL Dump (.sql)</SelectItem>
                  <SelectItem value="JSON">Structured JSON Dataset (.json)</SelectItem>
                  <SelectItem value="CSV">Comma-Separated Values (.csv)</SelectItem>
                  <SelectItem value="ZIP">Compressed Archive (.zip)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Compression Algorithm</Label>
              <Select
                value={runParams.compression}
                onValueChange={(val: 'GZIP' | 'NONE') =>
                  setRunParams({ ...runParams, compression: val })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GZIP">GZIP Compression (.gz)</SelectItem>
                  <SelectItem value="NONE">Uncompressed Raw File</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3.5">
              <div className="space-y-0.5">
                <div className="font-semibold text-foreground text-xs">Send to Telegram</div>
                <div className="text-[11px] text-muted-foreground">
                  Broadcast snapshot artifact to the configured Telegram channel
                </div>
              </div>
              <Switch
                checked={runParams.send_to_telegram}
                onCheckedChange={(checked) =>
                  setRunParams({ ...runParams, send_to_telegram: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRunOpen(false)}
              disabled={triggerMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              disabled={triggerMutation.isPending}
              onClick={() => triggerMutation.mutate(runParams)}
            >
              {triggerMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Generating Snapshot...</span>
                </span>
              ) : (
                'Run Backup'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
