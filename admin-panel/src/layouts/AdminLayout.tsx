import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { apiRequest } from '@/lib/api/apiClient'
import {
  LayoutDashboard,
  Database,
  Users,
  Cpu,
  Layers,
  FileSpreadsheet,
  AlertOctagon,
  ShieldCheck,
  Activity,
  HardDriveDownload,
  Send,
  CalendarClock,
  History,
  Settings,
  Menu,
  LogOut,
  Search,
  Boxes,
  ClipboardList,
  ChevronRight,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  Sparkles,
  Command,
  ChevronsUpDown,
  Radio,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { StatusPill } from '@/components/ui/status-pill'
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/theme/ThemeContext'

interface NavSection {
  title?: string
  items: {
    label: string
    to: string
    icon: React.ComponentType<{ className?: string }>
    badge?: string
  }[]
}

const navSections: NavSection[] = [
  {
    items: [
      { label: 'Overview', to: '/', icon: LayoutDashboard },
    ],
  },
  {
    title: 'INVENTORY & ASSETS',
    items: [
      { label: 'Products & Stock', to: '/inventory/products', icon: Boxes },
      { label: 'Stock Reports', to: '/inventory/reports', icon: ClipboardList },
    ],
  },
  {
    title: 'DATABASE & DATASETS',
    items: [
      { label: 'Tables Explorer', to: '/database', icon: Database },
      { label: 'Users', to: '/users', icon: Users },
      { label: 'Machines', to: '/machines', icon: Cpu },
      { label: 'Sections', to: '/sections', icon: Layers },
      { label: 'Usage Records', to: '/usage-records', icon: FileSpreadsheet },
      { label: 'Error Logs', to: '/errors', icon: AlertOctagon },
      { label: 'Audit Logs', to: '/audit-logs', icon: ShieldCheck },
    ],
  },
  {
    title: 'SYSTEM & CLOUD',
    items: [
      { label: 'System Health', to: '/system', icon: Activity },
    ],
  },
  {
    title: 'DATA BACKUPS',
    items: [
      { label: 'Overview & Run', to: '/backups', icon: HardDriveDownload },
      { label: 'Telegram Config', to: '/backups/telegram', icon: Send },
      { label: 'Schedule', to: '/backups/schedule', icon: CalendarClock },
      { label: 'Backup History', to: '/backups/history', icon: History },
    ],
  },
  {
    title: 'CONFIGURATION',
    items: [
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
]

export const AdminLayout: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Real backend / database health poll
  const { data: healthData } = useQuery({
    queryKey: ['nodeHealth'],
    queryFn: async () => {
      return apiRequest<{ status: string; database: string }>('/health')
    },
    refetchInterval: 15000,
    retry: 1,
  })

  // Cmd+K / Ctrl+K listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <p className="text-sm font-medium text-muted-foreground">Connecting to EquipTrack Node...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const renderNavLinks = () => (
    <div className="flex flex-col space-y-6">
      {navSections.map((section, idx) => (
        <div key={idx} className="space-y-1">
          {section.title && (
            <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-muted-foreground/70 uppercase">
              {section.title}
            </div>
          )}
          <div className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.icon
              const isActive =
                item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.to)

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150 select-none',
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold shadow-xs border border-primary/20 dark:bg-primary/15'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground border border-transparent'
                  )}
                >
                  {/* Left Active Glow Pill */}
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary shadow-xs" />
                  )}

                  <div
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-all duration-150',
                      isActive
                        ? 'bg-primary/15 text-primary shadow-xs'
                        : 'text-muted-foreground group-hover:text-foreground group-hover:bg-muted'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <span className="truncate flex-1">{item.label}</span>

                  {item.badge && (
                    <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground border border-border/80">
                      {item.badge}
                    </span>
                  )}

                  {isActive && (
                    <ChevronRight className="h-3 w-3 text-primary/70 shrink-0" />
                  )}
                </NavLink>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )

  // Generate breadcrumb path
  const pathSegments = location.pathname.split('/').filter(Boolean)
  const currentTitle =
    pathSegments.length === 0
      ? 'Overview'
      : pathSegments
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' '))
          .join(' / ')

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans antialiased">
      {/* Desktop Sidebar (Fixed Full Height) */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col h-full border-r border-border/80 bg-sidebar select-none z-20 transition-colors">
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/80 px-4">
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white font-bold text-xs shadow-md shadow-indigo-500/25 transition-transform group-hover:scale-105">
              ET
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-foreground">
                  EquipTrack
                </span>
                <span className="rounded-full bg-primary/15 px-1.5 py-0.2 text-[9px] font-bold text-primary tracking-wider uppercase border border-primary/20">
                  PRO
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Control Console</span>
              </div>
            </div>
          </NavLink>
        </div>

        {/* Quick Search trigger in Sidebar */}
        <div className="px-3 pt-3 pb-1">
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-border/80 bg-background/50 hover:bg-muted/70 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">Quick search...</span>
            </div>
            <kbd className="pointer-events-none rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground border border-border/70">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
          {renderNavLinks()}

          {/* Mini System Health Widget in Sidebar */}
          <div className="mt-6 mb-2 rounded-xl border border-border/80 bg-card/60 p-3 shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1">
                <Radio className="h-3 w-3 text-emerald-500" />
                Node Service
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground text-[11px]">
                {healthData?.database === 'connected' ? 'PostgreSQL Active' : 'Connecting...'}
              </span>
              <NavLink
                to="/system"
                className="text-[10px] text-primary hover:underline font-medium"
              >
                Health &rarr;
              </NavLink>
            </div>
          </div>
        </div>

        {/* Sidebar Footer with Theme Switcher & User Profile */}
        <div className="shrink-0 border-t border-border/80 p-3 bg-muted/20 space-y-2.5">
          {/* Quick 1-Click Segmented Theme Toggle */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold tracking-wider text-muted-foreground/70 uppercase px-1">
              Appearance
            </div>
            <ThemeToggle variant="segmented" />
          </div>

          {/* User Profile Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left text-sm transition-all hover:bg-muted/80 cursor-pointer border border-transparent hover:border-border/80 group">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 text-white text-xs font-bold shadow-xs shrink-0 ring-1 ring-border">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                </div>
                <div className="flex-1 min-w-0 truncate">
                  <div className="truncate font-semibold text-foreground text-xs leading-tight group-hover:text-primary transition-colors">
                    {user?.name || 'Administrator'}
                  </div>
                  <div className="truncate font-mono text-[10px] text-muted-foreground">
                    {user?.email || 'admin@equiptrack'}
                  </div>
                </div>
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg border-border">
              <DropdownMenuLabel className="font-normal px-2 py-1.5">
                <div className="flex flex-col space-y-1">
                  <p className="text-xs font-bold leading-none text-foreground">{user?.name || 'Administrator'}</p>
                  <p className="text-[11px] font-mono leading-none text-muted-foreground truncate">{user?.email}</p>
                  <div className="pt-1">
                    <StatusPill variant="info" size="sm" label={`Role: ${user?.role || 'admin'}`} />
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer text-xs">
                <Settings className="mr-2 h-4 w-4 text-primary" />
                Settings &amp; Preferences
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/system')} className="cursor-pointer text-xs">
                <Activity className="mr-2 h-4 w-4 text-emerald-500" />
                System Health
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:bg-rose-500/10 cursor-pointer text-xs font-medium"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        {/* Top Navbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/80 bg-card/85 backdrop-blur-md px-4 md:px-6 z-10 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Sheet Trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-4 bg-sidebar border-r border-border flex flex-col justify-between">
                <div>
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white font-bold text-xs shadow-md">
                      ET
                    </div>
                    <div>
                      <div className="text-sm font-bold">EquipTrack</div>
                      <div className="text-[11px] text-muted-foreground">Admin Console</div>
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-[calc(100vh-14rem)]">
                    {renderNavLinks()}
                  </div>
                </div>

                <div className="pt-4 border-t border-border space-y-3">
                  <ThemeToggle variant="segmented" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={logout}
                    className="w-full text-rose-600 border-rose-500/20 hover:bg-rose-500/10 text-xs"
                  >
                    <LogOut className="mr-2 h-3.5 w-3.5" /> Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Clean Breadcrumb Navigation */}
            <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground truncate">
              <span
                className="hover:text-foreground transition-colors cursor-pointer flex items-center gap-1 font-medium"
                onClick={() => navigate('/')}
              >
                Console
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
              <span className="font-bold text-foreground truncate">
                {currentTitle}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Quick Command button (⌘K) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommandOpen(true)}
              className="h-8.5 gap-2 px-3 text-xs text-muted-foreground hover:text-foreground border-border/80 bg-background/60 hover:bg-muted/70 rounded-lg shadow-xs"
            >
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Search console...</span>
              <kbd className="pointer-events-none hidden select-none items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex border border-border/80">
                ⌘K
              </kbd>
            </Button>

            {/* Real Node / Database Status indicator with Pulse */}
            <div className="flex items-center">
              {healthData?.status === 'ok' && healthData.database === 'connected' ? (
                <StatusPill variant="connected" pulse label="API & DB Online" />
              ) : healthData?.database === 'disconnected' ? (
                <StatusPill variant="danger" label="DB Offline" />
              ) : (
                <StatusPill variant="warning" pulse label="Connecting..." />
              )}
            </div>

            {/* Quick Theme Switcher Button */}
            <ThemeToggle variant="button" />
          </div>
        </header>

        {/* Scrollable Main View Area */}
        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto bg-background p-4 sm:p-6 lg:p-8 transition-colors">
          <div className="mx-auto max-w-7xl w-full min-w-0 space-y-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Command Palette Dialog */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Type a command or navigate to screen..." />
        <CommandList className="max-h-80 p-1">
          <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
            No matching screens or commands found.
          </CommandEmpty>
          <CommandGroup heading="Quick Navigation">
            <CommandItem onSelect={() => { navigate('/'); setCommandOpen(false) }} className="cursor-pointer">
              <LayoutDashboard className="mr-2 h-4 w-4 text-primary" /> Overview Dashboard
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/inventory/products'); setCommandOpen(false) }} className="cursor-pointer">
              <Boxes className="mr-2 h-4 w-4 text-primary" /> Inventory Products &amp; Stock
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/inventory/reports'); setCommandOpen(false) }} className="cursor-pointer">
              <ClipboardList className="mr-2 h-4 w-4 text-primary" /> Stock Audit Reports
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/database'); setCommandOpen(false) }} className="cursor-pointer">
              <Database className="mr-2 h-4 w-4 text-primary" /> Database Tables Explorer
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/users'); setCommandOpen(false) }} className="cursor-pointer">
              <Users className="mr-2 h-4 w-4 text-primary" /> User Management
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/machines'); setCommandOpen(false) }} className="cursor-pointer">
              <Cpu className="mr-2 h-4 w-4 text-primary" /> Machinery Catalog
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/sections'); setCommandOpen(false) }} className="cursor-pointer">
              <Layers className="mr-2 h-4 w-4 text-primary" /> Machine Sections &amp; Components
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/usage-records'); setCommandOpen(false) }} className="cursor-pointer">
              <FileSpreadsheet className="mr-2 h-4 w-4 text-primary" /> Usage Records
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/errors'); setCommandOpen(false) }} className="cursor-pointer">
              <AlertOctagon className="mr-2 h-4 w-4 text-rose-500" /> Error Logs &amp; Observability
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/audit-logs'); setCommandOpen(false) }} className="cursor-pointer">
              <ShieldCheck className="mr-2 h-4 w-4 text-primary" /> Audit Trail &amp; System Logs
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/backups'); setCommandOpen(false) }} className="cursor-pointer">
              <HardDriveDownload className="mr-2 h-4 w-4 text-primary" /> Database Backups
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/system'); setCommandOpen(false) }} className="cursor-pointer">
              <Activity className="mr-2 h-4 w-4 text-primary" /> System Health Diagnostics
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/settings'); setCommandOpen(false) }} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4 text-primary" /> Admin Preferences &amp; Settings
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  )
}

