import {
  useVirtualizer,
  Range,
  defaultRangeExtractor,
  Virtualizer
} from '@tanstack/react-virtual'
import {
  useCallback,
  useEffect,
  useRef,
  useLayoutEffect,
  useState,
  Dispatch,
  SetStateAction
} from 'react'

import {
  GroupFiService,
  IMessage,
  EventGroupMemberChanged,
  useMessageDomain
} from 'groupfi_trollbox_shared'
import {
  timestampFormater,
  addressToUserName,
  addressToPngSrc,
  classNames
} from 'utils'
import NewMessageItem from './MessageItem'
import DoubleArrow from 'public/icons/double-arrow.svg'
import { QuotedMessage } from './index'
import { useOneBatchUserProfile } from 'hooks'

const AutoSeeNewMessageOffset = 240

interface Rect {
  width: number
  height: number
}

export function RowVirtualizerDynamic(props: {
  onQuoteMessage: Dispatch<SetStateAction<QuotedMessage | undefined>>
  messageList: (IMessage | EventGroupMemberChanged)[]
  groupFiService: GroupFiService
  loadPrevPage: (size?: number) => Promise<void>
  groupId: string
}) {
  const { messageDomain } = useMessageDomain()
  const { messageList, groupFiService, groupId } = props

  const [newMessageCount, setNewMessageCount] = useState(0)

  const fetchAndScrollHelperRef = useRef<{
    isFetching: boolean
    scrollOffsetAdjusting: boolean
    targetStartIndexAfterAdjust: number | undefined
    adjustDiff: number
    latestMessageId: string | undefined
    shouldScrollToLatest: boolean
    scrollElementHeight: number | undefined
  }>({
    isFetching: false,
    scrollOffsetAdjusting: false,
    targetStartIndexAfterAdjust: undefined,
    adjustDiff: 0,
    latestMessageId: undefined,
    shouldScrollToLatest: false,
    scrollElementHeight: undefined
  })

  const loadPrevPage = useCallback(async () => {
    fetchAndScrollHelperRef.current.isFetching = true
    await props.loadPrevPage()
    fetchAndScrollHelperRef.current.isFetching = false
  }, [])

  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizerRef = useRef<Virtualizer<HTMLDivElement, Element> | null>(
    null
  )

  if (
    virtualizerRef.current &&
    virtualizerRef.current.options.count !== messageList.length
  ) {
    const delta = messageList.length - virtualizerRef.current.options.count

    const isNewMessage =
      fetchAndScrollHelperRef.current.latestMessageId !== undefined &&
      messageList.length > 0 &&
      messageList[0].type === 1 &&
      messageList[0].messageId !==
        fetchAndScrollHelperRef.current.latestMessageId

    const isNewGroupMember = messageList.length > 0 && messageList[0].type === 2

    if (virtualizerRef.current.options.count === 0) {
      // const nextOffset = delta * 60
      // virtualizerRef.current.scrollOffset = nextOffset
      fetchAndScrollHelperRef.current.shouldScrollToLatest = true
    } else if (isNewMessage || isNewGroupMember) {
      const totalSize = virtualizerRef.current.getTotalSize()
      const clientHeight = parentRef.current?.clientHeight ?? 485
      const bottomMostScrollOffset = totalSize - clientHeight
      const userScrollOffset =
        bottomMostScrollOffset - virtualizerRef.current.scrollOffset
      console.log('====>userScrollOffset', userScrollOffset)
      if (userScrollOffset <= AutoSeeNewMessageOffset) {
        fetchAndScrollHelperRef.current.shouldScrollToLatest = true
      } else if (isNewMessage) {
        setNewMessageCount((s) => s + 1)
      }
    } else {
      const { range, measurementsCache, scrollOffset } = virtualizerRef.current

      const startIndex = range?.startIndex ?? 0

      const nextOffset = measurementsCache
        .slice(startIndex, delta - 2)
        .reduce((acc, cur) => {
          acc += cur.size
          return acc
        }, scrollOffset)

      fetchAndScrollHelperRef.current.scrollOffsetAdjusting = true
      fetchAndScrollHelperRef.current.targetStartIndexAfterAdjust =
        startIndex + delta - 1

      virtualizerRef.current.scrollOffset = nextOffset
    }
  }

  const virtualizer = useVirtualizer({
    count: messageList.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 0,
    observeElementRect: (
      instance: Virtualizer<HTMLDivElement, Element>,
      cb: (rect: Rect) => void
    ) => {
      const element = instance.scrollElement
      if (!element) {
        return
      }

      const handler = (rect: Rect) => {
        const { width, height } = rect
        cb({ width: Math.round(width), height: Math.round(height) })

        if (fetchAndScrollHelperRef.current.scrollElementHeight === undefined) {
          fetchAndScrollHelperRef.current.scrollElementHeight = height
        } else if (
          fetchAndScrollHelperRef.current.scrollElementHeight !== height
        ) {
          const diff =
            fetchAndScrollHelperRef.current.scrollElementHeight - height

          if (diff > 0) {
            virtualizer.scrollToOffset(virtualizer.scrollOffset + diff)
          }

          fetchAndScrollHelperRef.current.scrollElementHeight = height
        }
      }

      handler(element.getBoundingClientRect())

      const observer = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (entry?.borderBoxSize) {
          const box = entry.borderBoxSize[0]
          if (box) {
            handler({ width: box.inlineSize, height: box.blockSize })

            return
          }
        }
        handler(element.getBoundingClientRect())
      })

      observer.observe(element, { box: 'border-box' })

      return () => {
        observer.unobserve(element)
      }
    },
    getItemKey: (index: number) => {
      const messageItem = messageList[messageList.length - 1 - index]
      if (messageItem.type === 1) {
        return messageItem.messageId
      } else if (messageItem.type === 2) {
        return messageItem.address + messageItem.timestamp
      } else {
        throw new Error('Unknown type', messageItem)
      }
    },
    initialOffset: virtualizerRef.current?.scrollOffset ?? 0,
    rangeExtractor: (range: Range) => {
      const result = defaultRangeExtractor(range)
      return result
    }
  })

  virtualizer.getVirtualItems()

  if (
    fetchAndScrollHelperRef.current.scrollOffsetAdjusting &&
    virtualizer.range
  ) {
    const targetStartIndex =
      fetchAndScrollHelperRef.current.targetStartIndexAfterAdjust!
    let adjustCount = 0
    fetchAndScrollHelperRef.current.adjustDiff =
      virtualizer.range.startIndex - targetStartIndex

    while (virtualizer.range.startIndex !== targetStartIndex) {
      if (adjustCount === 40) {
        break
      }
      const diff = virtualizer.range.startIndex - targetStartIndex
      virtualizer.scrollOffset =
        virtualizer.scrollOffset +
        virtualizer.measurementsCache[virtualizer.range.startIndex].size *
          (diff > 0 ? -1 : 1)
      virtualizer.getVirtualItems()
      adjustCount++
    }
    fetchAndScrollHelperRef.current.scrollOffsetAdjusting = false
  }

  const items = virtualizer.getVirtualItems()

  if (fetchAndScrollHelperRef.current.shouldScrollToLatest) {
    if (
      virtualizer.range &&
      virtualizer.range.endIndex === messageList.length - 1 &&
      virtualizer.measureElementCache.size > 0
    ) {
      console.log('===> messageList.length', messageList.length)
      console.log('===> virtualizer', virtualizer)
      fetchAndScrollHelperRef.current.shouldScrollToLatest = false
      setNewMessageCount(0)
    }
    virtualizer.scrollToIndex(messageList.length - 1, { align: 'end' })
  }

  useLayoutEffect(() => {
    virtualizerRef.current = virtualizer
    if (messageList[0]?.type === 1) {
      fetchAndScrollHelperRef.current.latestMessageId =
        messageList[0]?.messageId
    }
  })

  useEffect(() => {
    if (virtualizer.range && newMessageCount > 0) {
      const endIndex = virtualizer.range.endIndex
      const lastestMessageIndex = virtualizer.options.count - 1
      if (endIndex + newMessageCount > lastestMessageIndex) {
        setNewMessageCount(Math.max(0, lastestMessageIndex - endIndex))
      }
    }
    if (
      items[0] &&
      items[0].index <= 5 &&
      !fetchAndScrollHelperRef.current.isFetching &&
      !fetchAndScrollHelperRef.current.scrollOffsetAdjusting &&
      !fetchAndScrollHelperRef.current.shouldScrollToLatest
    ) {
      console.log('====> Enter loadPrevPage')
      loadPrevPage()
    }
  }, [items, virtualizer.scrollOffset])

  const cleanUpRef = useRef<{
    unreadCount: number
    lastTimeReadLatestMessageTimestamp: number
  } | null>(null)

  useEffect(() => {
    if (messageList.length > 0) {
      const latestReadMessage = messageList[newMessageCount]
      cleanUpRef.current = {
        unreadCount: newMessageCount,
        lastTimeReadLatestMessageTimestamp: latestReadMessage.timestamp
      }
    }
  }, [messageList, newMessageCount])

  useEffect(() => {
    return () => {
      if (cleanUpRef.current !== null) {
        messageDomain.setUnreadCount(
          groupId,
          cleanUpRef.current.unreadCount,
          cleanUpRef.current.lastTimeReadLatestMessageTimestamp
        )
      }
    }
  }, [])

  return (
    <>
      <div
        ref={parentRef}
        className="List"
        style={{
          height: '100%',
          overflowY: 'auto',
          contain: 'strict'
        }}
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: '100%',
            position: 'relative'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${items[0]?.start ?? 0}px)`
            }}
          >
            {items.map((virtualRow) => {
              const messageItem =
                messageList[messageList.length - 1 - virtualRow.index]

              // const { messageId, sender, timestamp, message } = messageItem
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                >
                  <MessageRender
                    scrollElement={parentRef.current}
                    onQuoteMessage={props.onQuoteMessage}
                    message={messageItem}
                    groupFiService={groupFiService}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {newMessageCount > 0 && (
        <div
          className={
            'cursor-pointer bg-white py-1 px-2 shadow-md rounded-3xl text-green-400 absolute right-4 bottom-2 border text-xs'
          }
          onClick={() => {
            virtualizer.scrollToIndex(messageList.length - 1)
            setNewMessageCount(0)
          }}
        >
          <img
            src={DoubleArrow}
            className={'inline-block w-2 mx-1 align-baseline'}
          />
          {newMessageCount} new {newMessageCount === 1 ? 'message' : 'messages'}
        </div>
      )}
    </>
  )
}

function MessageRender(props: {
  scrollElement: HTMLDivElement | null
  onQuoteMessage: Dispatch<SetStateAction<QuotedMessage | undefined>>
  message: IMessage | EventGroupMemberChanged
  groupFiService: GroupFiService
}) {
  const { groupFiService, onQuoteMessage, scrollElement } = props

  const currentAddress = groupFiService.getCurrentAddress()
  if (props.message.type === 1) {
    const { messageId, sender, timestamp, message } = props.message
    return (
      <NewMessageItem
        scrollElement={scrollElement}
        onQuoteMessage={onQuoteMessage}
        messageId={messageId}
        sender={sender}
        time={timestampFormater(timestamp) ?? ''}
        avatar={addressToPngSrc(groupFiService.sha256Hash, sender)}
        message={message}
        sentByMe={sender === currentAddress}
      />
    )
  } else if (props.message.type === 2) {
    return (
      <GroupMemberItem
        message={props.message}
        groupFiService={groupFiService}
      />
    )
  } else {
    throw new Error('Unknown message type')
  }
}

function GroupMemberItem(props: {
  message: EventGroupMemberChanged
  groupFiService: GroupFiService
}) {
  const { message, groupFiService } = props
  const { address } = message

  const { userProfileMap } = useOneBatchUserProfile([address])

  return (
    <div className={classNames('px-5 flex flex-row py-2.5 justify-center')}>
      <div className={'px-2 py-1.5 flex bg-[#F2F2F7] rounded-xl'}>
        <img
          src={addressToPngSrc(groupFiService.sha256Hash, address)}
          className={'w-6 h-6 rounded-lg'}
        />
        <span className={'text-sm ml-2'}>
          “{userProfileMap?.[address]?.name ?? addressToUserName(address)}”
          joined group
        </span>
      </div>
    </div>
  )
}
