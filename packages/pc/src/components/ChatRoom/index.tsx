import { classNames, timestampFormater } from 'utils'
import IotaKeySVG from 'public/avatars/iotakey.svg'
import MessageSVG from 'public/icons/message.svg'
import EmojiSVG from 'public/icons/emoji.svg'
import PlusSVG from 'public/icons/plus-sm.svg'
import MuteRedSVG from 'public/icons/mute-red.svg'
import {
  ContainerWrapper,
  HeaderWrapper,
  ReturnIcon,
  MoreIcon,
  GroupTitle,
  Loading,
  GroupFiServiceWrapper
} from '../Shared'
import { ScrollDebounce, addressToUserName } from 'utils'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  useMessageDomain,
  IMessage,
  GroupFiService
} from 'groupfi_trollbox_shared'

function ChatRoom(props: { groupId: string; groupFiService: GroupFiService }) {
  const { groupId, groupFiService } = props
  const userAddress = groupFiService.getUserAddress()

  const { messageDomain } = useMessageDomain()

  const anchorRef = useRef<{
    firstMessageId?: string
    lastMessageId?: string
    lastMessageChunkKey?: string
  }>({})
  const [messageList, setMessageList] = useState<IMessage[]>([])
  //async getConversationMessageList({groupId,key,startMessageId, untilMessageId,size}:{groupId: string, key?: string, startMessageId?: string, untilMessageId?:string, size?: number}) {

  const fetchMessageFromEnd = async (size: number = 20) => {
    // log
    console.log('fetchMessageFromEnd', anchorRef.current)
    const { lastMessageId, lastMessageChunkKey, firstMessageId } =
      anchorRef.current
    const { messages, ...rest } =
      await messageDomain.getConversationMessageList({
        groupId,
        key: lastMessageChunkKey,
        startMessageId: lastMessageId,
        size
        // untilMessageId: lastMessageId
      })
    if (messages.length === 0) {
      return false
    }
    anchorRef.current = Object.assign(anchorRef.current, rest)
    if (!anchorRef.current.firstMessageId) {
      anchorRef.current.firstMessageId = messages[0].messageId
    }
    setMessageList((prev) => [...prev, ...messages])
    return messages.length === size
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
    console.log('entering fetchAddressStatus')
    try {
      const status = await groupFiService.getAddressStatusInGroup(groupId)
      console.log('***Address Status', status)
      setAddressStatus(status)
    } catch (e) {
      console.error(e)
    }
  }

  const refresh = useCallback(() => {
    setAddressStatus((s) =>
      s !== undefined ? { ...s, marked: true } : undefined
    )
  }, [addressStatus])

  const scrollDebounceRef = useRef(new ScrollDebounce(fetchMessageFromEnd))


  const enteringGroup = async () => {
    await groupFiService.enteringGroupByGroupId(groupId)
  }

  useEffect(() => {
    console.log('ChatRoom useEffect')
    init()
    fetchAddressStatus()
    enteringGroup()
    return () => {
      deinit()
      messageDomain.clearUnreadCount(groupId)
    }
  }, [])
  const group: any = {}

  const [isSending, setIsSending] = useState(false)

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
      <div
        className={classNames('flex-1 overflow-x-hidden overflow-y-scroll')}
        onScroll={(event) => {
          if (scrollDebounceRef.current !== null) {
            scrollDebounceRef.current.onScroll(
              (event.target as HTMLDivElement).scrollTop
            )
          }
        }}
      >
        <div className={classNames('flex flex-col-reverse')}>
          {messageList
            .slice()
            // .reverse()
            .map(({ messageId, sender, message, timestamp }) => ({
              messageId,
              sender: addressToUserName(sender),
              message: message,
              time: timestampFormater(timestamp, true) ?? '',
              avatar: IotaKeySVG,
              sentByMe: sender === userAddress
            }))
            .map((item) => (
              <NewMessageItem
                isLatest={messageList[0].messageId === item.messageId}
                key={item.messageId}
                {...item}
              />
            ))}
        </div>
      </div>
      <div className={classNames('flex-none basis-auto')}>
        <div className={classNames('px-5 pb-5')}>
          {addressStatus !== undefined ? (
            addressStatus?.marked &&
            addressStatus.isQualified &&
            !addressStatus.muted ? (
              isSending ? (
                <ChatRoomSendingButton />
              ) : (
                <MessageInput groupId={groupId} onSend={setIsSending} />
              )
            ) : (
              <ChatRoomButton
                groupId={groupId}
                marked={addressStatus.marked}
                muted={addressStatus.muted}
                qualified={addressStatus.isQualified}
                refresh={refresh}
                groupFiService={groupFiService}
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
function MessageInput({
  groupId,
  onSend
}: {
  groupId: string
  onSend: (_: boolean) => void
}) {
  const { messageDomain } = useMessageDomain()
  return (
    <div className={classNames('w-full bg-[#F2F2F7] rounded-2xl')}>
      <div className={classNames('flex flex-row p-2 items-end')}>
        <img
          className={classNames('flex-none mr-2 cursor-pointer')}
          src={MessageSVG}
        />
        <div
          onKeyDown={async (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              onSend(true)
              try {
                const { messageSent } = await messageDomain
                  .getGroupFiService()
                  .sendMessageToGroup(groupId, event.currentTarget.innerText)
                messageDomain.onSentMessage(messageSent)
              } catch (e) {
                console.error(e)
              } finally {
                onSend(false)
              }
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
      <div className={classNames('py-[7px]')}>
        <Loading marginTop="mt-0" type="dot-typing" />
      </div>
    </button>
  )
}
function ChatRoomSendingButton() {
  return (
    <button className={classNames('w-full rounded-2xl py-3 bg-[#F2F2F7]')}>
      Sending...
    </button>
  )
}
function ChatRoomButton(props: {
  groupId: string
  marked: boolean
  qualified: boolean
  muted: boolean
  refresh: () => void
  groupFiService: GroupFiService
}) {
  const { marked, qualified, muted, groupId, refresh, groupFiService } = props

  const [loading, setLoading] = useState(false)

  if (loading) {
    return <ChatRoomLoadingButton />
  }

  return (
    <button
      className={classNames(
        'w-full rounded-2xl py-3',
        marked || muted ? 'bg-[#F2F2F7]' : 'bg-primary'
      )}
      onClick={async () => {
        if (qualified || !marked) {
          setLoading(true)
          await groupFiService.joinGroup(groupId)
          refresh()
          setLoading(false)
        }
      }}
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
  isLatest: boolean
}

function NewMessageItem({
  avatar,
  sender,
  message,
  time,
  sentByMe = false,
  isLatest
}: MessageItemInfo) {
  const timeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timeElement = timeRef.current
    if (timeElement !== null) {
      // Calculate message time position
      if ((timeElement.parentNode as HTMLDivElement).clientHeight > 20) {
        const left =
          timeElement.offsetLeft -
          (timeElement.parentNode as HTMLDivElement).offsetLeft
        timeElement.style.width = `calc(100% - ${left + 2}px)`
      }

      // scroll latest message into view
      if (isLatest) {
        timeElement.scrollIntoView({
          behavior: 'instant'
        })
      }
    }
  }, [])

  return (
    <div
      className={classNames(
        'px-5 flex flex-row mb-5',
        sentByMe ? 'justify-end pl-14' : 'justify-start'
      )}
    >
      {!sentByMe && (
        <div className={classNames('flex-none w-9 h-9 border rounded-lg mr-3')}>
          <img src={avatar} />
        </div>
      )}
      <div
        className={classNames(
          'grow-0 shrink-1 basis-auto bg-[#F2F2F7] px-1.5 py-1 rounded-md'
        )}
      >
        <div>
          {!sentByMe && (
            <div className={classNames('text-xs font-semibold')}>{sender}</div>
          )}
          <div className={classNames('text-sm color-[#2C2C2E]')}>
            {message}
            <div
              ref={timeRef}
              className={classNames(
                'text-xxs text-right inline-block font-light text-[#666668] whitespace-nowrap pl-1.5'
              )}
            >
              {time}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default () => (
  <GroupFiServiceWrapper<{ groupFiService: GroupFiService; groupId: string }>
    component={ChatRoom}
    paramsMap={{
      id: 'groupId'
    }}
  />
)
