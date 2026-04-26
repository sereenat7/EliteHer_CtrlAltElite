import { ArrowLeft, Phone, Plus, Trash2, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { addDemoContact, getDemoContacts, removeDemoContact } from '../lib/demoData'
import { supabase } from '../lib/supabase'

type Contact = {
  id: string
  name: string
  phone: string
  relationship: string | null
  created_at: string
}

export function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [relationship, setRelationship] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh() {
    const { data, error } = await supabase
      .from('contacts')
      .select('id,name,phone,relationship,created_at')
      .order('created_at', { ascending: false })
    if (!error && data && data.length) {
      setContacts(data as Contact[])
      return
    }
    setContacts(getDemoContacts())
  }

  useEffect(() => {
    refresh()
    const channel = supabase
      .channel('contacts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, refresh)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function add() {
    setBusy(true)
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        relationship: relationship.trim() ? relationship.trim() : null,
      }
      const { error } = await supabase.from('contacts').insert(payload)
      if (error) addDemoContact(payload)
      setName('')
      setPhone('')
      setRelationship('')
      setOpen(false)
      refresh()
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) removeDemoContact(id)
    refresh()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Link to="/settings" className="inline-flex items-center gap-2 text-sm text-zinc-300">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setOpen(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add
        </Button>
      </div>

      <Card>
        <CardTitle>Trusted contacts</CardTitle>
        <CardDescription className="mt-1">
          These contacts can receive SOS escalation when you wire a provider (Twilio/FCM).
        </CardDescription>
      </Card>

      <div className="space-y-2">
        {contacts.length ? (
          contacts.map((c) => (
            <Card key={c.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <User className="h-4 w-4 text-zinc-300" />
                    <span className="truncate">{c.name}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{c.phone}</span>
                    {c.relationship ? <span>• {c.relationship}</span> : null}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(c.id)}
                  leftIcon={<Trash2 className="h-4 w-4" />}
                >
                  Remove
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-3">
            <div className="text-sm text-zinc-400">No contacts yet.</div>
          </Card>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add contact">
        <div className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (E.164 recommended, e.g. +14155552671)"
          />
          <Input
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder="Relationship (optional)"
          />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={add}
              disabled={busy || !name.trim() || !phone.trim()}
            >
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

