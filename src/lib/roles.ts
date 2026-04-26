import { supabase } from './supabase'

export type AppRole = 'user' | 'ngo' | 'admin'

export async function getMyRole(): Promise<AppRole> {
  const { data, error } = await supabase.from('user_roles').select('role').limit(1).maybeSingle()
  if (error) return 'user'
  return (data?.role as AppRole | undefined) ?? 'user'
}

export function isModeratorRole(role: AppRole) {
  return role === 'ngo' || role === 'admin'
}
