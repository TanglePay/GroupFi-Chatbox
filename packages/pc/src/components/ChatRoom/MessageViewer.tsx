import { classNames } from 'utils'
import {
  parseMessageAndQuotedMessage,
  parseOriginFromRealMessage
} from './MessageItem'

import LightGallery from 'lightgallery/react'
// import plugins
import lgZoom from 'lightgallery/plugins/zoom'

import 'lightgallery/css/lightgallery.css'
import 'lightgallery/css/lg-zoom.css'
import 'lightgallery/css/lg-thumbnail.css'
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

  console.log('===> realMessage', realMessage)

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

  console.log('===> elements', elements)

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

  const imgElements = elements.filter((element) => element.type === 'img')

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

  const getImgDivHeight = () => {
    if (imgElements.length === 1) {
      return getImgHeight(172, imgElements[0] as ImgType)
    }
    const clientWidth = document.getElementById('root')?.clientWidth
    if (clientWidth !== undefined) {
      const usableWidth = isSelf ? clientWidth - 76 : clientWidth - 86
      let totalHeight = 0
      const imgWidth = (usableWidth - 6) / 2
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

  // console.log('clientWidth', clientWidth, isSelf)

  const gridCols =
    imgElements.length === 1 ? 'grid-cols-[172px]' : 'grid-cols-[1fr_1fr]'
  // const gridCols =
  //   imgElements.length === 1
  //     ? 'grid-cols-[172px]'
  //     : imgElements.length === 2
  //     ? 'grid-cols-[1fr_1fr]'
  //     : imgElements.length === 3
  //     ? `grid-cols-[1fr_1fr_1fr]`
  //     : imgElements.length === 4
  //     ? 'grid-cols-[1fr_1fr]'
  //     : imgElements.length >= 5
  //     ? 'grid-cols-[1fr_1fr_1fr]'
  //     : ''

  // const getItemClass = (index: number) =>
  //   imgElements.length === 3 && index === 0 ? 'row-span-2 col-span-2' : ''

  return (
    <>
      {nonImgElements}
      <LightGallery
        plugins={[]}
        mode="lg-fade"
        selector={'.img'}
        enableDrag={false}
      >
        <div
          className={classNames('grid gap-1.5', gridCols)}
          style={{
            height: getImgDivHeight()
          }}
        >
          {imgElements.map(({ value }, index) => {
            const ratio = value.slice(-4)
            const src = value.slice(0, -4)
            return (
              <img
                key={value}
                src={src}
                data-src={src}
                className={classNames('rounded-lg img')}
              />
            )
          })}
        </div>
      </LightGallery>
    </>
  )
}
