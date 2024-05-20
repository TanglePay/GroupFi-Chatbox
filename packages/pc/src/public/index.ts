const images = import.meta.glob('./avatar/*.*', { eager: true })
const imageRex = /\/([^\/]+)\.webp$/

const ImagesMap: { [key: string]: string } = {}

for (const key in images) {
  const match = key.match(imageRex)
  if (match) {
    const pngName = match[1]
    ImagesMap[pngName] = (images[key] as { default: string }).default
  }
}

export default ImagesMap
