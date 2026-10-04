import React, { useState, useEffect } from 'react'
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
  Clock,
} from 'lucide-react'

export const BackupSchedulePage: React.FC = () => {
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

  const handleSubmit = (e: React.FormEvent) => {
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
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Link to="/backups">
            <Button variant="outline" size="icon" className="h-8 w-8 border-zinc-800 bg-zinc-900/50">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-zinc-400" />
              Automated Backup Schedule &amp; Retention
            </h1>
            <p className="text-xs text-zinc-400">
              Configure background database snapshot routines, format presets, and retention cycles
            </p>
          </div>
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

      {successMsg && (
        <div className="flex items-center gap-2 rounded border border-emerald-900/60 bg-emerald-950/30 p-3 text-xs text-emerald-300">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded border border-red-900/60 bg-red-950/30 p-3 text-xs text-red-300">
          {errorMsg}
        </div>
      )}

      {isLoading ? (
        <Card className="border-zinc-800 bg-zinc-950/60">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-zinc-800 bg-zinc-950/60">
            <CardHeader className="pb-3 border-b border-zinc-800">
              <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase">
                Schedule Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              {/* Enabled Switch */}
              <div className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="space-y-0.5">
                  <div className="font-semibold text-zinc-200">Scheduled Automatic Backups</div>
                  <div className="text-[11px] text-zinc-400">
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
                  <Label htmlFor="cron-exp" className="font-mono text-xs">
                    Cron Expression * (e.g. 0 2 * * *)
                  </Label>
                  <Input
                    id="cron-exp"
                    value={formData.cron_expression || ''}
                    onChange={(e) => setFormData({ ...formData, cron_expression: e.target.value })}
                    className="font-mono text-xs"
                    required
                  />
                  <p className="text-[11px] text-zinc-500 font-mono">
                    Default: 0 2 * * * (Runs every day at 02:00 AM)
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="timezone" className="font-mono text-xs">
                    Timezone
                  </Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(val) => setFormData({ ...formData, timezone: val })}
                  >
                    <SelectTrigger className="w-full">
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
                  <Label className="font-mono text-xs">Snapshot Format</Label>
                  <Select
                    value={formData.format}
                    onValueChange={(val: 'SQL' | 'JSON' | 'CSV' | 'ZIP') =>
                      setFormData({ ...formData, format: val })
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
                  <Label className="font-mono text-xs">Compression</Label>
                  <Select
                    value={formData.compression}
                    onValueChange={(val: 'GZIP' | 'NONE') =>
                      setFormData({ ...formData, compression: val })
                    }
                  >
                    <SelectTrigger className="w-full">
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
                <Label htmlFor="retention" className="font-mono text-xs">
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
                  className="font-mono text-xs max-w-xs"
                />
                <p className="text-[11px] text-zinc-500">
                  Older snapshot files exceeding this threshold are automatically pruned during maintenance.
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-end">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="gap-1.5 bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                >
                  <Save className="h-3.5 w-3.5" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Schedule Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  )
}
