import { StorageAdaptor } from 'groupfi-sdk-chat'
import ImagesMap from '../public/index'

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

export function checkIsTrollboxInIframe() {
  return window.parent !== window
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch (error) {
    console.error('Copy text error:', error)
  }
}

export function classNames(...classes: unknown[]): string {
  return classes.filter(Boolean).join(' ')
}

export function addressToPngSrc(sha256Func: any, addr: string) {
  const pngTotal = Object.keys(ImagesMap ?? {}).length
  let numberStr = sha256Func(addr)
  numberStr = addHexPrefixIfAbsent(numberStr)
  const pngNum = Number(numberStr) % pngTotal
  const pngNumStr = pngNum.toString().padStart(2, '0')
  return ImagesMap[pngNumStr]
}

export function addressToPngSrcV2(sha256addr: string) {
  const pngTotal = Object.keys(ImagesMap ?? {}).length
  sha256addr = addHexPrefixIfAbsent(sha256addr)
  const pngNum = Number(sha256addr) % pngTotal
  const pngNumStr = pngNum.toString().padStart(2, '0')
  return ImagesMap[pngNumStr]
}

export function addHexPrefixIfAbsent(hex: string) {
  // if (!hex) return hex
  if (hex.indexOf('0x') === 0) return hex
  return '0x' + hex
}

export function addressToUserName(address: string) {
  return address.slice(0, 3) + '...' + address.slice(address.length - 4)
}

export function timeFormater(second: number | undefined, hour12 = false) {
  if (second === undefined) {
    return undefined
  }

  const date = new Date(second * 1000)

  // 设置为 default 的话，美式英语地区默认使用12小时制，即使 hour12=false，会出现 "24:05" 这种奇怪的表达
  // 设置为 en-GB（英式英语地区）的话，既支持12小时制，也支持24小时制
  return new Intl.DateTimeFormat('en-GB', {
    hour12,
    hour: 'numeric',
    minute: 'numeric'
  }).format(date)
}

export function dateFormater(second: number | undefined, year: boolean) {
  if (second === undefined) {
    return undefined
  }
  const date = new Date(second * 1000)

  return new Intl.DateTimeFormat('en-US', {
    year: year ? 'numeric' : undefined,
    month: 'short',
    day: 'numeric'
  }).format(date)
}

export function checkIsToday(second: number) {
  return checkIsSameDay(Math.ceil(Date.now() / 1000), second)
}

export function checkIsSameDay(second1: number, second2: number) {
  const date1 = new Date(second1 * 1000)
  const date2 = new Date(second2 * 1000)

  if (date1.getDate() !== date2.getDate()) {
    return false
  }
  if (date1.getMonth() !== date2.getMonth()) {
    return false
  }
  if (date1.getFullYear() !== date2.getFullYear()) {
    return false
  }
  return true
}

export function removeHexPrefixIfExist(stringMaybeWithHexPrefix: string) {
  if (stringMaybeWithHexPrefix.startsWith('0x')) {
    return stringMaybeWithHexPrefix.slice(2)
  }
  return stringMaybeWithHexPrefix
}

// 从域名中提取一级域名
export function getTopLevelDomain(hostname: string) {
  try {
    const ipPattern = /^(?:\d{1,3}\.){3}\d{1,3}$/

    // 如果是IP地址，直接返回
    if (ipPattern.test(hostname)) {
      return hostname
    }
    const parts = hostname.split('.')
    if (parts.length <= 2) {
      return hostname
    }
    const tld = parts.slice(-2).join('.')
    const secondLevelDomain = parts.slice(-3).join('.')
    const commonSecondLevelDomains = ['co.uk', 'com.cn', 'org.uk', 'net.cn']
    if (commonSecondLevelDomains.includes(tld)) {
      return secondLevelDomain
    }
    return tld
  } catch (error) {
    return hostname
  }
}

export class ScrollDebounce {
  scrollTopThreshold = 1500
  updating = false
  lastScrollTop = 0
  delayMs = 200
  timer: NodeJS.Timeout | undefined = undefined
  // false: no more data to updage
  updateData: () => Promise<void>
  shouldStopUpdate = false

  constructor(updateData: () => Promise<void>) {
    this.updateData = updateData
  }

  async trigger(scrollTop: number) {
    if (this.lastScrollTop === 0 || scrollTop < this.lastScrollTop) {
      // Down operation

      if (scrollTop <= this.scrollTopThreshold && !this.updating) {
        this.updating = true
        try {
          await this.updateData()
        } finally {
          this.updating = false
        }
      }
    }
    this.lastScrollTop = scrollTop
  }

  onScroll(scrollTop: number) {
    if (this.shouldStopUpdate) {
      return
    }
    if (this.timer === undefined) {
      this.trigger(scrollTop)
    } else {
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
