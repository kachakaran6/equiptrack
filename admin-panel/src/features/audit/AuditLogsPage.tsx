import type { FC } from 'react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditApi } from '@/lib/api/auditApi'
import type { AuditLog } from '@/types/api'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusPill } from '@/components/ui/status-pill'
import { FormattedDate } from '@/components/ui/formatted-date'
import { CopyableCode } from '@/components/ui/copyable-code'
import {
  Search,
  RefreshCw,
  Clock,
  Shield,
  FileCode,
  Activity,
} from 'lucide-react'

export const AuditLogsPage: FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const { data: auditLogs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['adminAuditLogs'],
    queryFn: () => auditApi.listAuditLogs({ limit: 100 }),
    refetchInterval: 20000,
  })

  const filteredLogs = auditLogs.filter((log) => {
    return (
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.admin_email && log.admin_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.ip_address && log.ip_address.includes(searchTerm))
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            System Audit Trail
          </h1>
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

      {/* Search Bar */}
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search action, resource, admin email, IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Audit Table */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold text-xs text-muted-foreground">Timestamp</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Action</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Resource</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Operator</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Client IP</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Result</TableHead>
                <TableHead className="text-right font-semibold text-xs text-muted-foreground">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Activity className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm font-medium text-foreground">No audit logs found</p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {searchTerm ? 'No audit records match your search filter.' : 'Administrative actions will appear in this timeline.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      <FormattedDate value={log.created_at} />
                    </TableCell>

                    <TableCell>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-muted border border-border text-foreground">
                        {log.action}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5 font-mono text-xs text-foreground">
                        <span>{log.resource}</span>
                        {log.resource_id && (
                          <CopyableCode value={log.resource_id} truncateLength={8} className="text-[10px]" />
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-foreground/90 font-medium">
                      {log.admin_email || <span className="text-muted-foreground font-mono text-xs">System</span>}
                    </TableCell>

                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {log.ip_address || '127.0.0.1'}
                    </TableCell>

                    <TableCell>
                      <StatusPill
                        variant={log.result === 'SUCCESS' ? 'success' : 'danger'}
                        label={log.result}
                        size="sm"
                      />
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
                      >
                        <FileCode className="h-3.5 w-3.5" />
                        <span>Inspect</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Log Details Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-500" />
              <DialogTitle className="text-base font-semibold">
                Audit Event: {selectedLog?.action}
              </DialogTitle>
            </div>
            <DialogDescription className="font-mono text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{selectedLog && new Date(selectedLog.created_at).toLocaleString()}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 font-mono text-xs">
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 p-3.5 font-sans">
              <div>
                <div className="text-[11px] text-muted-foreground">Operator</div>
                <div className="text-xs font-semibold text-foreground mt-0.5">{selectedLog?.admin_email || 'System'}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Resource Target</div>
                <div className="text-xs font-mono text-foreground mt-0.5">
                  {selectedLog?.resource} {selectedLog?.resource_id ? `(${selectedLog.resource_id.slice(0, 8)})` : ''}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Client IP Address</div>
                <div className="text-xs font-mono text-foreground mt-0.5">{selectedLog?.ip_address || '127.0.0.1'}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Execution Result</div>
                <div className="mt-0.5">
                  <StatusPill
                    variant={selectedLog?.result === 'SUCCESS' ? 'success' : 'danger'}
                    label={selectedLog?.result}
                    size="sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5 font-sans">
              <div className="text-xs text-foreground font-semibold">Event Payload / Parameters</div>
              <pre className="overflow-x-auto rounded-xl border border-border bg-muted/50 p-3.5 text-[11px] font-mono text-foreground/90 max-h-56">
                {JSON.stringify(selectedLog?.details || {}, null, 2)}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
