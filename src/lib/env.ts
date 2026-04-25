export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  maptilerKey: import.meta.env.VITE_MAPTILER_KEY as string | undefined,
  maptilerMapId:
    (import.meta.env.VITE_MAPTILER_MAP_ID as string | undefined) || 'streets-v4',
}

export function assertEnv() {
  const missing: string[] = []
  if (!env.supabaseUrl) missing.push('VITE_SUPABASE_URL')
  if (!env.supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY')
  if (!env.maptilerKey) missing.push('VITE_MAPTILER_KEY')
  return missing
}

export function mapStyleUrl() {
  if (!env.maptilerKey) return undefined
  return `https://api.maptiler.com/maps/${env.maptilerMapId}/style.json?key=${env.maptilerKey}`
}
