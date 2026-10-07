import type { FC } from 'react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { backupApi } from '@/lib/api/backupApi'
import type { BackupHistoryItem } from '@/types/api'
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
  ArrowLeft,
  Search,
  RefreshCw,
  Clock,
  HardDriveDownload,
  FileCode,
  Archive,
} from 'lucide-react'

export const BackupHistoryPage: FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBackup, setSelectedBackup] = useState<BackupHistoryItem | null>(null)

  const { data: history = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['backupHistory'],
    queryFn: () => backupApi.getHistory(),
    refetchInterval: 30000,
  })

  const filteredHistory = history.filter((item) => {
    return (
      item.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.format.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.checksum && item.checksum.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })

  const formatBytes = (bytes?: number | null) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
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
            <span>Backup Execution History</span>
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
            placeholder="Search destination, format, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* History Table Container */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold text-xs text-muted-foreground">Started Time</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Completed</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Status</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Format</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Size</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Destination</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Checksum</TableHead>
                <TableHead className="text-right font-semibold text-xs text-muted-foreground">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Archive className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm font-medium text-foreground">No backup history records</p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {searchTerm ? 'No backups match your search filter.' : 'Completed snapshot routines will be cataloged here.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredHistory.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      <FormattedDate value={item.started_at} />
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {item.completed_at ? (
                        <FormattedDate value={item.completed_at} format="time-only" />
                      ) : (
                        <StatusPill variant="info" label="In Progress" pulse size="sm" />
                      )}
                    </TableCell>

                    <TableCell>
                      <StatusPill
                        variant={item.status === 'COMPLETED' ? 'success' : item.status === 'FAILED' ? 'danger' : 'neutral'}
                        label={item.status}
                        size="sm"
                      />
                    </TableCell>

                    <TableCell>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-muted border border-border text-foreground uppercase">
                        {item.format}
                      </span>
                    </TableCell>

                    <TableCell className="font-mono text-xs tabular-nums text-foreground/90 font-medium">
                      {formatBytes(item.size_bytes)}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {item.destination}
                    </TableCell>

                    <TableCell>
                      <CopyableCode value={item.checksum} truncateLength={14} />
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedBackup(item)}
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

      {/* Backup Details Dialog */}
      <Dialog open={!!selectedBackup} onOpenChange={() => setSelectedBackup(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <HardDriveDownload className="h-4 w-4 text-indigo-500" />
              <DialogTitle className="text-base font-semibold">
                Backup Artifact Inspection
              </DialogTitle>
            </div>
            <DialogDescription className="font-mono text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
              <Clock className="h-3.5 w-3.5" />
              <span>Started: {selectedBackup && new Date(selectedBackup.started_at).toLocaleString()}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 font-mono text-xs">
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 p-3.5 font-sans">
              <div>
                <div className="text-[11px] text-muted-foreground">Status</div>
                <div className="mt-0.5">
                  <StatusPill
                    variant={selectedBackup?.status === 'COMPLETED' ? 'success' : 'danger'}
                    label={selectedBackup?.status}
                    size="sm"
                  />
                </div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Format</div>
                <div className="text-xs font-mono font-semibold text-foreground mt-0.5">{selectedBackup?.format}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Size</div>
                <div className="text-xs font-mono font-semibold text-foreground mt-0.5">{formatBytes(selectedBackup?.size_bytes)}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Duration</div>
                <div className="text-xs font-mono text-foreground mt-0.5">
                  {selectedBackup?.completed_at
                    ? `${Math.max(
                        1,
                        Math.round(
                          (new Date(selectedBackup.completed_at).getTime() -
                            new Date(selectedBackup.started_at).getTime()) /
                            1000
                        )
                      )}s`
                    : 'N/A'}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 font-sans">
              <div className="text-xs text-muted-foreground font-medium">Destination URI / Cloud Path</div>
              <div className="rounded-xl border border-border bg-muted/40 p-3 text-foreground font-mono break-all text-xs">
                {selectedBackup?.destination}
              </div>
            </div>

            {selectedBackup?.checksum && (
              <div className="space-y-1.5 font-sans">
                <div className="text-xs text-muted-foreground font-medium">SHA-256 Checksum</div>
                <div className="rounded-xl border border-border bg-muted/40 p-3 text-foreground font-mono break-all text-xs">
                  <CopyableCode value={selectedBackup.checksum} truncateLength={0} />
                </div>
              </div>
            )}

            {selectedBackup?.error_message && (
              <div className="space-y-1.5 font-sans">
                <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">Error Description</div>
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-rose-600 dark:text-rose-400 text-xs">
                  {selectedBackup.error_message}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
