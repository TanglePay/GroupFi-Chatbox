import { classNames, timestampFormater } from 'utils'
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
  GroupFiServiceWrapper,
  Modal
} from '../Shared'
import { ScrollDebounce, addressToUserName, addressToPngSrc } from 'utils'
import EmojiPicker, {
  Emoji,
  EmojiStyle,
  EmojiClickData
} from 'emoji-picker-react'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  useMessageDomain,
  IMessage,
  GroupFiService
} from 'groupfi_trollbox_shared'

import { addGroup } from 'redux/myGroupsSlice'
import { useAppDispatch } from 'redux/hooks'

const GroupFiEmojiTag = 'groupfi-emoji'
function formGroupFiEmojiValue(unified: string) {
  return `%{emo:${unified}}`
}
function formNewLineValue() {
  return `%{newLine:}`
}

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
  const init = useCallback(async () => {
    console.log(
      '====>isEventSourceDomainStartListeningPushService',
      messageDomain.isEventSourceDomainStartListeningPushService()
    )
    if (!messageDomain.isEventSourceDomainStartListeningPushService()) {
      messageDomain.onEventSourceDomainStartListeningPushService(init)
      return
    }
    messageDomain.onConversationDataChanged(
      groupId,
      fetchMessageUntilStartWrapped
    )
    await fetchMessageFromEnd()
  }, [])

  const deinit = () => {
    messageDomain.offConversationDataChanged(
      groupId,
      fetchMessageUntilStartWrapped
    )
    messageDomain.offIsHasPublicKeyChanged(
      isHasPublicKeyChangedCallbackRef.current
    )
    messageDomain.offEventSourceDomainStartListeningPushService(init)
  }

  const [addressStatus, setAddressStatus] = useState<{
    isGroupPublic: boolean
    marked: boolean
    muted: boolean
    isQualified: boolean
    isHasPublicKey: boolean
  }>()
  const isHasPublicKeyChangedCallbackRef = useRef<
    (param: { isHasPublicKey: boolean }) => void
  >(() => {})
  const fetchAddressStatus = async () => {
    console.log('entering fetchAddressStatus')
    try {
      const status = await groupFiService.getAddressStatusInGroup(groupId)
      const isHasPublicKey = messageDomain.getIsHasPublicKey()
      const appStatus = {
        ...status,
        isHasPublicKey
      }
      console.log('***Address Status', status)
      isHasPublicKeyChangedCallbackRef.current = ({ isHasPublicKey }) => {
        console.log('***isHasPublicKeyChangedCallbackRef', isHasPublicKey)
        setAddressStatus((prev) => {
          if (prev !== undefined) {
            return { ...prev, isHasPublicKey }
          }
          return prev
        })
      }
      messageDomain.onIsHasPublicKeyChanged(
        isHasPublicKeyChangedCallbackRef.current
      )
      setAddressStatus(appStatus)
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
    await messageDomain.enteringGroupByGroupId(groupId)
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
          {!messageDomain.isEventSourceDomainStartListeningPushService() ? (
            <Loading />
          ) : (
            messageList
              .slice()
              // .reverse()
              .map(({ messageId, sender, message, timestamp }) => ({
                messageId,
                sender,
                message: message,
                time: timestampFormater(timestamp) ?? '',
                avatar: addressToPngSrc(groupFiService.sha256Hash, sender),
                sentByMe: sender === userAddress
              }))
              .map((item) => (
                <NewMessageItem
                  isLatest={messageList[0].messageId === item.messageId}
                  key={item.messageId}
                  {...item}
                />
              ))
          )}
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
                isHasPublicKey={addressStatus.isHasPublicKey}
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

const messageTextHandler = {
  textNode(childNode: ChildNode) {
    const { nodeValue } = childNode
    return nodeValue
  },
  elementNode(childNode: HTMLElement) {
    let { nodeName } = childNode
    nodeName = nodeName.toLocaleLowerCase()
    if (nodeName === 'img') {
      return this.imgElementNode(childNode)
    } else {
      console.warn('Unexpected nodename:', nodeName)
    }
  },
  checkIsTextNode(childNode: ChildNode) {
    return childNode.nodeType === 3
  },
  checkIsElementNode(childNode: ChildNode) {
    return childNode.nodeType === 1
  },
  checkIsImgElement(childNode: ChildNode) {
    return (
      this.checkIsElementNode(childNode) &&
      childNode.nodeName.toLowerCase() === 'img'
    )
  },
  checkIsBrElement(childNode: ChildNode) {
    return (
      this.checkIsElementNode(childNode) &&
      childNode.nodeName.toLowerCase() === 'br'
    )
  },
  imgElementNode(childNode: HTMLElement) {
    const dataset = childNode.dataset
    const { tag, value } = dataset
    if (tag === GroupFiEmojiTag && value !== undefined) {
      return value
    }
    console.warn('Unexpected img element:', childNode)
    return undefined
  }
  // br 比较特别，单独处理
}

function MessageInput({
  groupId,
  onSend
}: {
  groupId: string
  onSend: (_: boolean) => void
}) {
  const { messageDomain } = useMessageDomain()

  const messageInputRef = useRef<HTMLDivElement | null>(null)

  const [lastRange, setLastRange] = useState<Range | undefined>(undefined)

  const [messageInputAlertType, setMessageInputAlertType] = useState<
    number | undefined
  >(undefined)

  const messageInputfocus = () => {
    const htmlDivElement = messageInputRef.current
    if (htmlDivElement !== null) {
      htmlDivElement.focus()
    }
  }

  useEffect(() => {
    messageInputfocus()
  }, [])

  return (
    <div className={classNames('w-full bg-[#F2F2F7] rounded-2xl relative')}>
      <div className={classNames('flex flex-row p-2 items-end')}>
        <img
          onClick={() => {
            setMessageInputAlertType(2)
          }}
          className={classNames('flex-none mr-2 cursor-pointer')}
          src={MessageSVG}
        />
        <div
          ref={messageInputRef}
          onBlur={function (event: React.FocusEvent) {
            const seletion = getSelection()
            const range = seletion?.getRangeAt(0)
            setLastRange(range)
          }}
          onPaste={function (event: React.ClipboardEvent) {
            event.preventDefault()
            let paste = event.clipboardData.getData('text')
            const selection = window.getSelection()
            if (selection === null || !selection.rangeCount) {
              return
            }
            selection.deleteFromDocument()
            selection.getRangeAt(0).insertNode(document.createTextNode(paste))
            selection.collapseToEnd()
          }}
          onKeyDown={async (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              const messageText = event.currentTarget.textContent
              console.log('messageText:', messageText)

              if (messageText === null || messageText.trim() === '') {
                setMessageInputAlertType(1)
                return
              }

              onSend(true)
              try {
                const { messageSent } = await messageDomain
                  .getGroupFiService()
                  .sendMessageToGroup(groupId, messageText)
                messageDomain.onSentMessage(messageSent)
              } catch (e) {
                console.error(e)
              } finally {
                onSend(false)
              }
            }
          }}
          style={{
            wordBreak: 'normal',
            overflowWrap: 'anywhere'
          }}
          contentEditable={true}
          className="flex-1 bg-white border-0 mr-2 rounded py-1.5 text-sm pl-2.5 text-gray-900 placeholder:text-black/50 placeholder:text-sm outline-none"
          placeholder="Type Message..."
        ></div>
        <TrollboxEmoji
          messageInputRef={messageInputRef}
          lastRange={lastRange}
        />
        <img
          onClick={() => {
            setMessageInputAlertType(2)
          }}
          className={classNames('flex-none cursor-pointer')}
          src={PlusSVG}
        />
      </div>

      {messageInputAlertType && (
        <MessageInputAlert
          type={messageInputAlertType}
          hide={() => {
            setMessageInputAlertType(undefined)
            messageInputfocus()
          }}
        />
      )}
    </div>
  )
}

function TrollboxEmoji(props: {
  messageInputRef: React.MutableRefObject<HTMLDivElement | null>
  lastRange: Range | undefined
}) {
  const { messageInputRef, lastRange } = props
  const [show, setShow] = useState(false)

  return (
    <>
      <img
        className={classNames('flex-none cursor-pointer mr-2')}
        src={EmojiSVG}
        onClick={() => setShow((s) => !s)}
      />
      {show && (
        <div className={classNames('absolute top-[-460px] left-[-5px]')}>
          <EmojiPicker
            emojiStyle={EmojiStyle.TWITTER}
            previewConfig={{
              showPreview: false
            }}
            skinTonesDisabled={true}
            onEmojiClick={function (
              emojiData: EmojiClickData,
              event: MouseEvent
            ) {
              console.log('selected emoji', emojiData)
              const { imageUrl, emoji, unified } = emojiData
              const img = document.createElement('img')
              img.src = imageUrl
              img.alt = emoji
              // img.dataset['tag'] = GroupFiEmojiTag
              // img.dataset['value'] = formGroupFiEmojiValue(unified)
              img.innerText = `%{emo:${unified}}`
              img.className = 'emoji_in_message_input'
              if (lastRange !== undefined) {
                lastRange.insertNode(img)
                const range = document.createRange()
                range.selectNodeContents(messageInputRef.current!)
                range.collapse(false)
                const selection = getSelection()
                selection!.removeAllRanges()
                selection!.addRange(range)
              }
              setShow(false)
            }}
          />
        </div>
      )}
    </>
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
  isHasPublicKey: boolean
  refresh: () => void
  groupFiService: GroupFiService
}) {
  const appDispatch = useAppDispatch()
  const {
    marked,
    qualified,
    muted,
    isHasPublicKey,
    groupId,
    refresh,
    groupFiService
  } = props
  const { messageDomain } = useMessageDomain()
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
        if (!isHasPublicKey) {
          alert('still not has public key')
          return
        }
        if (qualified || !marked) {
          setLoading(true)
          await (qualified
            ? messageDomain.joinGroup(groupId)
            : groupFiService.markGroup(groupId))
          appDispatch(
            addGroup({
              groupId,
              groupName: groupFiService.groupIdToGroupName(groupId) ?? 'unknown'
            })
          )
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
  messageId: string
}

function NewMessageItem({
  avatar,
  sender,
  message,
  time,
  sentByMe = false,
  isLatest,
  messageId
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
        'px-5 flex flex-row mt-2.5 mb-2.5',
        sentByMe ? 'justify-end pl-14' : 'justify-start'
      )}
    >
      {!sentByMe && (
        <div className={classNames('flex-none w-9 h-9 border rounded-lg mr-3')}>
          <img src={avatar} className={classNames('rounded-lg')} />
        </div>
      )}
      <div
        className={classNames(
          'grow-0 shrink-1 basis-auto bg-[#F2F2F7] px-1.5 py-1 rounded-md'
        )}
      >
        <div>
          {!sentByMe && (
            <div className={classNames('text-xs font-semibold')}>
              {addressToUserName(sender)}
            </div>
          )}
          <div
            className={classNames('text-sm color-[#2C2C2E]')}
            style={{
              wordBreak: 'normal',
              overflowWrap: 'anywhere'
            }}
          >
            <MessageViewer message={message} messageId={messageId} />
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

export function MessageViewer(props: { message: string; messageId: string }) {
  let { message, messageId } = props
  if (message === null) {
    message = 'message is null->bug'
    console.log('======>message is null', messageId)
  }
  const regex = /(%{[^}]+})/
  const matches = message.split(regex).filter(Boolean)
  const elements: (
    | {
        type: 'text'
        value: string
      }
    | {
        type: 'emo'
        value: string
      }
  )[] = matches.map((m) => {
    const cmdAndValue = m.match(/%{(\w+):([\w\-]+)}/)
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
      }
    }
    return {
      type: 'text',
      value: m
    }
  })

  return elements.map(({ type, value }) => {
    if (type === 'text') {
      return value
    } else if (type === 'emo') {
      return (
        <div className={classNames('inline-block align-sub')}>
          <Emoji unified={value} size={16} emojiStyle={EmojiStyle.TWITTER} />
        </div>
      )
    }
  })
}

// type 1: Unable to send blank message
// type 2: Coming soon, style tuned
function MessageInputAlert(props: { hide: () => void; type: number }) {
  const { hide, type } = props
  const content =
    type === 1 ? 'Unable to send blank message' : 'Coming soon, stay tuned'
  return (
    <Modal show={true} hide={hide}>
      <div className={classNames('w-[334px] bg-white rounded-2xl font-medium')}>
        <div className={classNames('text-center pt-6 pb-8')}>{content}</div>
        <div
          className={classNames(
            'text-center border-t py-3 text-sky-400 cursor-pointer'
          )}
          onClick={hide}
        >
          OK
        </div>
      </div>
    </Modal>
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
