import { classNames } from 'utils'
import { useEffect, useRef, useState } from 'react'
import {
  parseMessageAndQuotedMessage,
  parseOriginFromRealMessage
} from './MessageItem'

import ImgError from 'public/icons/error-img.png'
// @ts-ignore
import SpinSVG from 'public/icons/spin.svg?react'

import PhotoSwipeLightbox from 'photoswipe/lightbox'
import 'photoswipe/style.css'

import linkifyit from 'linkify-it'
const linkify = new linkifyit()

import { Emoji, EmojiStyle } from 'emoji-picker-react'

function splitText(text: string): Array<NormalTextType | LinkType> {
  if (!linkify.test(text)) {
    return [
      {
        type: 'text',
        value: text
      }
    ]
  }
  const matches = linkify.match(text) ?? []
  let start = 0
  const res: Array<NormalTextType | LinkType> = []
  for (const match of matches) {
    if (match.index > start) {
      res.push({
        type: 'text',
        value: text.substring(start, match.index)
      })
    }
    res.push({
      type: 'link',
      value: text.substring(match.index, match.lastIndex)
    })
    start = match.lastIndex
  }
  if (start !== text.length) {
    res.push({
      type: 'text',
      value: text.substring(start)
    })
  }
  return res
}

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

      return splitText(m)

      // if (!linkify.test(m)) {
      //   return {
      //     type: 'text',
      //     value: m
      //   }
      // }

      // const matches = linkify.match(m)
      // console.log('===>link matches', matches)

      // return {
      //   type: 'text',
      //   value: m
      // }

      // const matches: string[] = m.match(URLRegexp) ?? []

      // const textWithURLElements = m.split(URLRegexp).filter(Boolean)

      // return textWithURLElements.map((ele) => {
      //   if (matches.includes(ele)) {
      //     return {
      //       type: 'link',
      //       value: ele
      //     }
      //   } else {
      //     return {
      //       type: 'text',
      //       value: ele
      //     }
      //   }
      // })
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
          )
        })}
      </div>
    </>
  )
}

const imgUploadFailedCache = new Map<string, true>()

function ImgViewer(props: {
  imgUrl: string
  width: number
  height: number
  ratio: number
  clientWidth: number
}) {
  const { imgUrl: src, ratio, width, height, clientWidth } = props
  const [isImgUploaded, setIsImgUploaded] = useState(true)

  const [isImgUploadFailed, setIsImgUploadFailed] = useState(
    imgUploadFailedCache.get(src) ?? false
  )

  const checkIsImgSrc = (imgSrc: string) => {
    return imgSrc.startsWith('http')
  }

  useEffect(() => {
    let maxAttempts = 5
    let currentAttempt = 0

    const tryCheckImgUploaded = async () => {
      currentAttempt++
      try {
        fetch(src, { method: 'HEAD' })
          .then((response) => {
            if (response.ok && response.status === 200) {
              setIsImgUploaded(true)
            } else {
              throw new Error('HEAD request error')
            }
          })
          .catch((error) => {
            if (currentAttempt < maxAttempts) {
              setTimeout(tryCheckImgUploaded, 100)
            } else {
              imgUploadFailedCache.set(src, true)
              setIsImgUploadFailed(true)
            }
          })
      } catch (error) {
        console.error('Error checking if image exists:', error)
        return false
      }
    }

    if (!isImgUploaded && !isImgUploadFailed) {
      tryCheckImgUploaded()
    }
  }, [isImgUploaded])

  if (isImgUploadFailed || !checkIsImgSrc(src)) {
    return (
      <div
        style={{ width, height }}
        className={classNames(
          'flex flex-col justify-center items-center bg-white rounded-lg'
        )}
      >
        <img src={ImgError} />
        <div
          className={classNames('text-xs font-medium mt-0.5 text-[#2c2c2e]')}
        >
          OUPS!
        </div>
        <div className={classNames('text-[10px] text-[#2c2c2e]')}>
          Something Went Wrong
        </div>
      </div>
    )
  }

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

  if (clientWidth === undefined) {
    return null
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
        onError={() => {
          setIsImgUploaded(false)
        }}
        key={src}
        src={src}
        data-src={src}
        className={classNames('rounded-lg img cursor-pointer')}
      />
    </a>
  )
}
