import { TargetContext } from './index'
import { RenderChatboxOptions, ThemeType } from './types'

declare var window: Window

let theme: ThemeType = 'dark'
let accent = 'blue'

const BORDER_SIZE = 4

const imagePosition = {
  right: 10,
  bottom: 10
}

const imageSize = {
  width: 53,
  height: 53
}

const size = JSON.parse(localStorage.getItem('groupfi-trollbox-size') || '{}')
const getTrollboxSize = () => {
  return {
    width: Math.min(size.width || 385, window.innerWidth - 26),
    height: Math.min(size.height || 640, window.innerHeight * 0.9)
  }
}
let trollboxSize = getTrollboxSize()

const maxTrollboxSize = {
  width: 480,
  height: window.innerHeight - 28
}

const minTrollboxSize = {
  width: 320,
  height: 240
}

const trollboxPosition = {
  right: 5,
  bottom: 5
}

function setStyleProperties(
  this: CSSStyleDeclaration,
  properties: {
    [property: string]: string | number
  }
) {
  for (const key in properties) {
    let value = properties[key]
    if (typeof value === 'number') {
      value = value + 'px'
    }
    this.setProperty(key, value)
  }
}

interface TrollboxPreference {
  isOpen: boolean
}

const trollboxPreferenceStorageKey = 'trollbox.preference'

function getTrollboxPreference(): TrollboxPreference | undefined {
  const preferences = localStorage.getItem(trollboxPreferenceStorageKey)
  if (preferences !== null) {
    return JSON.parse(preferences)
  }
  return undefined
}

function storeTrollboxPreference(preference: TrollboxPreference) {
  localStorage.setItem(trollboxPreferenceStorageKey, JSON.stringify(preference))
}

export const genOnLoad =
  (init: (context: TargetContext) => void, options: RenderChatboxOptions) =>
  () => {
    console.log('start load iframe')

    let backdrop = document.getElementById(
      'groupfi_backdrop'
    ) as HTMLDivElement | null
    let iframeContainer = document.getElementById(
      'groupfi_box'
    ) as HTMLDivElement | null
    let btn = document.getElementById('groupfi_btn') as HTMLDivElement | null
    let iframe = document.getElementById('trollbox') as HTMLIFrameElement | null

    if (iframeContainer !== null && btn !== null && iframe !== null) {
      console.log('Reuse GroupFi DOM')
      iframeContainer.style.display = 'block'
      btn.style.display = 'block'

      iframe.src = generateIframeSrc(options)

      iframe.onload = function () {
        console.log('iframe loaded')
        console.info('🚀 ~ iframe!.contentWindow:', iframe!.contentWindow)
        console.info(
          '🚀 ~ new URL(iframe!.src).origin:',
          new URL(iframe!.src).origin
        )
        init({
          targetWindow: iframe!.contentWindow!,
          targetOrigin: new URL(iframe!.src).origin
        })
      }

      return
    }

    console.log('Generate GroupFi DOM')

    const trollboxPreference = getTrollboxPreference()
    let isTrollboxShow = !!trollboxPreference?.isOpen

    // generate backdrop container dom
    backdrop = generateBackdropDOM()
    // generate iframe container dom
    iframeContainer = generateIframeContainerDOM(isTrollboxShow)
    // generate groupfi btn dom
    btn = generateBtnDOM(iframeContainer, isTrollboxShow)

    // generate iframe dom
    iframe = generateIframeDOM(init, options)

    iframeContainer.append(iframe)
    document.body.append(backdrop)
    document.body.append(btn)
    document.body.append(iframeContainer)
  }

function generateIframeDOM(
  init: (context: TargetContext) => void,
  params: RenderChatboxOptions
) {
  const iframe = document.createElement('iframe')
  iframe.id = 'trollbox'
  iframe.allow = 'clipboard-read; clipboard-write'

  iframe.src = generateIframeSrc(params)

  iframe.onload = function () {
    console.log('iframe loaded')
    init({
      targetWindow: iframe.contentWindow!,
      targetOrigin: new URL(iframe.src).origin
    })
  }

  setStyleProperties.bind(iframe.style)({
    width: '100%',
    height: '100%',
    border: 'rgba(0,0,0,0.1)',
    background: theme === 'light' ? '#fff' : '#212122',
    'box-shadow': '0 6px 6px -1px rgba(0,0,0,0.1)',
    'border-radius': '16px',
    'color-scheme': 'auto'
  })

  return iframe
}

