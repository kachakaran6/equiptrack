import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth/AuthContext'
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
  ExternalLink,
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
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

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
    title: 'Database',
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
    title: 'System',
    items: [
      { label: 'System Health', to: '/system', icon: Activity },
    ],
  },
  {
    title: 'Backups',
    items: [
      { label: 'Overview & Run', to: '/backups', icon: HardDriveDownload },
      { label: 'Telegram Config', to: '/backups/telegram', icon: Send },
      { label: 'Schedule', to: '/backups/schedule', icon: CalendarClock },
      { label: 'Backup History', to: '/backups/history', icon: History },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
]

export const AdminLayout: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

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
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-200" />
          <p className="font-mono text-xs text-zinc-500">Connecting to EquipTrack Node...</p>
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
            <div className="px-3 text-[10px] font-mono font-medium tracking-wider text-zinc-400 uppercase">
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
                    'flex items-center gap-2.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors select-none',
                    isActive
                      ? 'bg-zinc-800/90 text-zinc-100 font-semibold border border-zinc-700/60'
                      : 'text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200 border border-transparent'
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto rounded bg-zinc-800 px-1 py-0.2 text-[9px] font-mono text-zinc-400">
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

  return (
    <div className="flex min-h-screen bg-black text-zinc-100 font-sans antialiased">
      {/* Desktop Sidebar */}
      <aside className="hidden w-56 flex-col border-r border-zinc-800/80 bg-zinc-950/90 md:flex">
        {/* Brand */}
        <div className="flex h-12 items-center justify-between border-b border-zinc-800/80 px-4">
          <NavLink to="/" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded border border-zinc-700 bg-zinc-900 font-mono text-xs font-bold text-zinc-100">
              ET
            </div>
            <span className="text-xs font-semibold tracking-tight text-zinc-200">
              EquipTrack <span className="font-mono text-[10px] text-zinc-500 font-normal">ADMIN</span>
            </span>
          </NavLink>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-2 py-4">
          {renderNavLinks()}
        </div>

        {/* User Footer */}
        <div className="border-t border-zinc-800/80 p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-md p-2 text-left text-xs transition-colors hover:bg-zinc-900 cursor-pointer">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-mono text-zinc-200 font-medium">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
                </div>
                <div className="flex-1 truncate">
                  <div className="truncate font-medium text-zinc-200">{user?.name || 'Administrator'}</div>
                  <div className="truncate font-mono text-[10px] text-zinc-500">{user?.email}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <div className="px-2 pb-1.5 font-mono text-[10px] text-zinc-400 truncate">
                Role: {user?.role}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-3.5 w-3.5" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="text-red-400 focus:text-red-300">
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="flex h-12 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/60 px-4">
          <div className="flex items-center gap-2">
            {/* Mobile Sheet Trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-4 bg-zinc-950 border-r border-zinc-800">
                <div className="mb-6 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded border border-zinc-700 bg-zinc-900 font-mono text-xs font-bold">
                    ET
                  </div>
                  <span className="text-xs font-semibold">EquipTrack Control</span>
                </div>
                <div className="overflow-y-auto max-h-[calc(100vh-6rem)]">
                  {renderNavLinks()}
                </div>
              </SheetContent>
            </Sheet>

            {/* Quick Breadcrumb/Location */}
            <div className="font-mono text-xs text-zinc-400 hidden sm:flex items-center gap-1.5">
              <span>console</span>
              <span>/</span>
              <span className="text-zinc-200 font-medium">
                {location.pathname.replace('/', '') || 'overview'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Command button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommandOpen(true)}
              className="h-7 gap-2 px-2 text-[11px] text-zinc-400 hover:text-zinc-200 border-zinc-800 bg-zinc-900/50"
            >
              <Search className="h-3 w-3" />
              <span className="hidden sm:inline">Search console...</span>
              <kbd className="pointer-events-none hidden h-4 select-none items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-1 font-mono text-[9px] font-medium text-zinc-400 sm:flex">
                ⌘K
              </kbd>
            </Button>

            {/* Node Status indicator */}
            <div className="flex items-center gap-1.5 rounded border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-[11px] font-mono text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden md:inline">NODE ACTIVE</span>
            </div>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto bg-black p-4 md:p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Command Dialog */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Type a command or navigate..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => { navigate('/'); setCommandOpen(false) }}>
              <LayoutDashboard className="mr-2 h-3.5 w-3.5" /> Overview
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/database'); setCommandOpen(false) }}>
              <Database className="mr-2 h-3.5 w-3.5" /> Database Tables
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/users'); setCommandOpen(false) }}>
              <Users className="mr-2 h-3.5 w-3.5" /> Users Management
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/machines'); setCommandOpen(false) }}>
              <Cpu className="mr-2 h-3.5 w-3.5" /> Machines
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/sections'); setCommandOpen(false) }}>
              <Layers className="mr-2 h-3.5 w-3.5" /> Sections
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/usage-records'); setCommandOpen(false) }}>
              <FileSpreadsheet className="mr-2 h-3.5 w-3.5" /> Usage Records
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/errors'); setCommandOpen(false) }}>
              <AlertOctagon className="mr-2 h-3.5 w-3.5" /> Error Logs
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/audit-logs'); setCommandOpen(false) }}>
              <ShieldCheck className="mr-2 h-3.5 w-3.5" /> Audit Logs
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/backups'); setCommandOpen(false) }}>
              <HardDriveDownload className="mr-2 h-3.5 w-3.5" /> Backups
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/system'); setCommandOpen(false) }}>
              <Activity className="mr-2 h-3.5 w-3.5" /> System Diagnostics
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  )
}
