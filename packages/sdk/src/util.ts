export function hexStringToUint8Array(hexString: string) {
  // 去掉前缀 '0x'（如果有）
  if (hexString.startsWith('0x')) {
    hexString = hexString.slice(2)
  }

  // 检查输入是否为有效的十六进制字符串
  if (hexString.length % 2 !== 0) {
    throw new Error('Invalid hex string')
  }

  const byteArray = new Uint8Array(hexString.length / 2)
  for (let i = 0; i < hexString.length; i += 2) {
    byteArray[i / 2] = parseInt(hexString.substr(i, 2), 16)
  }
  return byteArray
}

export function uint8ArrayToHexString(uint8Array: Uint8Array) {
  return Array.from(uint8Array)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
