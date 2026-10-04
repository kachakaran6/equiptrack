import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { errorsApi } from '@/lib/api/errorsApi'
import type { ErrorLog } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'

export const ErrorsPage: React.FC = () => {
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
    // Redact potential connection strings or JWT tokens
    return stack
      .replace(/postgres:\/\/[^@]+@/gi, 'postgres://[REDACTED]@')
      .replace(/Bearer\s+[A-Za-z0-9-_=.]+/gi, 'Bearer [REDACTED]')
      .replace(/bot[0-9]+:[A-Za-z0-9_-]+/gi, 'bot[REDACTED]')
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
            System Error Logs
          </h1>
          <p className="text-xs text-zinc-400">
            Inspect backend exceptions, API runtime faults, and sanitized diagnostics
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

          {errorLogs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClearOpen(true)}
              className="h-8 gap-1.5 text-xs text-red-400 border-zinc-800 hover:bg-red-950/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Logs
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <Input
            placeholder="Search error messages, endpoints, codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-zinc-400">Severity:</span>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
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
      <div className="rounded-md border border-zinc-800 bg-zinc-950/70 overflow-auto max-h-[calc(100vh-280px)]">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800">
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Method & Endpoint</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Error Code</TableHead>
              <TableHead>Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-64" /></TableCell>
                </TableRow>
              ))
            ) : filteredErrors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-zinc-500">
                  No error logs recorded. System is operating cleanly.
                </TableCell>
              </TableRow>
            ) : (
              filteredErrors.map((err) => (
                <TableRow
                  key={err.id}
                  onClick={() => setSelectedError(err)}
                  className="cursor-pointer hover:bg-zinc-900/60"
                >
                  <TableCell className="font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                    {new Date(err.created_at).toLocaleString()}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={
                        err.severity === 'FATAL' || err.severity === 'ERROR'
                          ? 'destructive'
                          : err.severity === 'WARN'
                          ? 'warning'
                          : 'secondary'
                      }
                    >
                      {err.severity}
                    </Badge>
                  </TableCell>

                  <TableCell className="font-mono text-[11px] text-zinc-300">
                    <span className="font-bold text-zinc-400 mr-1.5">{err.method || 'GET'}</span>
                    <span>{err.endpoint || '/'}</span>
                  </TableCell>

                  <TableCell className="font-mono text-[11px]">
                    <span className={err.status_code && err.status_code >= 500 ? 'text-red-400' : 'text-amber-400'}>
                      {err.status_code || 500}
                    </span>
                  </TableCell>

                  <TableCell className="font-mono text-[10px] text-zinc-500">
                    {err.error_code || 'INTERNAL_ERROR'}
                  </TableCell>

                  <TableCell className="text-zinc-200 text-xs max-w-sm truncate">
                    {err.message}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Error Details Sheet */}
      <Sheet open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto bg-zinc-950 border-l border-zinc-800">
          <SheetHeader className="border-b border-zinc-800 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    selectedError?.severity === 'FATAL' || selectedError?.severity === 'ERROR'
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {selectedError?.severity}
                </Badge>
                <span className="font-mono text-xs text-zinc-500">{selectedError?.error_code}</span>
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
                className="h-7 px-2 text-[11px] gap-1 border-zinc-800 bg-zinc-900/60"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy Info'}
              </Button>
            </div>
            <SheetTitle className="text-sm font-semibold text-zinc-100 break-words mt-2">
              {selectedError?.message}
            </SheetTitle>
            <SheetDescription className="font-mono text-[11px] text-zinc-500 flex items-center gap-2">
              <Clock className="h-3 w-3" />
              {selectedError && new Date(selectedError.created_at).toLocaleString()}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4 font-mono text-xs">
            {/* Meta tags */}
            <div className="grid grid-cols-2 gap-2 rounded border border-zinc-800 bg-zinc-900/50 p-3">
              <div>
                <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Endpoint
                </div>
                <div className="text-zinc-200 mt-0.5 truncate">
                  {selectedError?.method} {selectedError?.endpoint}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500">HTTP Status</div>
                <div className="text-zinc-200 mt-0.5">{selectedError?.status_code || 500}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <User className="h-3 w-3" /> User ID
                </div>
                <div className="text-zinc-200 mt-0.5 truncate">
                  {selectedError?.user_id || 'Unauthenticated'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500">Error ID</div>
                <div className="text-zinc-200 mt-0.5 truncate">{selectedError?.id}</div>
              </div>
            </div>

            {/* Stack trace */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-semibold">
                <Terminal className="h-3.5 w-3.5" /> Stack Trace (Sanitized)
              </div>
              <pre className="overflow-x-auto rounded border border-zinc-800 bg-black p-3 text-[11px] text-zinc-300 leading-relaxed max-h-72">
                {sanitizeStackTrace(selectedError?.stack_trace)}
              </pre>
            </div>

            {/* Metadata if present */}
            {selectedError?.metadata && (
              <div className="space-y-1.5">
                <div className="text-[11px] text-zinc-400 font-semibold">Metadata & Parameters</div>
                <pre className="overflow-x-auto rounded border border-zinc-800 bg-black p-3 text-[11px] text-zinc-300">
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
