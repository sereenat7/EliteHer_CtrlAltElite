import type { StyleSpecification } from 'maplibre-gl'

export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  maptilerKey: import.meta.env.VITE_MAPTILER_KEY as string | undefined,
  maptilerMapId:
    (import.meta.env.VITE_MAPTILER_MAP_ID as string | undefined) || 'streets-v4',
  routingUrl:
    (import.meta.env.VITE_ROUTING_URL as string | undefined) ||
    'https://router.project-osrm.org',
  // Optional override for Supabase Edge Functions URL.
  // If not set, supabase-js will use the project's default functions endpoint.
  supabaseFunctionsUrl: import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined,
}

export function assertEnv() {
  const missing: string[] = []
  if (!env.supabaseUrl) missing.push('VITE_SUPABASE_URL')
  if (!env.supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY')
  return missing
}

export function mapStyleUrl() {
  if (env.maptilerKey) {
    return `https://api.maptiler.com/maps/${env.maptilerMapId}/style.json?key=${env.maptilerKey}`
  }

  // OSM fallback so the map always renders on web even without MapTiler keys.
  const style: StyleSpecification = {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors',
      },
    },
    layers: [
      {
        id: 'osm',
        type: 'raster',
        source: 'osm',
      },
    ],
  }
  return style
}