function generateIframeSrc(params: RenderChatboxOptions) {
  const searchParams = new URLSearchParams()

  theme = params?.theme || 'light'
  const uiConfig = params?.uiConfig
  accent = uiConfig?.accent || 'blue'

  searchParams.append('timestamp', Date.now().toString())
  searchParams.append('theme', theme)
  searchParams.append('accent', accent)

  if (uiConfig?.title) {
    searchParams.append('title', uiConfig?.title)
  }
  if (uiConfig?.subTitle) {
    searchParams.append('subTitle', uiConfig?.subTitle)
  }
  if (uiConfig?.logoUrl) {
    searchParams.append('logoUrl', uiConfig?.logoUrl)
  }

  if (params.isWalletConnected === false) {
    searchParams.append('isBrowseMode', 'true')
  } else if (params.isGroupfiNativeMode) {
    searchParams.append('walletType', 'tanglepay')
  } else if (params.isGroupfiNativeMode === false) {
    searchParams.append('walletType', 'metamask')
  } else {
    searchParams.append('isBrowseMode', 'true')
  }
  
  return `https://chatbox.groupfi.ai?${searchParams.toString()}`
}

function generateBackdropDOM() {
  const backdropContainer = document.createElement('div')
  backdropContainer.id = 'groupfi_backdrop'
  setStyleProperties.bind(backdropContainer.style)({
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    display: 'none',
    background: 'rgba(0,0,0,0.001)'
  })
  return backdropContainer
}

