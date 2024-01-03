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
  useState
} from 'react'

import {
  GroupFiService,
  IMessage,
  useMessageDomain
} from 'groupfi_trollbox_shared'
import { timestampFormater, addressToPngSrc } from 'utils'
import { NewMessageItem } from './index'
import DoubleArrow from 'public/icons/double-arrow.svg'

const AutoSeeNewMessageOffset = 240

export function RowVirtualizerDynamic(props: {
  messageList: IMessage[]
  groupFiService: GroupFiService
  loadPrevPage: () => Promise<void>
  groupId: string
}) {
  const { messageDomain } = useMessageDomain()
  const { messageList, groupFiService, groupId } = props
  const userAddress = groupFiService.getUserAddress()

  const [newMessageCount, setNewMessageCount] = useState(0)

  const fetchAndScrollHelperRef = useRef<{
    isFetching: boolean
    scrollOffsetAdjusting: boolean
    targetStartIndexAfterAdjust: number | undefined
    adjustDiff: number
    latestMessageId: string | undefined
    shouldScrollToLatest: boolean
  }>({
    isFetching: false,
    scrollOffsetAdjusting: false,
    targetStartIndexAfterAdjust: undefined,
    adjustDiff: 0,
    latestMessageId: undefined,
    shouldScrollToLatest: false
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
      messageList[0].messageId !==
        fetchAndScrollHelperRef.current.latestMessageId

    if (virtualizerRef.current.options.count === 0) {
      // const nextOffset = delta * 60
      // virtualizerRef.current.scrollOffset = nextOffset
      fetchAndScrollHelperRef.current.shouldScrollToLatest = true
    } else if (!isNewMessage) {
      // 首先需要判断是新消息来了，还是旧消息来了

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
    } else {
      const totalSize = virtualizerRef.current.getTotalSize()
      const clientHeight = parentRef.current?.clientHeight ?? 485
      const bottomMostScrollOffset = totalSize - clientHeight
      const userScrollOffset =
        bottomMostScrollOffset - virtualizerRef.current.scrollOffset
      console.log('====>userScrollOffset', userScrollOffset)
      if (userScrollOffset <= AutoSeeNewMessageOffset) {
        fetchAndScrollHelperRef.current.shouldScrollToLatest = true
      } else {
        setNewMessageCount((s) => s + 1)
      }
    }
  }

  const virtualizer = useVirtualizer({
    count: messageList.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 0,
    getItemKey: (index: number) => {
      const messageItem = messageList[messageList.length - 1 - index]
      return messageItem.messageId
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

  if (fetchAndScrollHelperRef.current.shouldScrollToLatest) {
    if (
      virtualizer.range &&
      virtualizer.range.endIndex === messageList.length - 1 &&
      virtualizer.measureElementCache.size > 0
    ) {
      fetchAndScrollHelperRef.current.shouldScrollToLatest = false
      setNewMessageCount(0)
    }
    virtualizer.scrollToIndex(messageList.length - 1, { align: 'end' })
  }

  const items = virtualizer.getVirtualItems()

  useLayoutEffect(() => {
    virtualizerRef.current = virtualizer
    fetchAndScrollHelperRef.current.latestMessageId = messageList[0]?.messageId
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
      !fetchAndScrollHelperRef.current.scrollOffsetAdjusting
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

              const { messageId, sender, timestamp, message } = messageItem

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                >
                  <NewMessageItem
                    messageId={messageId}
                    sender={sender}
                    time={timestampFormater(timestamp) ?? ''}
                    avatar={addressToPngSrc(groupFiService.sha256Hash, sender)}
                    message={message}
                    sentByMe={sender === userAddress}
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
