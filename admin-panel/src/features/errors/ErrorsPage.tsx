import type { FC } from 'react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { errorsApi } from '@/lib/api/errorsApi'
import type { ErrorLog } from '@/types/api'
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusPill } from '@/components/ui/status-pill'
import { FormattedDate } from '@/components/ui/formatted-date'
import { CopyableCode } from '@/components/ui/copyable-code'
import {
  Search,
  Trash2,
  RefreshCw,
  Terminal,
  Clock,
  Globe,
  User,
  Copy,
  Check,
  CheckCircle2,
} from 'lucide-react'

export const ErrorsPage: FC = () => {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('ALL')
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null)
  const [isClearOpen, setIsClearOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const { data: errorLogs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['adminErrors', severityFilter],
    queryFn: () => errorsApi.listErrors({ severity: severityFilter !== 'ALL' ? severityFilter : undefined }),
    refetchInterval: 15000,
  })

  const clearMutation = useMutation({
    mutationFn: () => errorsApi.clearErrors(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminErrors'] })
      setIsClearOpen(false)
      setSelectedError(null)
    },
  })

  const filteredErrors = errorLogs.filter((err) => {
    return (
      err.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (err.endpoint && err.endpoint.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (err.error_code && err.error_code.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })

  const sanitizeStackTrace = (stack?: string | null) => {
    if (!stack) return 'No stack trace recorded.'
    return stack
      .replace(/postgres:\/\/[^@]+@/gi, 'postgres://[REDACTED]@')
      .replace(/Bearer\s+[A-Za-z0-9-_=.]+/gi, 'Bearer [REDACTED]')
      .replace(/bot[0-9]+:[A-Za-z0-9_-]+/gi, 'bot[REDACTED]')
  }

  const getSeverityVariant = (severity: string) => {
    const upper = severity.toUpperCase()
    if (upper === 'FATAL' || upper === 'ERROR') return 'danger'
    if (upper === 'WARN' || upper === 'WARNING') return 'warning'
    if (upper === 'INFO') return 'info'
    return 'neutral'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            System Error Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Inspect backend exceptions, API runtime faults, and sanitized server diagnostics
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

          {errorLogs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClearOpen(true)}
              className="h-9 gap-2 shadow-xs text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear Logs</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search error messages, endpoints, codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Severity:</span>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue placeholder="All Severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Severities</SelectItem>
              <SelectItem value="ERROR">ERROR</SelectItem>
              <SelectItem value="WARN">WARN</SelectItem>
              <SelectItem value="FATAL">FATAL</SelectItem>
              <SelectItem value="INFO">INFO</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Errors Table */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold text-xs text-muted-foreground">Timestamp</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Severity</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Method & Endpoint</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground text-center">Status</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Error Code</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-64" /></TableCell>
                  </TableRow>
                ))
              ) : filteredErrors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500/70" />
                      <p className="text-sm font-medium text-foreground">No error logs recorded</p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {searchTerm ? 'No errors match your search filter.' : 'All services and database layers are operating cleanly without exceptions.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredErrors.map((err) => (
                  <TableRow
                    key={err.id}
                    onClick={() => setSelectedError(err)}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      <FormattedDate value={err.created_at} />
                    </TableCell>

                    <TableCell>
                      <StatusPill
                        variant={getSeverityVariant(err.severity)}
                        label={err.severity}
                        size="sm"
                      />
                    </TableCell>

                    <TableCell className="font-mono text-xs text-foreground/90">
                      <span className="font-bold text-muted-foreground mr-1.5">{err.method || 'GET'}</span>
                      <span>{err.endpoint || '/'}</span>
                    </TableCell>

                    <TableCell className="font-mono text-xs text-center">
                      <span className={err.status_code && err.status_code >= 500 ? 'font-semibold text-rose-600 dark:text-rose-400' : 'font-semibold text-amber-600 dark:text-amber-400'}>
                        {err.status_code || 500}
                      </span>
                    </TableCell>

                    <TableCell>
                      <CopyableCode value={err.error_code || 'INTERNAL_ERROR'} truncateLength={16} />
                    </TableCell>

                    <TableCell className="text-xs text-foreground/80 max-w-sm truncate">
                      {err.message}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Error Details Sheet */}
      <Sheet open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto bg-card border-l border-border">
          <SheetHeader className="border-b border-border/80 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedError && (
                  <StatusPill
                    variant={getSeverityVariant(selectedError.severity)}
                    label={selectedError.severity}
                  />
                )}
                <span className="font-mono text-xs text-muted-foreground">{selectedError?.error_code}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedError) {
                    const text = `Error: ${selectedError.error_code}\nMessage: ${selectedError.message}\nEndpoint: ${selectedError.method} ${selectedError.endpoint}\nStatus: ${selectedError.status_code}\nTimestamp: ${selectedError.created_at}\n\nStack Trace:\n${selectedError.stack_trace || 'None'}\n\nMetadata:\n${JSON.stringify(selectedError.metadata || {}, null, 2)}`
                    navigator.clipboard.writeText(text)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }
                }}
                className="h-8 px-2.5 text-xs gap-1.5 shadow-xs"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Info'}</span>
              </Button>
            </div>
            <SheetTitle className="text-base font-semibold text-foreground break-words mt-3">
              {selectedError?.message}
            </SheetTitle>
            <SheetDescription className="font-mono text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{selectedError && new Date(selectedError.created_at).toLocaleString()}</span>
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4 font-mono text-xs">
            {/* Meta tags */}
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 p-3.5 font-sans">
              <div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" />
                  <span>Endpoint</span>
                </div>
                <div className="text-xs font-mono font-medium text-foreground mt-0.5 truncate">
                  {selectedError?.method} {selectedError?.endpoint}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">HTTP Status</div>
                <div className="text-xs font-mono font-semibold text-foreground mt-0.5">{selectedError?.status_code || 500}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  <span>User ID</span>
                </div>
                <div className="text-xs font-mono text-foreground mt-0.5 truncate">
                  {selectedError?.user_id || 'Unauthenticated'}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Error ID</div>
                <div className="text-xs font-mono text-foreground mt-0.5 truncate">{selectedError?.id}</div>
              </div>
            </div>

            {/* Stack trace */}
            <div className="space-y-1.5 font-sans">
              <div className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
                <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Stack Trace (Sanitized)</span>
              </div>
              <pre className="overflow-x-auto rounded-xl border border-border bg-muted/50 p-3.5 text-[11px] font-mono text-foreground/90 leading-relaxed max-h-72">
                {sanitizeStackTrace(selectedError?.stack_trace)}
              </pre>
            </div>

            {/* Metadata if present */}
            {selectedError?.metadata && (
              <div className="space-y-1.5 font-sans">
                <div className="text-xs text-foreground font-semibold">Metadata &amp; Parameters</div>
                <pre className="overflow-x-auto rounded-xl border border-border bg-muted/50 p-3.5 text-[11px] font-mono text-foreground/90">
                  {JSON.stringify(selectedError.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Clear Logs AlertDialog */}
      <AlertDialog open={isClearOpen} onOpenChange={setIsClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Error Logs</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to purge all stored server error records? This action cannot be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
            >
              Purge All Errors
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
