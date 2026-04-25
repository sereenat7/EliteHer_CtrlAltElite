import { BarChart3, BrainCircuit, EyeOff, LogOut, Users, WifiOff } from 'lucide-react'
import { useAuth } from '../app/auth/AuthProvider'
import { Button } from '../components/ui/Button'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { SectionLink } from '../components/ui/SectionLink'

export function SettingsPage() {
  const { session, signOut } = useAuth()

  return (
    <div className="space-y-3">
      <Card>
        <CardTitle>Settings</CardTitle>
        <CardDescription className="mt-1">
          Signed in as <span className="text-zinc-200">{session?.user.email}</span>
        </CardDescription>
      </Card>

      <div className="space-y-2">
        <SectionLink
          to="/contacts"
          title="Trusted contacts"
          description="For SOS escalation and live location"
          left={<Users className="h-5 w-5 text-zinc-200" />}
        />
        <SectionLink
          to="/ai-detection"
          title="AI danger detection"
          description="Step deviation, party movement, sensitivity"
          left={<BrainCircuit className="h-5 w-5 text-zinc-200" />}
        />
        <SectionLink
          to="/hidden-mode"
          title="Hidden mode"
          description="Stealth UI + silent triggers"
          left={<EyeOff className="h-5 w-5 text-zinc-200" />}
        />
        <SectionLink
          to="/offline-queue"
          title="Offline mode"
          description="Queue, sync status, retry"
          left={<WifiOff className="h-5 w-5 text-zinc-200" />}
        />
        <SectionLink
          to="/ecosystem"
          title="Ecosystem dashboard"
          description="Aggregated safety data for NGOs/Admin"
          left={<BarChart3 className="h-5 w-5 text-zinc-200" />}
        />
      </div>

      <Card className="space-y-3">
        <CardTitle>Safety defaults</CardTitle>
        <CardDescription>
          This v1 app implements the full flow and database writes; external SMS/calls are
          pluggable via backend configuration.
        </CardDescription>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" disabled>
            Hidden mode
          </Button>
          <Button variant="secondary" disabled>
            Offline queue
          </Button>
        </div>
      </Card>

      <Button
        variant="secondary"
        className="w-full"
        onClick={signOut}
        leftIcon={<LogOut className="h-4 w-4" />}
      >
        Sign out
      </Button>
    </div>
  )
}
