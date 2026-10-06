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
  Shield,
  Sun,
  Moon,
  Laptop,
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
    title: 'INVENTORY',
    items: [
      { label: 'Products & Stock', to: '/inventory/products', icon: Boxes },
      { label: 'Stock Reports', to: '/inventory/reports', icon: ClipboardList },
    ],
  },
  {
    title: 'DATABASE',
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
    title: 'SYSTEM',
    items: [
      { label: 'System Health', to: '/system', icon: Activity },
    ],
  },
  {
    title: 'BACKUPS',
    items: [
      { label: 'Overview & Run', to: '/backups', icon: HardDriveDownload },
      { label: 'Telegram Config', to: '/backups/telegram', icon: Send },
      { label: 'Schedule', to: '/backups/schedule', icon: CalendarClock },
      { label: 'Backup History', to: '/backups/history', icon: History },
    ],
  },
  {
    title: 'PREFERENCES',
    items: [
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
]

export const AdminLayout: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const { setTheme } = useTheme()
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
            <div className="px-3 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
              {section.title}
            </div>
          )}
          <div className="space-y-0.5">
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
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all select-none',
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold shadow-xs'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {item.badge}
                    </span>
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
      <aside className="hidden md:flex w-60 shrink-0 flex-col h-full border-r border-border/70 bg-card select-none z-20 transition-colors">
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/70 px-4">
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-xs transition-transform group-hover:scale-105">
              ET
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-1.5">
                EquipTrack
                <span className="rounded bg-primary/15 px-1.5 py-0.2 text-[10px] font-semibold text-primary uppercase">
                  ADMIN
                </span>
              </span>
              <span className="text-[11px] text-muted-foreground">Control Console</span>
            </div>
          </NavLink>
        </div>

        {/* Navigation list */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4">
          {renderNavLinks()}
        </div>

        {/* User Footer with Profile & Theme Controls */}
        <div className="shrink-0 border-t border-border/70 p-3 bg-muted/20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left text-sm transition-all hover:bg-muted/80 cursor-pointer border border-transparent hover:border-border/60">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-semibold shrink-0">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
                </div>
                <div className="flex-1 min-w-0 truncate">
                  <div className="truncate font-medium text-foreground text-xs leading-tight">
                    {user?.name || 'Administrator'}
                  </div>
                  <div className="truncate font-mono text-[10px] text-muted-foreground">
                    {user?.email || 'admin@equiptrack'}
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5">
              <DropdownMenuLabel className="font-normal px-2 py-1.5">
                <div className="flex flex-col space-y-1">
                  <p className="text-xs font-semibold leading-none">{user?.name || 'Administrator'}</p>
                  <p className="text-[11px] font-mono leading-none text-muted-foreground truncate">{user?.email}</p>
                  <div className="pt-1">
                    <StatusPill variant="info" size="sm" label={`Role: ${user?.role || 'admin'}`} />
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground px-2 py-1 uppercase">
                Theme
              </DropdownMenuLabel>
              <div className="grid grid-cols-3 gap-1 px-1 py-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTheme('light')}
                  className="h-7 text-xs justify-center gap-1 px-2 hover:bg-muted"
                >
                  <Sun className="h-3.5 w-3.5 text-amber-500" /> Light
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTheme('dark')}
                  className="h-7 text-xs justify-center gap-1 px-2 hover:bg-muted"
                >
                  <Moon className="h-3.5 w-3.5 text-indigo-400" /> Dark
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTheme('system')}
                  className="h-7 text-xs justify-center gap-1 px-2 hover:bg-muted"
                >
                  <Laptop className="h-3.5 w-3.5 text-muted-foreground" /> Auto
                </Button>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-rose-500 focus:text-rose-600 focus:bg-rose-500/10 cursor-pointer">
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
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/70 bg-card/80 backdrop-blur-md px-4 md:px-6 z-10 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Sheet Trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-4 bg-card border-r border-border">
                <div className="mb-6 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold text-xs">
                    ET
                  </div>
                  <div>
                    <div className="text-sm font-semibold">EquipTrack</div>
                    <div className="text-[11px] text-muted-foreground">Admin Console</div>
                  </div>
                </div>
                <div className="overflow-y-auto max-h-[calc(100vh-6rem)]">
                  {renderNavLinks()}
                </div>
              </SheetContent>
            </Sheet>

            {/* Clean Breadcrumb Navigation */}
            <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground truncate">
              <span className="hover:text-foreground transition-colors cursor-pointer" onClick={() => navigate('/')}>
                Console
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              <span className="font-semibold text-foreground truncate">
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
              className="h-8.5 gap-2 px-3 text-xs text-muted-foreground hover:text-foreground border-border/80 bg-background/50 hover:bg-muted/50 rounded-lg shadow-xs"
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

            {/* Quick Theme Switcher */}
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
              <Boxes className="mr-2 h-4 w-4 text-primary" /> Inventory Products & Stock
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
              <Layers className="mr-2 h-4 w-4 text-primary" /> Machine Sections & Components
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/usage-records'); setCommandOpen(false) }} className="cursor-pointer">
              <FileSpreadsheet className="mr-2 h-4 w-4 text-primary" /> Usage Records
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/errors'); setCommandOpen(false) }} className="cursor-pointer">
              <AlertOctagon className="mr-2 h-4 w-4 text-rose-500" /> Error Logs & Observability
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/audit-logs'); setCommandOpen(false) }} className="cursor-pointer">
              <ShieldCheck className="mr-2 h-4 w-4 text-primary" /> Audit Trail & System Logs
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/backups'); setCommandOpen(false) }} className="cursor-pointer">
              <HardDriveDownload className="mr-2 h-4 w-4 text-primary" /> Database Backups
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/system'); setCommandOpen(false) }} className="cursor-pointer">
              <Activity className="mr-2 h-4 w-4 text-primary" /> System Health Diagnostics
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/settings'); setCommandOpen(false) }} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4 text-primary" /> Admin Preferences & Settings
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  )
}
