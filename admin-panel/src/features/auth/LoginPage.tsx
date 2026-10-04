import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Lock, Mail, ArrowRight } from 'lucide-react'

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const sessionExpired = searchParams.get('session') === 'expired'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Please enter both email and password.')
      return
    }

    setIsSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate('/')
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to authenticate. Please check credentials.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-zinc-800 bg-zinc-950/80 shadow-2xl">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-base text-zinc-100 font-semibold">Sign in to console</CardTitle>
        <CardDescription className="text-xs text-zinc-400">
          Enter administrator credentials to authenticate
        </CardDescription>
      </CardHeader>

      <CardContent>
        {sessionExpired && !error && (
          <div className="mb-4 flex items-center gap-2 rounded border border-amber-900/60 bg-amber-950/30 p-2.5 text-xs text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Session expired. Please sign in again.</span>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded border border-red-900/60 bg-red-950/30 p-2.5 text-xs text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Administrator Email</Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
              <Input
                id="email"
                type="email"
                placeholder="admin@equiptrack.internal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-8"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-8"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200 mt-2 font-medium"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
                Authenticating...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                Sign In
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
