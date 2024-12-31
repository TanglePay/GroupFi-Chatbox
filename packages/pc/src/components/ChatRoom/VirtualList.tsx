import {
  useVirtualizer,
  Range,
  defaultRangeExtractor,
  Virtualizer
} from '@tanstack/react-virtual'
import {
  memo,
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
} from 'groupfi-sdk-chat'
import { addressToUserName, addressToPngSrcV2, classNames } from 'utils'
import NewMessageItem from './MessageItem'
import DoubleArrow from 'public/icons/double-arrow.svg'
import { QuotedMessage } from './index'

// When the user is on the chat interface and scrolls up within 
// a distance of 240px, any new message notification will 
// automatically scroll to the latest message position.
const AutoSeeNewMessageOffset = 240

// When scrolling up, if there are only 5 previously loaded 
// messages left unread, older messages will start loading.
const PrevloadBuffer = 5

// The number of historical messages loaded each time
// during the upward screen scroll.
const previousPageMessageCount = 30

interface Rect {
  width: number
  height: number
}

export const RowVirtualizerDynamic = memo(
  (props: {
    onQuoteMessage: Dispatch<SetStateAction<QuotedMessage | undefined>>
    messageList: (IMessage | EventGroupMemberChanged)[]
    loadPrevPage: (size?: number) => Promise<number>
    groupId: string
  }) => {
    const { messageDomain } = useMessageDomain()
    const { messageList, groupId } = props
    const groupFiService = messageDomain.getGroupFiService()

    // The number of unread new messages.
    const [newMessageCount, setNewMessageCount] = useState(0)

    const fetchAndScrollHelperRef = useRef<{
      // Flag to indicate whether historical messages are being fetched.
      isFetching: boolean
      // Flag whether the scrollOffset of the virtualizer needs to be adjusted.
      scrollOffsetAdjusting: boolean
      // Mark what the startIndex of the virtualizer needs to be adjusted to.
      targetStartIndexAfterAdjust: number | undefined
      adjustDiff: number
      // Record the messageId of the latest message in the current messageList.
      latestMessageId: string | undefined
      // Mark whether the interface should stay at the latest message position.
      shouldScrollToLatest: boolean
      scrollElementHeight: number | undefined
      lastLoadPrevPageNumber: number | undefined
    }>({
      isFetching: false,
      scrollOffsetAdjusting: false,
      targetStartIndexAfterAdjust: undefined,
      adjustDiff: 0,
      latestMessageId: undefined,
      shouldScrollToLatest: true,
      scrollElementHeight: undefined,
      lastLoadPrevPageNumber: undefined
    })

    const loadPrevPage = useCallback(async () => {
      fetchAndScrollHelperRef.current.isFetching = true
      const fetchedNumber = await props.loadPrevPage(previousPageMessageCount)
      fetchAndScrollHelperRef.current.isFetching = false
      return fetchedNumber
    }, [])

    // ParentRef is bound to the chatroom div.
    const parentRef = useRef<HTMLDivElement>(null)

    // VirtualizerRef is used to store the state of the virtualizer 
    // from the previous rendering.
    const virtualizerRef = useRef<Virtualizer<HTMLDivElement, Element> | null>(
      null
    )

    // Compare the messageList from the previous render with the messageList 
    // from the current render to determine the different rendering logic.
    if (
      virtualizerRef.current &&
      virtualizerRef.current.options.count !== messageList.length
    ) {
      // The difference in the number of message items 
      // between the previous and current render.
      const delta = messageList.length - virtualizerRef.current.options.count

      // Determine if the difference in this messageList is due to the arrival of new messages.
      // Message type 1 is a regular message.
      const isNewMessage =
        fetchAndScrollHelperRef.current.latestMessageId !== undefined &&
        messageList.length > 0 &&
        messageList[0].type === 1 &&
        messageList[0].messageId !==
          fetchAndScrollHelperRef.current.latestMessageId

      // Message type 2 is a group join notification.
      // Determine if it is a group join notification.
      const isNewGroupMember =
        messageList.length > 0 && messageList[0].type === 2

      
      if (virtualizerRef.current.options.count === 0) { // This indicates that it is the first render.
        // When rendering the messages for the first time, 
        // it should stay at the latest message position.
        fetchAndScrollHelperRef.current.shouldScrollToLatest = true
      } else if (isNewMessage || isNewGroupMember) {  // If there is a new message or a new group join notification.
        // Get the total height occupied by all messages.
        const totalSize = virtualizerRef.current.getTotalSize()
        // Get the height of the chatroom div.
        const clientHeight = parentRef.current?.clientHeight ?? 485
        // The distance scrolled upward by the virtualizer when the interface remains at the latest message position.
        const bottomMostScrollOffset = totalSize - clientHeight
        // The distance scrolled upward from the latest message position.
        const userScrollOffset =
          bottomMostScrollOffset - (virtualizerRef.current.scrollOffset ?? 0)
        console.log('====>userScrollOffset', userScrollOffset)
        if (userScrollOffset <= AutoSeeNewMessageOffset) {
          // If the distance scrolled upward from the latest message position 
          // is less than 240, the interface will scroll back to the 
          // latest message position when a new message arrives.
          fetchAndScrollHelperRef.current.shouldScrollToLatest = true
        } else if (isNewMessage) {
          // Increment the count of unread new messages by 1.
          setNewMessageCount((s) => s + 1)
        }
      } else {
        // During the upward scrolling process to load historical messages, 
        // a new batch of historical messages may arrive, causing the messageList 
        // to change. If the indices of the rendered messages remain unchanged, 
        // the messages being rendered will actually differ.
        const { range } = virtualizerRef.current

        const startIndex = range?.startIndex ?? 0

        // Flag whether the scrollOffset of the virtualizer needs to be adjusted.
        fetchAndScrollHelperRef.current.scrollOffsetAdjusting = true
        // Mark what the startIndex of the virtualizer needs to be adjusted to.
        // The new message startIndex equals the old message startIndex plus 
        // the change value (delta).
        fetchAndScrollHelperRef.current.targetStartIndexAfterAdjust =
          startIndex + delta
      }
    }

    const virtualizer = useVirtualizer({
      count: messageList.length,
      getScrollElement: () => parentRef.current,
      // The virtual list only renders the messages visible within the 
      // screen range, so the actual height of the messages is unknown. 
      // Here, an estimated height for the messages is provided.
      estimateSize: (index: number) => {
        return 60
      },
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

          if (
            fetchAndScrollHelperRef.current.scrollElementHeight === undefined
          ) {
            fetchAndScrollHelperRef.current.scrollElementHeight = height
          } else if (
            fetchAndScrollHelperRef.current.scrollElementHeight !== height
          ) {
            const diff =
              fetchAndScrollHelperRef.current.scrollElementHeight - height

            if (diff > 0 && virtualizer.scrollOffset) {
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
            if (box.inlineSize > 0 && box.blockSize > 0) {
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
      rangeExtractor: (range: Range) => {
        const result = defaultRangeExtractor(range)
        return result
      }
    })

    if (
      fetchAndScrollHelperRef.current.scrollOffsetAdjusting &&
      virtualizer.range
    ) {
      virtualizer.scrollToIndex(
        fetchAndScrollHelperRef.current.targetStartIndexAfterAdjust!,
        { align: 'start' }
      )

      fetchAndScrollHelperRef.current.scrollOffsetAdjusting = false
    }

    const items = virtualizer.getVirtualItems()

    if (fetchAndScrollHelperRef.current.shouldScrollToLatest) {
      if (
        virtualizer.range &&
        virtualizer.range.endIndex === messageList.length - 1 &&
        // virtualizer.measureElementCache.size > 0
        virtualizer.measurementsCache.length > 0
      ) {
        fetchAndScrollHelperRef.current.shouldScrollToLatest = false
        setNewMessageCount(0)
      }
      virtualizer.scrollToIndex(messageList.length - 1, {align: 'end'})
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

      const autoLoadPrevPageCheck =
        messageList.length > 0 &&
        items[0] &&
        items[0].index <= PrevloadBuffer &&
        !fetchAndScrollHelperRef.current.isFetching &&
        !fetchAndScrollHelperRef.current.scrollOffsetAdjusting &&
        !fetchAndScrollHelperRef.current.shouldScrollToLatest &&
        (fetchAndScrollHelperRef.current.lastLoadPrevPageNumber === undefined ||
          fetchAndScrollHelperRef.current.lastLoadPrevPageNumber ===
            previousPageMessageCount)

      // auto load prev page
      if (autoLoadPrevPageCheck) {
        loadPrevPage()
          .then((res) => {
            fetchAndScrollHelperRef.current.lastLoadPrevPageNumber = res
          })
          .catch(() => {
            // load prev page error
            console.log('load prev page error')
            fetchAndScrollHelperRef.current.lastLoadPrevPageNumber = 0
          })
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
                const messageListIndex =
                  messageList.length - 1 - virtualRow.index
                const messageItem = messageList[messageListIndex]

                const comparedTimestamp: number | undefined =
                  messageList[messageListIndex + 1]?.timestamp

                return (
                  <div
                    key={
                      typeof virtualRow.key === 'bigint'
                        ? virtualRow.key.toString()
                        : virtualRow.key
                    }
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                  >
                    <MessageRender
                      comparedTimestamp={comparedTimestamp}
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
            {newMessageCount} new{' '}
            {newMessageCount === 1 ? 'message' : 'messages'}
          </div>
        )}
      </>
    )
  }
)

function MessageRender(props: {
  scrollElement: HTMLDivElement | null
  onQuoteMessage: Dispatch<SetStateAction<QuotedMessage | undefined>>
  message: IMessage | EventGroupMemberChanged
  groupFiService: GroupFiService
  comparedTimestamp?: number
}) {
  const { groupFiService, onQuoteMessage, scrollElement, comparedTimestamp } =
    props

  const currentAddress = groupFiService.getCurrentAddress()
  if (props.message.type === 1) {
    const { messageId, sender, timestamp, message, name, avatar } =
      props.message
    return (
      <NewMessageItem
        comparedTimestamp={comparedTimestamp}
        scrollElement={scrollElement}
        onQuoteMessage={onQuoteMessage}
        messageId={messageId}
        sender={sender}
        name={name}
        timestamp={timestamp}
        avatar={
          !!avatar
            ? avatar
            : addressToPngSrcV2(groupFiService.sha256Hash(sender))
        }
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
  const { address, name, avatar } = message

  return (
    <div className={classNames('px-5 flex flex-row py-2.5 justify-center')}>
      <div
        className={
          'px-2 py-1.5 flex bg-[#F2F2F7] dark:bg-black dark:text-white rounded-xl'
        }
      >
        <img
          src={
            !!avatar
              ? avatar
              : addressToPngSrcV2(groupFiService.sha256Hash(address))
          }
          className={'w-6 h-6 rounded-lg object-cover'}
        />
        <span className={'text-sm ml-2'}>
          “{name ?? addressToUserName(address)}” joined group
        </span>
      </div>
    </div>
  )
}
