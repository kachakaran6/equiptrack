import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { backupApi } from '@/lib/api/backupApi'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
} from 'lucide-react'

export const TelegramConfigPage: React.FC = () => {
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
      backupApi.updateConfig({
        telegram_bot_token: botToken || undefined,
        telegram_chat_id: chatId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backupConfig'] })
      setIsUpdateOpen(false)
      setBotToken('')
      setChatId('')
      setSuccessMsg('Telegram credentials updated successfully.')
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
              <Send className="h-5 w-5 text-zinc-400" />
              Telegram Channel Configuration
            </h1>
            <p className="text-xs text-zinc-400">
              Connect a Telegram Bot to deliver database snapshots directly to your phone / channel
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

          <Button
            size="sm"
            onClick={() => {
              setErrorMsg(null)
              setIsUpdateOpen(true)
            }}
            className="h-8 gap-1.5 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 text-xs font-medium"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Change Credentials
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded border border-emerald-900/60 bg-emerald-950/30 p-3 text-xs text-emerald-300">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {testResult && (
        <div
          className={`flex items-start gap-2 rounded border p-3 text-xs ${
            testResult.success
              ? 'border-emerald-900/60 bg-emerald-950/30 text-emerald-300'
              : 'border-red-900/60 bg-red-950/30 text-red-300'
          }`}
        >
          {testResult.success ? (
            <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <span className="font-semibold">{testResult.success ? 'Success: ' : 'Failed: '}</span>
            <span>{testResult.message}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTestResult(null)}
            className="h-5 text-[10px] px-1.5"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Status Details */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-950/60">
          <CardHeader className="pb-3 border-b border-zinc-800">
            <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase">
              Current Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs font-mono">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Integration Status:</span>
                  <Badge variant={config?.telegram_configured ? 'success' : 'destructive'}>
                    {config?.telegram_configured ? 'Configured & Ready' : 'Not Configured'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Bot Token:</span>
                  <span className="text-zinc-300">
                    {config?.telegram_configured ? '••••••••••••••••••••' : 'Not set'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Destination Chat ID:</span>
                  <span className="text-zinc-300">
                    {config?.telegram_chat_id_masked || 'Not set'}
                  </span>
                </div>

                <div className="pt-2 border-t border-zinc-900">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!config?.telegram_configured || testMutation.isPending}
                    onClick={() => testMutation.mutate()}
                    className="w-full h-8 text-xs border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800"
                  >
                    {testMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
                        Sending Test Message...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Send className="h-3.5 w-3.5" />
                        Send Live Test Notification
                      </span>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Security & Setup Guidelines */}
        <Card className="border-zinc-800 bg-zinc-950/60">
          <CardHeader className="pb-3 border-b border-zinc-800">
            <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase">
              Security Protocol
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs leading-relaxed text-zinc-400 font-sans">
            <p>
              Telegram credentials are encrypted and stored safely on the backend. The raw bot token is never exposed to the client browser after initial submission.
            </p>
            <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3 space-y-1 font-mono text-[11px]">
              <div className="text-zinc-200 font-semibold">How to obtain chat credentials:</div>
              <ol className="list-decimal list-inside space-y-0.5 text-zinc-400">
                <li>Create a bot with @BotFather on Telegram.</li>
                <li>Copy the API token provided.</li>
                <li>Add your bot to your target channel or group.</li>
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
            <div className="rounded border border-red-900/60 bg-red-950/30 p-2.5 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="bot-token">Telegram Bot Token *</Label>
              <Input
                id="bot-token"
                type="password"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="8543528216:AAGanxPI2pkdiAH4U1g4MVl7avVjNVe5dfc"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="chat-id">Telegram Chat ID *</Label>
              <Input
                id="chat-id"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="-1004449055995"
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
