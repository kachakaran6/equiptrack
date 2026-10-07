import type { FC } from 'react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { databaseApi } from '@/lib/api/databaseApi'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Database,
  Search,
  RefreshCw,
  Table as TableIcon,
  Columns,
  Rows,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'

export const DatabaseExplorerPage: FC = () => {
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary shadow-xs">
              <Database className="h-4.5 w-4.5" />
            </div>
            <span>Database Schema Explorer</span>
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 gap-2 shadow-xs border-border/80 bg-card hover:bg-muted/70 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
            <span>Refresh Schema</span>
          </Button>
        </div>
      </div>

      {/* Search Bar & Table Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter database tables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs border-border/80 bg-card/60 focus:bg-card"
          />
        </div>

        <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>{tables.length} managed {tables.length === 1 ? 'table' : 'tables'} discovered</span>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, idx) => (
            <Card key={idx} className="border-border/80 bg-card">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))
        ) : filteredTables.length === 0 ? (
          <div className="col-span-full py-16 text-center rounded-2xl border border-dashed border-border/80 bg-card/40">
            <Database className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No tables found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {searchTerm ? 'No tables match your search query.' : 'No database tables available to explore.'}
            </p>
          </div>
        ) : (
          filteredTables.map((tbl) => (
            <Link
              key={tbl.name}
              to={`/database/${tbl.name}`}
              className="group block"
            >
              <Card className="h-full border-border/80 bg-card transition-all duration-200 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-mono font-bold text-foreground group-hover:text-primary flex items-center gap-2 transition-colors">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary/20 transition-colors">
                        <TableIcon className="h-3.5 w-3.5" />
                      </div>
                      <span className="truncate">{tbl.name}</span>
                    </CardTitle>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-all duration-200 group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                  <CardDescription className="text-[11px] text-muted-foreground">
                    PostgreSQL System Table
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Rows className="h-3.5 w-3.5" />
                      <span>Rows:</span>
                    </span>
                    <span className="font-mono font-bold tabular-nums px-2 py-0.5 rounded-md bg-muted/80 border border-border/80 text-foreground text-[11px]">
                      {tbl.rowCount.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Columns className="h-3.5 w-3.5" />
                      <span>Columns:</span>
                    </span>
                    <span className="font-mono text-muted-foreground text-[11px]">
                      {(tbl.columns || []).length} cols
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-2 border-t border-border/60">
                    {(tbl.columns || []).slice(0, 4).map((col) => (
                      <span
                        key={col.column_name}
                        className="rounded-md bg-muted/70 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground border border-border/60"
                      >
                        {col.column_name}
                      </span>
                    ))}
                    {(tbl.columns || []).length > 4 && (
                      <span className="font-mono text-[10px] text-muted-foreground/70 px-1 py-0.5">
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

