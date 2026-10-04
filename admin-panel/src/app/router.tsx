import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AdminLayout } from '@/layouts/AdminLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { UsersPage } from '@/features/users/UsersPage'
import { UserDetailPage } from '@/features/users/UserDetailPage'
import { MachinesPage } from '@/features/machines/MachinesPage'
import { SectionsPage } from '@/features/sections/SectionsPage'
import { UsageRecordsPage } from '@/features/usage-records/UsageRecordsPage'
import { ErrorsPage } from '@/features/errors/ErrorsPage'
import { AuditLogsPage } from '@/features/audit/AuditLogsPage'
import { DatabaseExplorerPage } from '@/features/database/DatabaseExplorerPage'
import { TableViewerPage } from '@/features/database/TableViewerPage'
import { BackupsPage } from '@/features/backups/BackupsPage'
import { TelegramConfigPage } from '@/features/backups/TelegramConfigPage'
import { BackupSchedulePage } from '@/features/backups/BackupSchedulePage'
import { BackupHistoryPage } from '@/features/backups/BackupHistoryPage'
import { SystemPage } from '@/features/system/SystemPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* Public / Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Protected Admin routes */}
        <Route element={<AdminLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/users/:id" element={<UserDetailPage />} />
          <Route path="/machines" element={<MachinesPage />} />
          <Route path="/sections" element={<SectionsPage />} />
          <Route path="/usage-records" element={<UsageRecordsPage />} />
          <Route path="/errors" element={<ErrorsPage />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
          <Route path="/database" element={<DatabaseExplorerPage />} />
          <Route path="/database/:table" element={<TableViewerPage />} />
          <Route path="/backups" element={<BackupsPage />} />
          <Route path="/backups/telegram" element={<TelegramConfigPage />} />
          <Route path="/backups/schedule" element={<BackupSchedulePage />} />
          <Route path="/backups/history" element={<BackupHistoryPage />} />
          <Route path="/system" element={<SystemPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
