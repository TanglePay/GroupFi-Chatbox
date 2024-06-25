import { classNames } from 'utils'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  parseMessageAndQuotedMessage,
  parseOriginFromRealMessage
} from './MessageItem'

// @ts-ignore
import SpinSVG from 'public/icons/spin.svg?react'

import PhotoSwipeLightbox from 'photoswipe/lightbox'
import 'photoswipe/style.css'

// import LightGallery from 'lightgallery/react'

// import 'lightgallery/css/lightgallery.css'
// version 1
// export const URLRegexp =
//   /([https?:\/\/]?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?)/g

// version 2
// export const URLRegexp =
//   /((?:https?:)?(?:\/\/)?(?:[\w-]+\.)+[\w-]+(?:\/[/?%&=.\w-]*)?)/g

export const URLRegexp =
  /((?:https?:)?(?:\/\/)?(?:[\w-]+\.)+[\w-]+[/?%#&,=.+\w-]*)/g

import { Emoji, EmojiStyle } from 'emoji-picker-react'

type NormalTextType = {
  type: 'text'
  value: string
}

type EmoType = {
  type: 'emo'
  value: string
}

type QuoType = {
  type: 'quo'
  value: string
}

type LinkType = {
  type: 'link'
  value: string
}

type ImgType = {
  type: 'img'
  value: string
}

export function getMessageElements(
  message: string,
  ifMessageIncludeOriginContent: boolean
): (NormalTextType | EmoType | QuoType | LinkType | ImgType)[] {
  let [realMessage, _] = parseMessageAndQuotedMessage(message)
  if (ifMessageIncludeOriginContent) {
    realMessage = parseOriginFromRealMessage(realMessage)[0]
  }

  const regex = /(\%\{(?:emo|img):[^}]+?\})/
  const matches = realMessage.split(regex).filter(Boolean)

  const elements = matches
    .map((m) => {
      const cmdAndValue = m.match(/\%\{(emo|img):([^]+)\}/)

      if (cmdAndValue) {
        const cmd = cmdAndValue[1]
        const value = cmdAndValue[2]
        switch (cmd) {
          case 'emo': {
            return {
              type: 'emo',
              value
            }
          }
          case 'img': {
            return {
              type: 'img',
              value
            }
          }
          case 'quo': {
            return {
              type: 'quo',
              value
            }
          }
        }
      }

      const matches: string[] = m.match(URLRegexp) ?? []

      const textWithURLElements = m.split(URLRegexp).filter(Boolean)

      return textWithURLElements.map((ele) => {
        if (matches.includes(ele)) {
          return {
            type: 'link',
            value: ele
          }
        } else {
          return {
            type: 'text',
            value: ele
          }
        }
      })
    })
    .flat(1) as (NormalTextType | EmoType | QuoType | LinkType)[]

  return elements
}

export function getEmojiUrlByunified(unified: string) {
  return `https://cdn.jsdelivr.net/npm/emoji-datasource-twitter/img/twitter/64/${unified}.png`
}

export default function MessageViewer(props: {
  message: string
  messageId?: string
  isSelf?: boolean
  groupId?: string
  ifMessageIncludeOriginContent: boolean
  ifShowImg: boolean
}) {
  let { message, messageId, ifMessageIncludeOriginContent, ifShowImg, isSelf } =
    props
  if (message === null) {
    message = 'message is null'
    console.log('======>message is null', messageId)
  }

  const elements = getMessageElements(message, ifMessageIncludeOriginContent)

  const clientRectRef = useRef<{
    width: number | undefined
  }>({
    width: undefined
  })

  const imgElements = elements.filter(
    (element) => element.type === 'img'
  ) as ImgType[]

  const nonImgElements = elements.map(({ type, value }, index) => {
    if (type === 'text') {
      return value
    } else if (type === 'link') {
      const href = value.startsWith('http') ? value : `http://${value}`
      return (
        <a href={href} target="_blank" className="link">
          {value}
        </a>
      )
    } else if (type === 'emo') {
      return (
        <div key={index} className={classNames('inline-block align-sub')}>
          <Emoji unified={value} size={16} emojiStyle={EmojiStyle.TWITTER} />
        </div>
      )
    }
  })

  useEffect(() => {
    clientRectRef.current.width = document.getElementById('root')?.clientWidth
    if (imgElements.length > 0) {
      let lightbox: PhotoSwipeLightbox | null = new PhotoSwipeLightbox({
        gallery: '#my-gallery',
        children: 'a',
        pswpModule: () => import('photoswipe')
      })

      lightbox.init()

      return () => {
        if (lightbox) {
          lightbox.destroy()
          lightbox = null
        }
      }
    }
  }, [])

  if (imgElements.length === 0) {
    return nonImgElements
  }

  if (!ifShowImg) {
    return (
      <>
        {nonImgElements}
        <span>[Photo]</span>
      </>
    )
  }

  const getImgHeight = (imgWith: number, element: ImgType) => {
    const value = element.value
    const ratio = parseFloat(value.slice(-4))
    const height = Math.ceil(imgWith / ratio)
    return height
  }

  const getImgUrlAndRatio = (element: ImgType) => {
    const value = element.value
    const ratio = parseFloat(value.slice(-4))
    const src = value.slice(0, -4)
    return {
      src,
      ratio
    }
  }

  const getImgWidth = () => {
    if (imgElements.length === 1) {
      return 172
    }
    const clientWidth = document.getElementById('root')?.clientWidth
    if (clientWidth !== undefined) {
      // 8 滚动条的宽度，带 border
      // 12 边距
      const usableWidth = isSelf
        ? clientWidth - 76 - 8 - 12
        : clientWidth - 88 - 8 - 12

      const imgWidth = (usableWidth - 6) / 2
      return imgWidth
    }
  }

  const getImgContainerHeight = () => {
    if (imgElements.length === 1) {
      return getImgHeight(172, imgElements[0] as ImgType)
    }
    const imgWidth = getImgWidth()
    if (imgWidth !== undefined) {
      let totalHeight = 0
      for (let i = 0; i < imgElements.length; i = i + 2) {
        const leftImgHeight = getImgHeight(imgWidth, imgElements[i] as ImgType)
        let rightImgHeight = 0
        if (i + 1 < imgElements.length) {
          rightImgHeight = getImgHeight(imgWidth, imgElements[i + 1] as ImgType)
        }
        const maxHeight = Math.max(leftImgHeight, rightImgHeight)
        totalHeight += maxHeight
      }
      return totalHeight
    }
    return 0
  }

  const gridCols =
    imgElements.length === 1 ? 'grid-cols-[172px]' : 'grid-cols-[1fr_1fr]'

  return (
    <>
      {nonImgElements}
      <div
        id="my-gallery"
        className={classNames('grid gap-1.5 my-1', gridCols)}
        style={{
          height: getImgContainerHeight()
        }}
      >
        {imgElements.map((element) => {
          const { src, ratio } = getImgUrlAndRatio(element)

          const width = getImgWidth()
          const height = getImgHeight(width!, element)
          const clientWidth = clientRectRef.current.width!
          return (
            <ImgViewer
              key={src}
              ratio={ratio}
              width={width!}
              height={height}
              imgUrl={src}
              clientWidth={clientWidth}
            />
            // <a
            //   href={src}
            //   key={src}
            //   data-pswp-width={clientWidth}
            //   data-pswp-height={Math.ceil(clientWidth / ratio)}
            //   target="_blank"
            //   rel="noreferrer"
            // >
            //   <img
            //     style={{
            //       width,
            //       height
            //     }}
            //     key={src}
            //     src={src}
            //     data-src={src}
            //     className={classNames('rounded-lg img cursor-pointer')}
            //   />
            // </a>
          )
        })}
      </div>
    </>
  )
}

function ImgViewer(props: {
  imgUrl: string
  width: number
  height: number
  ratio: number
  clientWidth: number
}) {
  const { imgUrl: src, ratio, width, height, clientWidth } = props
  const [isImgUploaded, setIsImgUploaded] = useState(false)

  useEffect(() => {
    let currentAttempt = 0
    let maxAttempts = 5

    const checkObjectExists = async (src: string) => {
      currentAttempt++
      fetch(src, {
        method: 'HEAD'
      })
        .then((response) => {
          if (response.ok) {
            setIsImgUploaded(true)
          }
        })
        .catch((error) => {
          if (currentAttempt < maxAttempts) {
            checkObjectExists(src)
          }
        })
    }

    checkObjectExists(src)
  }, [])

  if (!isImgUploaded) {
    return (
      <div
        style={{ width, height }}
        className={classNames('flex flex-row justify-center items-center')}
      >
        <SpinSVG
          className={classNames(
            'inline-block animate-spin-slow mr-1 relative h-[18px] top-[-1px] text-black dark:text-white'
          )}
        />
      </div>
    )
  }

  return (
    <a
      href={src}
      key={src}
      data-pswp-width={clientWidth}
      data-pswp-height={Math.ceil(clientWidth / ratio)}
      target="_blank"
      rel="noreferrer"
    >
      <img
        style={{
          width,
          height
        }}
        key={src}
        src={src}
        data-src={src}
        className={classNames('rounded-lg img cursor-pointer')}
      />
    </a>
  )
}
