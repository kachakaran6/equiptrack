import type { FC } from 'react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { backupApi } from '@/lib/api/backupApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusPill } from '@/components/ui/status-pill'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Send,
  ArrowLeft,
  KeyRound,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Shield,
  HelpCircle,
} from 'lucide-react'

export const TelegramConfigPage: FC = () => {
  const queryClient = useQueryClient()
  const [isUpdateOpen, setIsUpdateOpen] = useState(false)
  const [botToken, setBotToken] = useState('')
  const [chatId, setChatId] = useState('')
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const { data: config, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['backupConfig'],
    queryFn: () => backupApi.getConfig(),
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      backupApi.updateTelegram({
        telegram_bot_token: botToken.trim() || undefined,
        telegram_chat_id: chatId.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backupConfig'] })
      setIsUpdateOpen(false)
      setBotToken('')
      setChatId('')
      setSuccessMsg('Telegram credentials updated and verified successfully.')
      setTimeout(() => setSuccessMsg(null), 4000)
    },
    onError: (err: Error) => setErrorMsg(err.message),
  })

  const testMutation = useMutation({
    mutationFn: () => backupApi.testTelegram(),
    onSuccess: (res) => {
      setTestResult({ success: true, message: res.message || 'Telegram test message sent successfully!' })
    },
    onError: (err: Error) => {
      setTestResult({ success: false, message: err.message })
    },
  })

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
            <span>Telegram Channel Configuration</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Connect a Telegram Bot to deliver database snapshots directly to your channel or chat
          </p>
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

          <Button
            size="sm"
            onClick={() => {
              setErrorMsg(null)
              setIsUpdateOpen(true)
            }}
            className="h-9 gap-2 shadow-xs"
          >
            <KeyRound className="h-4 w-4" />
            <span>Change Credentials</span>
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {testResult && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border p-4 text-xs ${
            testResult.success
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400'
          }`}
        >
          {testResult.success ? (
            <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-medium">
            <span className="font-semibold">{testResult.success ? 'Success: ' : 'Failed: '}</span>
            <span>{testResult.message}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTestResult(null)}
            className="h-6 text-xs px-2"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Status Details */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-3 border-b border-border/80">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Current Configuration
              </CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs font-mono">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between font-sans">
                  <span className="text-muted-foreground">Integration Status:</span>
                  <StatusPill
                    variant={config?.telegram_configured ? 'success' : 'danger'}
                    label={config?.telegram_configured ? 'Configured & Ready' : 'Not Configured'}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans">Bot Token:</span>
                  <span className="text-foreground font-medium">
                    {config?.telegram_configured ? '••••••••••••••••••••' : 'Not set'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans">Destination Chat ID:</span>
                  <span className="text-foreground font-medium">
                    {config?.telegram_chat_id_masked || 'Not set'}
                  </span>
                </div>

                <div className="pt-3 border-t border-border/60 font-sans">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!config?.telegram_configured || testMutation.isPending}
                    onClick={() => testMutation.mutate()}
                    className="w-full h-9 text-xs shadow-xs"
                  >
                    {testMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Sending Test Message...</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Send className="h-3.5 w-3.5" />
                        <span>Send Live Test Notification</span>
                      </span>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Security & Setup Guidelines */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-3 border-b border-border/80">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Security &amp; Setup Guide
              </CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs leading-relaxed text-muted-foreground">
            <p>
              Telegram credentials are encrypted and stored safely in backend environment storage. The raw bot token is never transmitted back to client browsers after initial input.
            </p>
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2 font-mono text-[11px]">
              <div className="text-foreground font-semibold font-sans flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-indigo-500" />
                <span>How to obtain chat credentials:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground font-sans text-xs">
                <li>Create a bot with <strong className="text-foreground">@BotFather</strong> on Telegram.</li>
                <li>Copy the HTTP API token provided.</li>
                <li>Add your bot as administrator to your target channel or group.</li>
                <li>Enter the numeric Chat ID (e.g. -1004449055995).</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change Credentials Dialog */}
      <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Telegram Bot</DialogTitle>
            <DialogDescription>
              Enter the bot token and recipient chat ID for automated backup delivery.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="bot-token" className="text-xs font-medium">Telegram Bot Token *</Label>
              <Input
                id="bot-token"
                type="password"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="e.g. 8543528216:AAGanxPI2pkdiAH4U1g4MVl7avVjNVe5dfc"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="chat-id" className="text-xs font-medium">Telegram Chat ID *</Label>
              <Input
                id="chat-id"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="e.g. -1004449055995"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={(!botToken && !chatId) || updateMutation.isPending}
              onClick={() => updateMutation.mutate()}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Credentials'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
