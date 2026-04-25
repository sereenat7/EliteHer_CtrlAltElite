import localforage from 'localforage'

const store = localforage.createInstance({ name: 'saaya', storeName: 'prefs' })

export async function getPref<T>(key: string, fallback: T): Promise<T> {
  const v = await store.getItem<T>(key)
  return (v ?? fallback) as T
}

export async function setPref<T>(key: string, value: T) {
  await store.setItem(key, value)
}

