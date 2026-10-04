import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditApi } from '@/lib/api/auditApi'
import type { AuditLog } from '@/types/api'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  RefreshCw,
  Clock,
  Shield,
  FileCode,
} from 'lucide-react'

export const AuditLogsPage: React.FC = () => {
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
            System Audit Trail
          </h1>
          <p className="text-xs text-zinc-400">
            Immutable log of administrative operations, security policy adjustments, and system events
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

      {/* Search Bar */}
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <Input
            placeholder="Search action, resource, admin email, IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Audit Table */}
      <div className="rounded-md border border-zinc-800 bg-zinc-950/70 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Operator</TableHead>
              <TableHead>Client IP</TableHead>
              <TableHead>Result</TableHead>
              <TableHead className="text-right">Details</TableHead>
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
                <TableCell colSpan={7} className="h-32 text-center text-zinc-500">
                  No audit trail records found.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-zinc-900/60">
                  <TableCell className="font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {log.action}
                    </Badge>
                  </TableCell>

                  <TableCell className="font-mono text-[11px] text-zinc-200">
                    <span>{log.resource}</span>
                    {log.resource_id && (
                      <span className="text-zinc-500 text-[10px] ml-1">
                        ({log.resource_id.length > 8 ? `${log.resource_id.slice(0, 8)}...` : log.resource_id})
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="text-zinc-300 text-xs font-mono">
                    {log.admin_email || <span className="text-zinc-500">System</span>}
                  </TableCell>

                  <TableCell className="font-mono text-[11px] text-zinc-500">
                    {log.ip_address || '127.0.0.1'}
                  </TableCell>

                  <TableCell>
                    <Badge variant={log.result === 'SUCCESS' ? 'success' : 'destructive'}>
                      {log.result}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(log)}
                      className="h-6 px-2 text-[10px] font-mono text-zinc-400 hover:text-zinc-100"
                    >
                      <FileCode className="h-3 w-3 mr-1" />
                      Inspect
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Log Details Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="sm:max-w-lg bg-zinc-950 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <Shield className="h-4 w-4 text-zinc-400" />
              Audit Event: {selectedLog?.action}
            </DialogTitle>
            <DialogDescription className="font-mono text-[11px] text-zinc-500 flex items-center gap-2">
              <Clock className="h-3 w-3" />
              {selectedLog && new Date(selectedLog.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 font-mono text-xs">
            <div className="grid grid-cols-2 gap-2 rounded border border-zinc-800 bg-zinc-900/50 p-3">
              <div>
                <div className="text-[10px] text-zinc-500">Operator</div>
                <div className="text-zinc-200 mt-0.5">{selectedLog?.admin_email || 'System'}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500">Resource Target</div>
                <div className="text-zinc-200 mt-0.5">
                  {selectedLog?.resource} ({selectedLog?.resource_id || 'n/a'})
                </div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500">IP Address</div>
                <div className="text-zinc-200 mt-0.5">{selectedLog?.ip_address || '127.0.0.1'}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500">Result</div>
                <div className="text-zinc-200 mt-0.5 font-bold">{selectedLog?.result}</div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-zinc-400 font-semibold">Event Payload / Parameters</div>
              <pre className="overflow-x-auto rounded border border-zinc-800 bg-black p-3 text-[11px] text-zinc-300 max-h-56">
                {JSON.stringify(selectedLog?.details || {}, null, 2)}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
