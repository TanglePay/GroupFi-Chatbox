import { StorageAdaptor } from 'groupfi_trollbox_shared'
// implement StorageAdaptor
export class LocalStorageAdaptor implements StorageAdaptor {
  async get(key: string): Promise<string | null> {
    return localStorage.getItem(key)
  }
  async set(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value)
  }
  async remove(key: string): Promise<void> {
    localStorage.removeItem(key)
  }
}


export function classNames(...classes: unknown[]): string {
  return classes.filter(Boolean).join(' ')
}

export function timestampFormater(second: number | undefined, hour12 = false) {
  if (second === undefined) {
    return undefined
  }
  const date = new Date(second * 1000)
  return new Intl.DateTimeFormat('default', {
    hour12,
    hour: 'numeric',
    minute: 'numeric'
  }).format(date)
}
