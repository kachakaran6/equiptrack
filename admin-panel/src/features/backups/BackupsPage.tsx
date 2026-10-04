import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { backupApi, type TriggerBackupInput } from '@/lib/api/backupApi'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import {
  HardDriveDownload,
  Send,
  CalendarClock,
  History,
  Play,
  RefreshCw,
  CheckCircle,
  Clock,
  Database,
  ArrowRight,
} from 'lucide-react'

export const BackupsPage: React.FC = () => {
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
            <HardDriveDownload className="h-5 w-5 text-zinc-400" />
            Backup &amp; Disaster Recovery
          </h1>
          <p className="text-xs text-zinc-400">
            Database snapshots, scheduled automated exports, and Telegram cloud delivery
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

          <Button
            size="sm"
            onClick={() => {
              setErrorMsg(null)
              setIsRunOpen(true)
            }}
            className="h-8 gap-1.5 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 text-xs font-medium"
          >
            <Play className="h-3.5 w-3.5" />
            Run Backup Now
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded border border-emerald-900/60 bg-emerald-950/30 p-3 text-xs text-emerald-300 font-mono">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Last Snapshot Status */}
        <Card className="border-zinc-800 bg-zinc-950/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase">
              Last Snapshot Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 font-mono text-xs">
            {historyLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : lastBackup ? (
              <>
                <div className="flex items-center justify-between">
                  <Badge variant={lastBackup.status === 'COMPLETED' ? 'success' : 'destructive'}>
                    {lastBackup.status}
                  </Badge>
                  <span className="text-[11px] text-zinc-400">
                    Format: <strong className="text-zinc-200">{lastBackup.format}</strong>
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 pt-1">
                  Time: {new Date(lastBackup.started_at).toLocaleString()}
                </div>
                <div className="text-[11px] text-zinc-500 truncate">
                  Target: {lastBackup.destination}
                </div>
              </>
            ) : (
              <div className="text-zinc-500 py-2">No backups recorded yet.</div>
            )}
          </CardContent>
        </Card>

        {/* Telegram Cloud Sync */}
        <Card className="border-zinc-800 bg-zinc-950/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase flex items-center justify-between">
              <span>Telegram Delivery</span>
              <Send className="h-3.5 w-3.5 text-zinc-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {configLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Bot Integration:</span>
                  <Badge variant={config?.telegram_configured ? 'success' : 'secondary'}>
                    {config?.telegram_configured ? 'Active' : 'Unconfigured'}
                  </Badge>
                </div>
                <div className="font-mono text-[11px] text-zinc-500">
                  Target Chat: {config?.telegram_chat_id_masked || 'None'}
                </div>
                <div className="pt-1">
                  <Link to="/backups/telegram" className="text-[11px] text-zinc-300 hover:underline flex items-center gap-1">
                    Manage Telegram credentials <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Automated Schedule */}
        <Card className="border-zinc-800 bg-zinc-950/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase flex items-center justify-between">
              <span>Scheduled Cron</span>
              <CalendarClock className="h-3.5 w-3.5 text-zinc-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {configLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Auto Backups:</span>
                  <Badge variant={config?.enabled ? 'success' : 'secondary'}>
                    {config?.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="font-mono text-[11px] text-zinc-500">
                  Cron: {config?.cron_expression || '0 2 * * *'} ({config?.timezone || 'UTC'})
                </div>
                <div className="pt-1">
                  <Link to="/backups/schedule" className="text-[11px] text-zinc-300 hover:underline flex items-center gap-1">
                    Configure Schedule &amp; Retention <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Navigation Quick Links */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link to="/backups/telegram" className="group">
          <Card className="border-zinc-800 bg-zinc-950/40 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Send className="h-4 w-4 text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-200 group-hover:text-zinc-100">
                  Telegram Configuration
                </span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-300" />
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              Bot token &amp; direct chat broadcast channel
            </p>
          </Card>
        </Link>

        <Link to="/backups/schedule" className="group">
          <Card className="border-zinc-800 bg-zinc-950/40 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CalendarClock className="h-4 w-4 text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-200 group-hover:text-zinc-100">
                  Cron &amp; Schedule Policy
                </span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-300" />
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              Set automated interval, compression, and retention
            </p>
          </Card>
        </Link>

        <Link to="/backups/history" className="group">
          <Card className="border-zinc-800 bg-zinc-950/40 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <History className="h-4 w-4 text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-200 group-hover:text-zinc-100">
                  Backup Execution History
                </span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-300" />
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              Audit all previous dumps, sizes, and destinations
            </p>
          </Card>
        </Link>
      </div>

      {/* On-Demand Trigger Dialog */}
      <Dialog open={isRunOpen} onOpenChange={setIsRunOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-4 w-4 text-zinc-300" />
              Trigger On-Demand Backup
            </DialogTitle>
            <DialogDescription>
              Execute an immediate PostgreSQL database snapshot using the backend backup subsystem.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="rounded border border-red-900/60 bg-red-950/30 p-2.5 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label>Export Format</Label>
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
              <Label>Compression Algorithm</Label>
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

            <div className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="space-y-0.5">
                <div className="font-semibold text-zinc-200">Send to Telegram</div>
                <div className="text-[11px] text-zinc-400">
                  Broadcast snapshot artifact to the configured Telegram chat
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
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
                  Generating Snapshot...
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
