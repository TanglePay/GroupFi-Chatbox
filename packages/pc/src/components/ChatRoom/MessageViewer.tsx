import { classNames } from 'utils'
import { parseMessageAndQuotedMessage } from './MessageItem'

// version 1
// export const URLRegexp =
//   /([https?:\/\/]?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?)/g

// version 2
// export const URLRegexp =
//   /((?:https?:)?(?:\/\/)?(?:[\w-]+\.)+[\w-]+(?:\/[/?%&=.\w-]*)?)/g

export const URLRegexp =
  /((?:https?:)?(?:\/\/)?(?:[\w-]+\.)+[\w-]+[/?%&=.\w-]*)/g

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

export function getMessageElements(
  message: string
): (NormalTextType | EmoType | QuoType | LinkType)[] {
  const [realMessage, _] = parseMessageAndQuotedMessage(message)

  const regex = /(\%\{(?:emo):[^}]+?\})/
  const matches = realMessage.split(regex).filter(Boolean)

  const elements = matches
    .map((m) => {
      const cmdAndValue = m.match(/\%\{(emo):([^]+)\}/)

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
  groupId?: string
}) {
  let { message, messageId } = props
  if (message === null) {
    message = 'message is null'
    console.log('======>message is null', messageId)
  }

  const elements = getMessageElements(message)

  return elements.map(({ type, value }, index) => {
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
}
