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
