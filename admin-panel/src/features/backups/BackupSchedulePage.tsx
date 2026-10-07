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
import { StatusPill } from '@/components/ui/status-pill'
import {
  CalendarClock,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  Save,
  Database,
  FileArchive,
  Layers,
  Clock,
  Send,
  ShieldCheck,
  Sparkles,
  Info,
  FolderArchive,
  FileText,
  FileCode,
  FileSpreadsheet,
} from 'lucide-react'

const CRON_PRESETS = [
  { label: 'Daily (02:00 AM)', value: '0 2 * * *', desc: 'Every day at 02:00 AM' },
  { label: 'Every 6 Hours', value: '0 */6 * * *', desc: 'At minute 0 past every 6th hour' },
  { label: 'Every 12 Hours', value: '0 */12 * * *', desc: 'Twice daily at 00:00 and 12:00' },
  { label: 'Weekly (Sunday)', value: '0 2 * * 0', desc: 'Every Sunday at 02:00 AM' },
  { label: 'Monthly (1st)', value: '0 2 1 * *', desc: '1st of every month at 02:00 AM' },
]

const KNOWN_TABLES = [
  'users',
  'categories',
  'machines',
  'sections',
  'usage_records',
  'inventory_products',
  'inventory_sub_products',
  'inventory_transactions',
  'audit_logs',
  'error_logs',
  'backup_config',
  'backup_history',
]

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
      const rawFormat = (config.format || 'SQL').toUpperCase()
      const rawCompression = (config.compression || 'GZIP').toUpperCase()

      const validFormat: 'SQL' | 'JSON' | 'CSV' | 'ZIP' | 'ALL' =
        rawFormat === 'JSON' || rawFormat === 'CSV' || rawFormat === 'ZIP' || rawFormat === 'ALL'
          ? rawFormat
          : 'SQL'

      const validCompression: 'GZIP' | 'NONE' = rawCompression === 'NONE' ? 'NONE' : 'GZIP'

      setFormData({
        enabled: Boolean(config.enabled),
        cron_expression: config.cron_expression || '0 2 * * *',
        timezone: config.timezone || 'Asia/Kolkata',
        format: validFormat,
        compression: validCompression,
        retention_days: config.retention_days || 30,
      })
    }
  }, [config])

  const updateMutation = useMutation({
    mutationFn: (input: UpdateBackupConfigInput) => backupApi.updateConfig(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backupConfig'] })
      setSuccessMsg('Backup schedule and retention policies successfully updated and active.')
      setTimeout(() => setSuccessMsg(null), 4500)
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

  const activePreset = CRON_PRESETS.find((p) => p.value === formData.cron_expression?.trim())

  const formatFilenamePreview = () => {
    const format = formData.format || 'SQL'
    const isCompressed = formData.compression === 'GZIP'

    switch (format) {
      case 'ALL':
        return `equiptrack_complete_bundle_${new Date().toISOString().slice(0, 10)}.zip`
      case 'SQL':
        return `equiptrack_full_db_${new Date().toISOString().slice(0, 10)}${isCompressed ? '.sql.gz' : '.sql'}`
      case 'JSON':
        return `equiptrack_full_db_${new Date().toISOString().slice(0, 10)}${isCompressed ? '.json.gz' : '.json'}`
      case 'CSV':
      case 'ZIP':
        return `equiptrack_full_db_${new Date().toISOString().slice(0, 10)}.zip`
      default:
        return `equiptrack_full_db_${new Date().toISOString().slice(0, 10)}.sql.gz`
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back Link */}
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
            <CalendarClock className="h-6 w-6 text-indigo-500" />
            <span>Automated Backup Schedule &amp; Retention</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure background database snapshot routines, multi-format presets, and lifecycle retention policies
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
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-600 dark:text-rose-400">
          {errorMsg}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Card className="border-border bg-card">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-5">
            <Card className="border-border bg-card">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
            {/* Left Column: Form Settings (7 cols) */}
            <div className="space-y-6 lg:col-span-7">
              <Card className="border-border bg-card shadow-xs">
                <CardHeader className="pb-4 border-b border-border/80">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold text-foreground">
                        Schedule &amp; Execution Frequency
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5">
                        Configure automated snapshot intervals and daemon trigger times
                      </CardDescription>
                    </div>
                    <StatusPill
                      variant={formData.enabled ? 'success' : 'neutral'}
                      label={formData.enabled ? 'Schedule Active' : 'Schedule Disabled'}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-5 text-xs">
                  {/* Master Switch */}
                  <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/40">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                        <span>Enable Automatic Background Snapshots</span>
                        {formData.enabled && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            Live
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        When enabled, the backend scheduler wakes up at the cron time and triggers a full database export
                      </div>
                    </div>
                    <Switch
                      checked={Boolean(formData.enabled)}
                      onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                    />
                  </div>

                  {/* Cron Expression & Presets */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="cron-exp" className="text-xs font-medium">
                        Cron Expression *
                      </Label>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        5-part unix cron format
                      </span>
                    </div>
                    <Input
                      id="cron-exp"
                      value={formData.cron_expression || ''}
                      onChange={(e) => setFormData({ ...formData, cron_expression: e.target.value })}
                      className="font-mono text-xs h-9 bg-background"
                      placeholder="0 2 * * *"
                      required
                    />

                    {/* Quick Presets */}
                    <div className="pt-1">
                      <div className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Quick Presets:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {CRON_PRESETS.map((preset) => {
                          const isSelected = formData.cron_expression?.trim() === preset.value
                          return (
                            <button
                              key={preset.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, cron_expression: preset.value })}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all border ${
                                isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-600 font-semibold shadow-xs'
                                  : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted border-border'
                              }`}
                            >
                              {preset.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Timezone */}
                  <div className="space-y-1.5">
                    <Label htmlFor="timezone" className="text-xs font-medium">
                      Execution Timezone
                    </Label>
                    <Select
                      value={formData.timezone || 'Asia/Kolkata'}
                      onValueChange={(val) => setFormData({ ...formData, timezone: val })}
                    >
                      <SelectTrigger id="timezone" className="w-full h-9 text-xs bg-background">
                        <SelectValue placeholder="Select timezone..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST +05:30) [Recommended]</SelectItem>
                        <SelectItem value="UTC">UTC (+00:00) [Universal Standard]</SelectItem>
                        <SelectItem value="America/New_York">America/New_York (EST/EDT)</SelectItem>
                        <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</SelectItem>
                        <SelectItem value="Europe/London">Europe/London (GMT/BST)</SelectItem>
                        <SelectItem value="Asia/Dubai">Asia/Dubai (GST +04:00)</SelectItem>
                        <SelectItem value="Asia/Singapore">Asia/Singapore (SGT +08:00)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Format & Compression Parameters */}
              <Card className="border-border bg-card shadow-xs">
                <CardHeader className="pb-4 border-b border-border/80">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4 text-indigo-500" />
                    <span>Snapshot Format &amp; Storage Presets</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Select the data format structure, archive packaging, and file retention threshold
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-5 text-xs">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Format Selection */}
                    <div className="space-y-1.5">
                      <Label htmlFor="snapshot-format" className="text-xs font-medium">
                        Snapshot Format *
                      </Label>
                      <Select
                        value={formData.format || 'SQL'}
                        onValueChange={(val: 'SQL' | 'JSON' | 'CSV' | 'ZIP' | 'ALL') =>
                          setFormData({ ...formData, format: val })
                        }
                      >
                        <SelectTrigger id="snapshot-format" className="w-full h-9 text-xs bg-background">
                          <SelectValue placeholder="Select snapshot format..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL" className="font-semibold text-indigo-600 dark:text-indigo-400">
                            ⭐️ Complete Multi-Format Archive (.zip)
                          </SelectItem>
                          <SelectItem value="SQL">PostgreSQL SQL Dump (.sql)</SelectItem>
                          <SelectItem value="JSON">Structured JSON Dataset (.json)</SelectItem>
                          <SelectItem value="CSV">Comma-Separated Values (.csv)</SelectItem>
                          <SelectItem value="ZIP">Per-Table CSV Archive (.zip)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        {formData.format === 'ALL' && 'Packages SQL dump, JSON datasets, and per-table CSV files together.'}
                        {formData.format === 'SQL' && 'Standard PostgreSQL DDL + INSERT statements for complete schema restoration.'}
                        {formData.format === 'JSON' && 'Structured hierarchical JSON dataset across all 12 database tables.'}
                        {(formData.format === 'CSV' || formData.format === 'ZIP') && 'Separate CSV table sheets compressed in high-ratio zip.'}
                      </p>
                    </div>

                    {/* Compression Algorithm */}
                    <div className="space-y-1.5">
                      <Label htmlFor="compression-algo" className="text-xs font-medium">
                        Compression Algorithm
                      </Label>
                      <Select
                        value={formData.compression || 'GZIP'}
                        disabled={formData.format === 'ALL' || formData.format === 'CSV' || formData.format === 'ZIP'}
                        onValueChange={(val: 'GZIP' | 'NONE') =>
                          setFormData({ ...formData, compression: val })
                        }
                      >
                        <SelectTrigger id="compression-algo" className="w-full h-9 text-xs bg-background">
                          <SelectValue placeholder="Select compression..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GZIP">GZIP Compression (.gz) [Recommended]</SelectItem>
                          <SelectItem value="NONE">Uncompressed Raw File</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        {(formData.format === 'ALL' || formData.format === 'CSV' || formData.format === 'ZIP')
                          ? 'Zip format uses native DEFLATE level 9 compression.'
                          : 'GZIP reduces snapshot bandwidth & storage by up to 85%.'}
                      </p>
                    </div>
                  </div>

                  {/* Retention Window */}
                  <div className="space-y-1.5 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="retention" className="text-xs font-medium">
                        Retention Window (Days)
                      </Label>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {formData.retention_days || 30} days cycle
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        id="retention"
                        type="number"
                        min={1}
                        max={365}
                        value={formData.retention_days || 30}
                        onChange={(e) =>
                          setFormData({ ...formData, retention_days: parseInt(e.target.value) || 30 })
                        }
                        className="font-mono text-xs max-w-[140px] h-9 bg-background"
                      />
                      <span className="text-xs text-muted-foreground">days until auto-pruning</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Expired database dumps older than this threshold are safely pruned during scheduled maintenance.
                    </p>
                  </div>

                  {/* Submit Action */}
                  <div className="pt-4 border-t border-border/80 flex justify-end gap-3 items-center">
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                      className="gap-2 shadow-xs h-9 px-4"
                    >
                      <Save className="h-4 w-4" />
                      <span>{updateMutation.isPending ? 'Saving...' : 'Save Schedule Settings'}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Live Snapshot Preview & Manifest (5 cols) */}
            <div className="space-y-6 lg:col-span-5 lg:sticky lg:top-6">
              <Card className="border-border bg-card shadow-xs overflow-hidden">
                <CardHeader className="pb-3 border-b border-border/80 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                      <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Snapshot Preview &amp; Manifest
                      </CardTitle>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold">
                      {formData.format || 'SQL'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4 text-xs">
                  {/* Target Filename */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-muted-foreground font-medium">Expected Output Artifact:</span>
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2.5 font-mono text-[11px] text-foreground break-all">
                      <FileArchive className="h-4 w-4 shrink-0 text-indigo-500" />
                      <span>{formatFilenamePreview()}</span>
                    </div>
                  </div>

                  {/* Contents Tree Breakdown */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-muted-foreground font-medium">Archive Package Contents:</span>
                    <div className="rounded-xl border border-border bg-card/60 p-3 space-y-2 font-mono text-[11px]">
                      {formData.format === 'ALL' ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-foreground font-semibold font-sans text-xs">
                            <FolderArchive className="h-4 w-4 text-indigo-500" />
                            <span>Complete All-in-One Package Bundle:</span>
                          </div>
                          <div className="pl-4 space-y-1 text-muted-foreground text-[11px]">
                            <div className="flex items-center gap-1.5 text-foreground">
                              <FileCode className="h-3.5 w-3.5 text-emerald-500" />
                              <span>database/equiptrack_full_dump.sql</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-foreground">
                              <FileText className="h-3.5 w-3.5 text-blue-500" />
                              <span>data/equiptrack_full_dataset.json</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-foreground">
                              <FileSpreadsheet className="h-3.5 w-3.5 text-amber-500" />
                              <span>csv/*.csv (All 12 Database Tables)</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-foreground">
                              <Info className="h-3.5 w-3.5 text-purple-500" />
                              <span>manifest.json (Schema metadata &amp; stats)</span>
                            </div>
                          </div>
                        </div>
                      ) : formData.format === 'SQL' ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-foreground font-medium">
                            <FileCode className="h-3.5 w-3.5 text-emerald-500" />
                            <span>PostgreSQL Full DDL &amp; Data INSERT Dump</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground font-sans pl-5">
                            Contains DDL statements, schemas, sequences, and row insertions for all 12 database tables.
                          </p>
                        </div>
                      ) : formData.format === 'JSON' ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-foreground font-medium">
                            <FileText className="h-3.5 w-3.5 text-blue-500" />
                            <span>Universal JSON Structured Dataset</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground font-sans pl-5">
                            Clean JSON object arrays indexed by table name with foreign key hierarchies.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-foreground font-medium">
                            <FileSpreadsheet className="h-3.5 w-3.5 text-amber-500" />
                            <span>Individual CSV Table Spreadsheets (.zip)</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground font-sans pl-5">
                            One independent CSV file per database table bundled into a single compressed archive.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Database Tables Discovered */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground font-medium">
                        Tables Dynamically Backed Up (100% Whole DB):
                      </span>
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        {KNOWN_TABLES.length} tables
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-2 rounded-lg border border-border bg-muted/20">
                      {KNOWN_TABLES.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-muted text-foreground border border-border/80"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Delivery & Schedule Summary */}
                  <div className="pt-3 border-t border-border/60 space-y-2.5">
                    <div className="flex items-center justify-between font-sans">
                      <span className="text-muted-foreground">Telegram Cloud Delivery:</span>
                      <StatusPill
                        variant={config?.telegram_configured ? 'success' : 'neutral'}
                        label={config?.telegram_configured ? 'Configured & Active' : 'Not Configured (Local)'}
                      />
                    </div>

                    <div className="flex items-center justify-between font-sans">
                      <span className="text-muted-foreground">Schedule Interval:</span>
                      <span className="font-medium text-foreground text-right text-[11px]">
                        {activePreset ? activePreset.desc : (formData.cron_expression || 'Custom')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between font-sans">
                      <span className="text-muted-foreground">Lifecycle Pruning:</span>
                      <span className="font-medium text-foreground text-[11px]">
                        Every {formData.retention_days || 30} days
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security & Reliability Note */}
              <Card className="border-border bg-card/60 shadow-xs">
                <CardContent className="p-4 flex items-start gap-3 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Backups run as isolated background daemon jobs. Temporary snapshot artifacts are automatically scrubbed from server storage immediately following successful cloud broadcast.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