function generateIframeContainerDOM(isTrollboxShow: boolean) {
  let activeX = false,
    activeY = false
  let lastX = 0,
    lastY = 0,
    finalWidth = 0,
    finalHeight = 0
  const iframeContainer = document.createElement('div')
  const moveHandler = (event: MouseEvent) => {
    // console.log('move', event);
    if (activeX) {
      const dx = lastX - event.x
      lastX = event.x
      const width = parseInt(iframeContainer.style.width) + dx
      finalWidth = Math.max(
        minTrollboxSize.width,
        Math.min(maxTrollboxSize.width, width)
      )
      iframeContainer.style.width = `${finalWidth}px`
    }
    if (activeY) {
      const dy = lastY - event.y
      lastY = event.y
      const height = parseInt(iframeContainer.style.height) + dy
      finalHeight = Math.max(
        minTrollboxSize.height,
        Math.min(maxTrollboxSize.height, height)
      )
      iframeContainer.style.height = `${finalHeight}px`
    }
  }
  iframeContainer.id = 'groupfi_box'

  document.addEventListener('mouseup', () => {
    if (activeX) {
      lastX = 0
      activeX = false
    }
    if (activeY) {
      lastY = 0
      activeY = false
    }

    const size = { width: finalWidth, height: finalHeight }
    localStorage.setItem('groupfi-trollbox-size', JSON.stringify(size))

    const backdrop = document.getElementById(
      'groupfi_backdrop'
    ) as HTMLDivElement | null
    if (backdrop) {
      backdrop.style.display = 'none'
    }
    iframeContainer.style.background = 'transparent'
    const iframe = document.querySelector(
      'iframe#trollbox'
    ) as HTMLIFrameElement | null
    iframe && (iframe.style.display = 'block')
    document.removeEventListener('mousemove', moveHandler)
  })

  const vhandler = document.createElement('div')
  setStyleProperties.bind(vhandler.style)({
    position: 'absolute',
    left: '0',
    top: `${BORDER_SIZE}px`,
    width: `${BORDER_SIZE * 2.5}px`,
    height: '100%',
    display: 'flex',
    'align-items': 'center'
  })
  vhandler.addEventListener('mouseenter', () => {
    vhandlerbar.style.backgroundColor = 'rgba(0,0,0,0.25)'
    iframeContainer.style.cursor = 'ew-resize'
  })
  vhandler.addEventListener('mousedown', (e) => {
    if (e.offsetX < BORDER_SIZE * 2.5) {
      lastX = e.x
      activeX = true

      const backdrop = document.getElementById(
        'groupfi_backdrop'
      ) as HTMLDivElement | null
      if (backdrop) {
        backdrop.style.display = 'block'
      }

      iframeContainer.style.background = '#f7f7f77f'
      const iframe = document.querySelector(
        'iframe#trollbox'
      ) as HTMLIFrameElement | null
      iframe && (iframe.style.display = 'none')
      document.addEventListener('mousemove', moveHandler)
    }
  })
  vhandler.addEventListener('mouseleave', () => {
    vhandlerbar.style.backgroundColor = 'rgba(0,0,0,0.01)'
    iframeContainer.style.cursor = 'default'
  })
  const vhandlerbar = document.createElement('div')
  vhandler.append(vhandlerbar)
  setStyleProperties.bind(vhandlerbar.style)({
    width: '4px',
    height: '50px',
    'border-radius': '2px',
    'margin-left': '-2px',
    background: 'rgba(0,0,0,0.01)'
  })
  const hhandler = document.createElement('div')
  setStyleProperties.bind(hhandler.style)({
    position: 'absolute',
    left: `${BORDER_SIZE}px`,
    top: '0',
    width: '100%',
    height: `${BORDER_SIZE * 2.5}px`,
    display: 'flex',
    'justify-content': 'center'
  })
  hhandler.addEventListener('mouseenter', () => {
    hhandlerbar.style.backgroundColor = 'rgba(0,0,0,0.25)'
    iframeContainer.style.cursor = 'ns-resize'
  })
  hhandler.addEventListener('mousedown', (e) => {
    if (e.offsetY < BORDER_SIZE * 2.5) {
      lastY = e.y
      activeY = true

      const backdrop = document.getElementById(
        'groupfi_backdrop'
      ) as HTMLDivElement | null
      if (backdrop) {
        backdrop.style.display = 'block'
      }

      iframeContainer.style.background = '#f7f7f77f'
      const iframe = document.querySelector(
        'iframe#trollbox'
      ) as HTMLIFrameElement | null
      iframe && (iframe.style.display = 'none')
      document.addEventListener('mousemove', moveHandler)
    }
  })
  hhandler.addEventListener('mouseleave', () => {
    hhandlerbar.style.backgroundColor = 'rgba(0,0,0,0.01)'
    iframeContainer.style.cursor = 'default'
  })
  const hhandlerbar = document.createElement('div')
  hhandler.append(hhandlerbar)
  setStyleProperties.bind(hhandlerbar.style)({
    width: '50px',
    height: '4px',
    'border-radius': '2px',
    'margin-top': '-2px',
    background: 'rgba(0,0,0,0.01)'
  })
  iframeContainer.append(vhandler)
  iframeContainer.append(hhandler)

  setStyleProperties.bind(iframeContainer.style)({
    position: 'fixed',
    // background: '#fff',
    'z-index': 100,
    visibility: isTrollboxShow ? 'visible' : 'hidden',
    'border-radius': '16px',
    padding: `${BORDER_SIZE}px`,
    // cursor: 'pointer',
    ...trollboxSize,
    ...trollboxPosition
  })

  if (window.parent) {
    window.parent.addEventListener('resize', function () {
      const size = getTrollboxSize()
      setStyleProperties.bind(iframeContainer.style)(size)
    })
  }

  return iframeContainer
}

function generateBtnDOM(
  iframeContainer: HTMLDivElement,
  isTrollboxShow: boolean
) {
  const btn = document.createElement('div')
  btn.id = 'groupfi_btn'

  setStyleProperties.bind(btn.style)({
    position: 'fixed',
    cursor: 'pointer',
    'z-index': 100,
    ...imageSize,
    ...imagePosition
  })

  btn.classList.add(theme)

  btn.classList.add('animate__fadeOut')

  btn.classList.add('image')

  btn.addEventListener('mouseenter', () => {
    btn.classList.remove('animate__fadeOut')
  })

  btn.addEventListener('mouseleave', () => {
    btn.classList.add('animate__fadeOut')
  })

  const toggleTrollbox = () => {
    btn.classList.remove('image_in', 'image_out')
    isTrollboxShow = !isTrollboxShow
    btn.classList.add(isTrollboxShow ? 'image_in' : 'image_out')
    iframeContainer.style.visibility = isTrollboxShow ? 'visible' : 'hidden'
    btn.style.visibility = isTrollboxShow ? 'hidden' : 'visible'
    storeTrollboxPreference({ isOpen: isTrollboxShow })
  }

  btn.addEventListener('click', () => {
    toggleTrollbox()
  })

  window.addEventListener('message', (event) => {
    if (event.data === 'collapse-trollbox') {
      toggleTrollbox()
    }
  })

  return btn
}
