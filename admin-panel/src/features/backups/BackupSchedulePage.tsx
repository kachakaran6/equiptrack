import type { FC, FormEvent } from 'react'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { backupApi, type UpdateBackupConfigInput } from '@/lib/api/backupApi'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CalendarClock,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  Save,
} from 'lucide-react'

export const BackupSchedulePage: FC = () => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<UpdateBackupConfigInput>({
    enabled: false,
    cron_expression: '0 2 * * *',
    timezone: 'Asia/Kolkata',
    format: 'SQL',
    compression: 'GZIP',
    retention_days: 30,
  })
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data: config, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['backupConfig'],
    queryFn: () => backupApi.getConfig(),
  })

  useEffect(() => {
    if (config) {
      setFormData({
        enabled: config.enabled,
        cron_expression: config.cron_expression || '0 2 * * *',
        timezone: config.timezone || 'Asia/Kolkata',
        format: config.format || 'SQL',
        compression: config.compression || 'GZIP',
        retention_days: config.retention_days || 30,
      })
    }
  }, [config])

  const updateMutation = useMutation({
    mutationFn: (input: UpdateBackupConfigInput) => backupApi.updateConfig(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backupConfig'] })
      setSuccessMsg('Backup schedule and retention policies successfully updated.')
      setTimeout(() => setSuccessMsg(null), 4000)
    },
    onError: (err: Error) => setErrorMsg(err.message),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    // Validate 5-part cron syntax
    const cronParts = (formData.cron_expression || '').trim().split(/\s+/)
    if (cronParts.length !== 5) {
      setErrorMsg('Invalid cron expression. Expected 5 fields (e.g. 0 2 * * *).')
      return
    }

    updateMutation.mutate(formData)
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link to="/backups">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-8 px-2">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Backups</span>
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span>Automated Backup Schedule &amp; Retention</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure background database snapshot routines, format presets, and retention cycles
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
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
          {errorMsg}
        </div>
      )}

      {isLoading ? (
        <Card className="border-border bg-card">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/80">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Schedule &amp; Format Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5 text-xs">
              {/* Enabled Switch */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
                <div className="space-y-0.5">
                  <div className="font-semibold text-foreground text-sm">Scheduled Automatic Backups</div>
                  <div className="text-xs text-muted-foreground">
                    When enabled, the backend server triggers automated snapshots at the specified cron interval
                  </div>
                </div>
                <Switch
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                />
              </div>

              {/* Cron expression */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cron-exp" className="text-xs font-medium">
                    Cron Expression * (e.g. 0 2 * * *)
                  </Label>
                  <Input
                    id="cron-exp"
                    value={formData.cron_expression || ''}
                    onChange={(e) => setFormData({ ...formData, cron_expression: e.target.value })}
                    className="font-mono text-xs h-9"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Default: <code className="text-foreground">0 2 * * *</code> (Runs every day at 02:00 AM)
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="timezone" className="text-xs font-medium">
                    Timezone
                  </Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(val) => setFormData({ ...formData, timezone: val })}
                  >
                    <SelectTrigger className="w-full h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST +05:30)</SelectItem>
                      <SelectItem value="UTC">UTC (+00:00)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST/EDT)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT/BST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Format & Compression */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Snapshot Format</Label>
                  <Select
                    value={formData.format}
                    onValueChange={(val: 'SQL' | 'JSON' | 'CSV' | 'ZIP') =>
                      setFormData({ ...formData, format: val })
                    }
                  >
                    <SelectTrigger className="w-full h-9 text-xs">
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
                    value={formData.compression}
                    onValueChange={(val: 'GZIP' | 'NONE') =>
                      setFormData({ ...formData, compression: val })
                    }
                  >
                    <SelectTrigger className="w-full h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GZIP">GZIP (.gz)</SelectItem>
                      <SelectItem value="NONE">Uncompressed Raw</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Retention */}
              <div className="space-y-1.5">
                <Label htmlFor="retention" className="text-xs font-medium">
                  Retention Window (Days)
                </Label>
                <Input
                  id="retention"
                  type="number"
                  min={1}
                  max={365}
                  value={formData.retention_days || 30}
                  onChange={(e) =>
                    setFormData({ ...formData, retention_days: parseInt(e.target.value) || 30 })
                  }
                  className="font-mono text-xs max-w-xs h-9"
                />
                <p className="text-[11px] text-muted-foreground">
                  Older snapshot files exceeding this threshold are automatically pruned during maintenance.
                </p>
              </div>

              <div className="pt-4 border-t border-border/80 flex justify-end">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="gap-2 shadow-xs h-9"
                >
                  <Save className="h-4 w-4" />
                  <span>{updateMutation.isPending ? 'Saving...' : 'Save Schedule Settings'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  )
}
