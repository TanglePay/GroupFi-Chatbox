import { classNames } from 'utils'
import { parseMessageAndQuotedMessage } from './MessageItem'

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

  const [realMessage, _] = parseMessageAndQuotedMessage(message)

  const regex = /(\%\{(?:emo):[^}]+?\})/
  const matches = realMessage.split(regex).filter(Boolean)

  const elements: (NormalTextType | EmoType | QuoType)[] = matches.map((m) => {
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
    return {
      type: 'text',
      value: m
    }
  })

  return elements.map(({ type, value }, index) => {
    if (type === 'text') {
      return value
    } else if (type === 'emo') {
      return (
        <div key={index} className={classNames('inline-block align-sub')}>
          <Emoji unified={value} size={16} emojiStyle={EmojiStyle.TWITTER} />
        </div>
      )
    }
  })
}
