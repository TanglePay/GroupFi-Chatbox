import { useParams } from 'react-router-dom'
import { classNames, timestampFormater } from 'utils'
import IotaKeySVG from 'public/avatars/iotakey.svg'
import RobotSVG from 'public/avatars/robot.svg'
import IotaapeSVG from 'public/avatars/iotaape.svg'
import MessageSVG from 'public/icons/message.svg'
import EmojiSVG from 'public/icons/emoji.svg'
import PlusSVG from 'public/icons/plus-sm.svg'
import MuteSVG from 'public/icons/mute.svg'
import {
  ContainerWrapper,
  HeaderWrapper,
  ContentWrapper,
  ReturnIcon,
  MoreIcon,
  GroupTitle,
  Loading
} from '../Shared'

import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'

function ChatRoom() {
  const { id: groupName } = useParams()
  if (groupName === undefined) {
    return null
  }

  const group: any = {}
  const messageList: any[] = [
    {
      sender: 'robot',
      message: 'hello, world',
      timestamp: 1695016309
    }
  ]

  const meetGroupConditions = false
  const isGroupMember = false
  const marked = true
  const muted: boolean | undefined = true

  return (
    <ContainerWrapper>
      <HeaderWrapper>
        <ReturnIcon />
        <GroupTitle showGroupIcon={false} title={group.group} />
        <MoreIcon to={'info'} />
      </HeaderWrapper>
      <ContentWrapper>
        {messageList
          .map(({ sender, message, timestamp }) => ({
            sender: sender.slice(sender.length - 5),
            message: message,
            time: timestampFormater(timestamp, true) ?? '',
            avatar: IotaKeySVG
          }))
          .map((item) => (
            <NewMessageItem {...item} />
          ))}
      </ContentWrapper>
      <div className={classNames('flex-none basis-auto')}>
        <div className={classNames('px-5 pb-5')}>
          {isGroupMember && !muted ? (
            <MessageInput />
          ) : (
            <ChatRoomButton
              marked={marked}
              muted={muted}
              meetGroupConditions={meetGroupConditions}
            />
          )}
        </div>
      </div>
    </ContainerWrapper>
  )
}
function MessageInput() {
  return (
    <div className={classNames('w-full bg-[#F2F2F7] rounded-2xl')}>
      <div className={classNames('flex flex-row p-2 items-end')}>
        <img
          className={classNames('flex-none mr-2 cursor-pointer')}
          src={MessageSVG}
        />
        <div
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              alert('Send Message')
            }
          }}
          contentEditable={true}
          className="flex-1 bg-white border-0 mr-2 rounded py-1.5 text-sm pl-2.5 text-gray-900 placeholder:text-black/50 placeholder:text-sm outline-none break-all"
          placeholder="Type Message..."
        ></div>
        <img
          className={classNames('flex-none cursor-pointer mr-2')}
          src={EmojiSVG}
        />
        <img className={classNames('flex-none cursor-pointer')} src={PlusSVG} />
      </div>
    </div>
  )
}

function ChatRoomButton(props: {
  marked: boolean
  meetGroupConditions: boolean
  muted: boolean | undefined
}) {
  const { marked, meetGroupConditions, muted } = props
  return (
    <button
      className={classNames(
        'w-full rounded-2xl py-3',
        marked || muted ? 'bg-[#F2F2F7]' : 'bg-primary'
      )}
    >
      <span
        className={classNames(
          'text-base',
          muted ? 'text-[#D53554]' : marked ? 'text-[#3671EE]' : 'text-white'
        )}
      >
        {muted ? (
          <>
            <img
              src={MuteSVG}
              className={classNames('inline-block mr-3 mt-[-3px]')}
            />
            <span>You are muted in this group</span>
          </>
        ) : meetGroupConditions ? (
          'JOIN'
        ) : marked ? (
          <span>
            Buy <span className={classNames('font-medium')}>IOTABOTS</span> to
            speak in this group
          </span>
        ) : (
          'MARK'
        )}
      </span>
    </button>
  )
}

interface MessageItemInfo {
  avatar: string
  sender: string
  message: string
  time: string
  sentByMe?: boolean
}

function NewMessageItem({
  avatar,
  sender,
  message,
  time,
  sentByMe = false
}: MessageItemInfo) {
  return (
    <div
      className={classNames(
        'px-5 flex flex-row mb-5 mt-2.5',
        sentByMe ? 'justify-end' : 'justify-start'
      )}
    >
      {!sentByMe && (
        <div className={classNames('flex-none w-9 h-9 border rounded-lg mr-3')}>
          <img src={avatar} />
        </div>
      )}
      <div
        className={classNames(
          'grow-0 shrink-1 basis-auto bg-[#F2F2F7] px-1.5 pt-1 rounded-md'
        )}
      >
        <div>
          <div className={classNames('flex flex-row')}>
            <div
              className={classNames('grow-1 shrink-0 max-w-full basis-auto')}
            >
              <span className={classNames('text-xs font-semibold')}>
                {sender}
              </span>
              <br />
              <span className={classNames('text-sm color-[#2C2C2E]')}>
                {message}
              </span>
            </div>
            <div className={classNames('grow-0 shrink-1 w-12')}></div>
          </div>
        </div>
        <div className={classNames('text-right leading-4 px-1 mb-3px')}>
          <span
            className={classNames(
              'text-xxs font-light text-[#666668] whitespace-nowrap'
            )}
          >
            {time}
          </span>
        </div>
      </div>
    </div>
  )
}

const ObservedChatRoom = observer(ChatRoom)

export default ObservedChatRoom