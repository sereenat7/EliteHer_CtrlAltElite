import { Geolocation, type Position } from '@capacitor/geolocation'

export async function getCurrentPosition(): Promise<Position> {
  return await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 15000,
  })
}

export function watchPosition(
  cb: (pos: Position) => void,
  onError?: (err: unknown) => void,
) {
  return Geolocation.watchPosition(
    { enableHighAccuracy: true, timeout: 15000 },
    (pos, err) => {
      if (err) {
        onError?.(err)
        return
      }
      if (pos) cb(pos)
    },
  )
}

export async function clearWatch(watchId: string) {
  await Geolocation.clearWatch({ id: watchId })
}

