import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { backupApi } from '@/lib/api/backupApi'
import type { BackupHistoryItem } from '@/types/api'
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
  History,
  ArrowLeft,
  Search,
  RefreshCw,
  Clock,
  HardDriveDownload,
  FileCode,
} from 'lucide-react'

export const BackupHistoryPage: React.FC = () => {
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
    <div className="space-y-4">
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
              <History className="h-5 w-5 text-zinc-400" />
              Backup Execution History
            </h1>
            <p className="text-xs text-zinc-400">
              Complete historical log of all database snapshots, checksums, and delivery statuses
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

      {/* Search Bar */}
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <Input
            placeholder="Search destination, format, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-md border border-zinc-800 bg-zinc-950/70 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Started Time</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Checksum</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-zinc-500">
                  No backup execution records found.
                </TableCell>
              </TableRow>
            ) : (
              filteredHistory.map((item) => (
                <TableRow key={item.id} className="hover:bg-zinc-900/60 font-mono text-xs">
                  <TableCell className="text-zinc-400 whitespace-nowrap text-[11px]">
                    {new Date(item.started_at).toLocaleString()}
                  </TableCell>

                  <TableCell className="text-zinc-500 whitespace-nowrap text-[11px]">
                    {item.completed_at ? new Date(item.completed_at).toLocaleTimeString() : 'In Progress'}
                  </TableCell>

                  <TableCell>
                    <Badge variant={item.status === 'COMPLETED' ? 'success' : item.status === 'FAILED' ? 'destructive' : 'secondary'}>
                      {item.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-zinc-200">
                    <Badge variant="outline" className="text-[10px]">
                      {item.format}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-zinc-300">
                    {formatBytes(item.size_bytes)}
                  </TableCell>

                  <TableCell className="text-zinc-400 text-[11px] max-w-xs truncate font-sans">
                    {item.destination}
                  </TableCell>

                  <TableCell className="text-zinc-500 text-[10px] truncate max-w-[120px]">
                    {item.checksum || '—'}
                  </TableCell>

                  <TableCell className="text-right font-sans">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedBackup(item)}
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

      {/* Backup Details Dialog */}
      <Dialog open={!!selectedBackup} onOpenChange={() => setSelectedBackup(null)}>
        <DialogContent className="sm:max-w-lg bg-zinc-950 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <HardDriveDownload className="h-4 w-4 text-zinc-400" />
              Backup Artifact Inspection
            </DialogTitle>
            <DialogDescription className="font-mono text-[11px] text-zinc-500 flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Started: {selectedBackup && new Date(selectedBackup.started_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 font-mono text-xs">
            <div className="grid grid-cols-2 gap-2 rounded border border-zinc-800 bg-zinc-900/50 p-3">
              <div>
                <div className="text-[10px] text-zinc-500">Status</div>
                <div className="text-zinc-200 mt-0.5 font-semibold">{selectedBackup?.status}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500">Format</div>
                <div className="text-zinc-200 mt-0.5">{selectedBackup?.format}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500">Size</div>
                <div className="text-zinc-200 mt-0.5">{formatBytes(selectedBackup?.size_bytes)}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500">Duration</div>
                <div className="text-zinc-200 mt-0.5">
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

            <div className="space-y-1">
              <div className="text-[10px] text-zinc-500">Destination URI / Cloud Path</div>
              <div className="rounded border border-zinc-800 bg-zinc-900/50 p-2 text-zinc-300 break-all text-[11px]">
                {selectedBackup?.destination}
              </div>
            </div>

            {selectedBackup?.checksum && (
              <div className="space-y-1">
                <div className="text-[10px] text-zinc-500">SHA-256 Checksum</div>
                <div className="rounded border border-zinc-800 bg-zinc-900/50 p-2 text-zinc-400 break-all text-[10px]">
                  {selectedBackup.checksum}
                </div>
              </div>
            )}

            {selectedBackup?.error_message && (
              <div className="space-y-1">
                <div className="text-[10px] text-red-400">Error Description</div>
                <div className="rounded border border-red-900/60 bg-red-950/30 p-2 text-red-300 text-[11px]">
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
