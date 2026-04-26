export type AIDetectionSettings = {
  enabled: boolean
  stepDeviationMeters: number
  noResponseSeconds: number
  partyMovement: boolean
  sensitivity: number
}

export type JourneySample = {
  lat: number
  lng: number
  speed: number
  accuracy: number
  ts: number
}

export type RiskEvaluation = {
  score: number
  reasons: string[]
  suspicious: boolean
  dangerous: boolean
}

const EARTH_RADIUS = 6371000

function toRad(v: number) {
  return (v * Math.PI) / 180
}

export function haversineMeters(a: [number, number], b: [number, number]) {
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(x))
}

function bearing(from: [number, number], to: [number, number]) {
  const lat1 = toRad(from[1])
  const lat2 = toRad(to[1])
  const dLng = toRad(to[0] - from[0])
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  let brng = (Math.atan2(y, x) * 180) / Math.PI
  if (brng < 0) brng += 360
  return brng
}

function headingDelta(a: number, b: number) {
  const diff = Math.abs(a - b) % 360
  return diff > 180 ? 360 - diff : diff
}

export function evaluateRisk(
  samples: JourneySample[],
  routeDest: [number, number],
  settings: AIDetectionSettings,
): RiskEvaluation {
  if (!settings.enabled || samples.length < 2) {
    return { score: 0, reasons: [], suspicious: false, dangerous: false }
  }

  const latest = samples[samples.length - 1]
  const prev = samples[samples.length - 2]
  const first = samples[0]

  let score = 0
  const reasons: string[] = []
  const sensitivityBoost = 1 + (settings.sensitivity - 3) * 0.18

  const distToDest = haversineMeters([latest.lng, latest.lat], routeDest)
  const prevDistToDest = haversineMeters([prev.lng, prev.lat], routeDest)
  if (distToDest > prevDistToDest + settings.stepDeviationMeters) {
    score += 26 * sensitivityBoost
    reasons.push('Moving away from destination.')
  }

  if (latest.accuracy > 90) {
    score += 8 * sensitivityBoost
    reasons.push('Poor GPS confidence.')
  }

  if (latest.speed > 20) {
    score += 16 * sensitivityBoost
    reasons.push('Unusually high movement speed.')
  }

  const dt = Math.max(1, (latest.ts - prev.ts) / 1000)
  const accel = Math.abs((latest.speed - prev.speed) / dt)
  if (accel > 4.5) {
    score += 10 * sensitivityBoost
    reasons.push('Abrupt acceleration/deceleration detected.')
  }

  if (samples.length >= 5) {
    const headA = bearing([samples[samples.length - 5].lng, samples[samples.length - 5].lat], [prev.lng, prev.lat])
    const headB = bearing([prev.lng, prev.lat], [latest.lng, latest.lat])
    if (headingDelta(headA, headB) > 120 && latest.speed > 1.2) {
      score += 12 * sensitivityBoost
      reasons.push('Sharp direction change detected.')
    }
  }

  const idleMs = latest.ts - first.ts
  const movedMeters = haversineMeters([first.lng, first.lat], [latest.lng, latest.lat])
  if (idleMs > 180000 && movedMeters < 40) {
    score += 18 * sensitivityBoost
    reasons.push('Long stop in same location.')
  }

  const suspicious = score >= 25
  const dangerous = score >= 50
  return { score: Math.round(score), reasons, suspicious, dangerous }
}
