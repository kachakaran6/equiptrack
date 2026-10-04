import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { databaseApi } from '@/lib/api/databaseApi'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Database,
  Search,
  RefreshCw,
  Table as TableIcon,
  Columns,
  Rows,
  ArrowRight,
} from 'lucide-react'

export const DatabaseExplorerPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')

  const { data: tables = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['adminDatabaseTables'],
    queryFn: () => databaseApi.getTables(),
  })

  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
            <Database className="h-5 w-5 text-zinc-400" />
            Database Schema Explorer
          </h1>
          <p className="text-xs text-zinc-400">
            Inspect real-time table schemas, record counts, and explore datasets safely through backend metadata
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
            Refresh Schema
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <Input
            placeholder="Filter database tables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        <div className="font-mono text-[11px] text-zinc-500">
          {tables.length} managed tables discovered
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, idx) => (
            <Card key={idx} className="border-zinc-800 bg-zinc-950/60">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mt-2" />
              </CardContent>
            </Card>
          ))
        ) : filteredTables.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-zinc-500">
            No database tables found matching your search.
          </div>
        ) : (
          filteredTables.map((tbl) => (
            <Link
              key={tbl.name}
              to={`/database/${tbl.name}`}
              className="group block"
            >
              <Card className="h-full border-zinc-800/80 bg-zinc-950/60 transition-colors hover:border-zinc-700 hover:bg-zinc-900/40">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-mono text-zinc-200 group-hover:text-zinc-100 flex items-center gap-2">
                      <TableIcon className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300" />
                      {tbl.name}
                    </CardTitle>
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-300" />
                  </div>
                  <CardDescription className="font-mono text-[11px] text-zinc-500">
                    PostgreSQL Table
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between font-mono text-xs text-zinc-400">
                    <span className="flex items-center gap-1.5 text-zinc-500">
                      <Rows className="h-3.5 w-3.5" /> Rows:
                    </span>
                    <Badge variant="secondary" className="font-mono text-[11px]">
                      {tbl.rowCount.toLocaleString()}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between font-mono text-xs text-zinc-400">
                    <span className="flex items-center gap-1.5 text-zinc-500">
                      <Columns className="h-3.5 w-3.5" /> Columns:
                    </span>
                    <span className="text-zinc-300">{(tbl.columns || []).length} columns</span>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {(tbl.columns || []).slice(0, 4).map((col) => (
                      <span
                        key={col.column_name}
                        className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[9px] text-zinc-400 border border-zinc-800/60"
                      >
                        {col.column_name}
                      </span>
                    ))}
                    {(tbl.columns || []).length > 4 && (
                      <span className="font-mono text-[9px] text-zinc-600 px-1 py-0.5">
                        +{(tbl.columns || []).length - 4} more
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
