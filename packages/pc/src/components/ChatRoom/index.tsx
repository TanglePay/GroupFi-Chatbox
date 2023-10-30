import { useParams } from 'react-router-dom'
import { classNames, timestampFormater } from 'utils'
import IotaKeySVG from 'public/avatars/iotakey.svg'
import RobotSVG from 'public/avatars/robot.svg'
import IotaapeSVG from 'public/avatars/iotaape.svg'
import MessageSVG from 'public/icons/message.svg'
import EmojiSVG from 'public/icons/emoji.svg'
import PlusSVG from 'public/icons/plus-sm.svg'
import MuteRedSVG from 'public/icons/mute-red.svg'
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
import { useEffect, useState, useRef, useCallback } from 'react'
import { useMessageDomain } from 'groupfi_trollbox_shared'
import { IMessage } from 'groupfi_trollbox_shared'

function ChatRoom() {
  const { id: groupId } = useParams()
  const { messageDomain } = useMessageDomain()
  const groupFiService = messageDomain.getGroupFiService()
  if (groupId === undefined) {
    return null
  }
  const anchorRef = useRef<{
    firstMessageId?: string
    lastMessageId?: string
    lastMessageChunkKey?: string
  }>({})
  const [messageList, setMessageList] = useState<IMessage[]>([])
  //async getConversationMessageList({groupId,key,startMessageId, untilMessageId,size}:{groupId: string, key?: string, startMessageId?: string, untilMessageId?:string, size?: number}) {

  const fetchMessageFromEnd = async () => {
    // log
    console.log('fetchMessageFromEnd', anchorRef.current)
    const { lastMessageId, lastMessageChunkKey } = anchorRef.current
    const { messages, ...rest } =
      await messageDomain.getConversationMessageList({
        groupId,
        key: lastMessageChunkKey,
        untilMessageId: lastMessageId
      })
    if (messages.length === 0) {
      return
    }
    anchorRef.current = Object.assign(anchorRef.current, rest)
    if (!anchorRef.current.firstMessageId) {
      anchorRef.current.firstMessageId = messages[0].messageId
    }
    setMessageList((prev) => [...prev, ...messages])
  }
  const fetchMessageUntilStart = async () => {
    // log
    console.log('fetchMessageUntilStart', anchorRef.current)
    const { firstMessageId } = anchorRef.current
    const { messages, ...rest } =
      await messageDomain.getConversationMessageList({
        groupId,
        untilMessageId: firstMessageId,
        size: 1000
      })
    if (messages.length === 0) {
      return
    }
    anchorRef.current.firstMessageId = messages[0].messageId
    setMessageList((prev) => [...messages, ...prev])
  }
  const fetchMessageUntilStartWrapped = useCallback(fetchMessageUntilStart, [])
  const init = async () => {
    messageDomain.onConversationDataChanged(
      groupId,
      fetchMessageUntilStartWrapped
    )
    await fetchMessageFromEnd()
  }
  const deinit = () => {
    messageDomain.offConversationDataChanged(
      groupId,
      fetchMessageUntilStartWrapped
    )
  }

  const [addressStatus, setAddressStatus] = useState<{
    isGroupPublic: boolean
    marked: boolean
    muted: boolean
    isQualified: boolean
  }>()

  const fetchAddressStatus = async () => {
    const status = await groupFiService.getAddressStatusInGroup(groupId)
    console.log('***Address Status', status)
    setAddressStatus(status)
  }

  useEffect(() => {
    init()
    fetchAddressStatus()
    return deinit
  }, [])
  const group: any = {}

  return (
    <ContainerWrapper>
      <HeaderWrapper>
        <ReturnIcon />
        <GroupTitle
          showGroupIcon={addressStatus?.isGroupPublic}
          title={groupFiService.groupIdToGroupName(groupId) ?? ''}
        />
        <MoreIcon to={'info'} />
      </HeaderWrapper>
      <ContentWrapper>
        {messageList
          .slice()
          .reverse()
          .map(({ messageId, sender, message, timestamp }) => ({
            messageId,
            sender: sender.slice(sender.length - 5),
            message: message,
            time: timestampFormater(timestamp, true) ?? '',
            avatar: IotaKeySVG
          }))
          .map((item) => (
            <NewMessageItem key={item.messageId} {...item} />
          ))}
      </ContentWrapper>
      <div className={classNames('flex-none basis-auto')}>
        <div className={classNames('px-5 pb-5')}>
          {addressStatus !== undefined ? (
            addressStatus?.marked &&
            addressStatus.isQualified &&
            !addressStatus.muted ? (
              <MessageInput />
            ) : (
              <ChatRoomButton
                marked={addressStatus.marked}
                muted={addressStatus.muted}
                qualified={addressStatus.isQualified}
              />
            )
          ) : (
            <ChatRoomLoadingButton />
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

function ChatRoomLoadingButton() {
  return (
    <button className={classNames('w-full rounded-2xl py-3 bg-[#F2F2F7]')}>
      Loading...
    </button>
  )
}

function ChatRoomButton(props: {
  marked: boolean
  qualified: boolean
  muted: boolean
}) {
  const { marked, qualified, muted } = props
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
              src={MuteRedSVG}
              className={classNames('inline-block mr-3 mt-[-3px]')}
            />
            <span>You are muted in this group</span>
          </>
        ) : qualified ? (
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
