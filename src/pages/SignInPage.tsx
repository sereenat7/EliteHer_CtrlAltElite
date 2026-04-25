import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { assertEnv } from '../lib/env'
import { supabase } from '../lib/supabase'

export function SignInPage() {
  const navigate = useNavigate()
  const missing = useMemo(() => assertEnv(), [])
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const disabled = missing.length > 0 || busy

  async function submit() {
    setError(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error: e } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (e) throw e
      } else {
        const { error: e } = await supabase.auth.signUp({ email, password })
        if (e) throw e
      }
      navigate('/', { replace: true })
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-app flex h-full items-center justify-center px-4 text-zinc-100">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <div className="text-2xl font-bold tracking-tight">Saaya</div>
          <div className="text-sm text-zinc-400">
            Protecting you without you even noticing.
          </div>
        </div>

        {missing.length ? (
          <Card className="border-red-500/30 bg-red-500/10">
            <CardTitle>Missing configuration</CardTitle>
            <CardDescription className="mt-1">
              Set these environment variables in <code>.env</code>:
              <div className="mt-2 space-y-1 font-mono text-xs text-zinc-200">
                {missing.map((m) => (
                  <div key={m}>{m}</div>
                ))}
              </div>
            </CardDescription>
          </Card>
        ) : null}

        <Card>
          <CardTitle>{mode === 'signin' ? 'Sign in' : 'Create account'}</CardTitle>
          <CardDescription className="mt-1">
            Use email + password (Supabase Auth).
          </CardDescription>

          <div className="mt-4 space-y-3">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoCapitalize="none"
              autoCorrect="off"
              inputMode="email"
            />
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
            />
            {error ? <div className="text-sm text-red-300">{error}</div> : null}
            <Button
              disabled={disabled || !email || !password}
              onClick={submit}
              className="w-full"
            >
              {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
            </Button>

            <button
              className="w-full text-sm text-zinc-400 underline underline-offset-4"
              onClick={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))}
              type="button"
            >
              {mode === 'signin'
                ? 'Need an account? Sign up'
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}

