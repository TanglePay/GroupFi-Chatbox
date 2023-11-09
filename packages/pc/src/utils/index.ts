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

export function removeHexPrefixIfExist(stringMaybeWithHexPrefix: string) {
  if (stringMaybeWithHexPrefix.startsWith('0x')) {
    return stringMaybeWithHexPrefix.slice(2)
  }
  return stringMaybeWithHexPrefix
}

export class ScrollDebounce {
  scrollTopThreshold = 1200
  updating = false
  lastScrollTop = 0
  delayMs = 1000
  timer: NodeJS.Timeout | undefined = undefined
  // false: no more data to updage
  updateData: () => Promise<boolean>
  shouldStopUpdate = false

  constructor(updateData: () => Promise<boolean>) {
    this.updateData = updateData
  }

  async trigger(scrollTop: number) {
    console.log('&&&Enter Trigger:', scrollTop, this.lastScrollTop)
    if (this.lastScrollTop === 0 || scrollTop < this.lastScrollTop) {
      // Down operation
      console.log('&&&Enter Trigger scrollTop:', scrollTop, this.lastScrollTop)
      if (scrollTop <= this.scrollTopThreshold && !this.updating) {
        console.log('&&&Enter update=========>')
        this.updating = true
        try {
          const hasMoreData = await this.updateData()
          if(!hasMoreData) {
            this.shouldStopUpdate = true
          }
        } finally {
          this.updating = false
        }
      }
    }
    this.lastScrollTop = scrollTop
  }

  onScroll(scrollTop: number) {
    if(this.shouldStopUpdate) {
      return
    }
    if(this.timer === undefined) {
      this.trigger(scrollTop)
    }else{
      clearTimeout(this.timer)
    }
    this.timer = setTimeout(
      function (this: ScrollDebounce) {
        this.trigger(scrollTop)
        this.timer = undefined
      }.bind(this),
      this.delayMs
    )
  }
}
