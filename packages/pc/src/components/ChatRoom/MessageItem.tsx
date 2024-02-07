import { Link } from 'react-router-dom'
import { useEffect, useState, useRef, Dispatch, SetStateAction } from 'react'
import { createPortal } from 'react-dom'

import CopyMessageSVG from 'public/icons/copy-message.svg'
import ReplySVG from 'public/icons/reply.svg'
import { addressToUserName, copyText, classNames } from 'utils'
import MessageViewer from './MessageViewer'
import { useOneBatchUserProfile } from 'hooks'

import { QuotedMessage } from './index'

interface MessageItemInfo {
  avatar: string
  sender: string
  message: string
  time: string
  sentByMe?: boolean
  messageId: string
  onQuoteMessage: Dispatch<SetStateAction<QuotedMessage | undefined>>
  scrollElement: HTMLDivElement | null
}

export function parseMessageAndQuotedMessage(
  message: string
): [string, string | undefined] {
  if (message === null) {
    message = 'message is null'
  }
  const regex = /(\%\{quo:[^]+\})/
  let [realMessage, quotedMessage] = message.split(regex).filter(Boolean)

  if (quotedMessage !== undefined) {
    const cmdAndValue = quotedMessage.match(/\%\{quo:([^]+)\}/)
    if (cmdAndValue && cmdAndValue[1]) {
      quotedMessage = cmdAndValue[1]
    }
  }

  return [realMessage, quotedMessage]
}

export default function NewMessageItem({
  avatar,
  sender,
  message,
  time,
  sentByMe = false,
  messageId,
  onQuoteMessage,
  scrollElement
}: MessageItemInfo) {
  const timeRef = useRef<HTMLDivElement>(null)

  const { userProfileMap } = useOneBatchUserProfile([sender])

  const messageBodyRef = useRef<HTMLDivElement>(null)

  const [isContextMenuOpen, setIsContextMenuOpen] = useState<boolean>(false)
  const [menuPosition, setMenuPosition] = useState<'bottom' | 'top'>('bottom')

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
    }
  }, [])

  const [realMessage, quotedMessage] = parseMessageAndQuotedMessage(message)

  return (
    <div className={classNames('px-5 py-2.5', sentByMe ? 'pl-14' : '')}>
      <div
        className={classNames(
          'flex flex-row',
          sentByMe ? 'justify-end' : 'justify-start'
        )}
      >
        {!sentByMe && (
          <Link to={`/user/${sender}`}>
            <div
              className={classNames('flex-none w-9 h-9 border rounded-lg mr-3')}
            >
              <img src={avatar} className={classNames('rounded-lg')} />
            </div>
          </Link>
        )}
        <div
          className={classNames(
            'grow-0 shrink-1 basis-auto bg-[#F2F2F7] px-1.5 py-1 rounded-md relative'
          )}
          ref={messageBodyRef}
          onContextMenu={(event) => {
            event.preventDefault()
            const messageBodyElement = messageBodyRef.current

            if (messageBodyElement !== null && scrollElement !== null) {
              const bottom = messageBodyElement.getBoundingClientRect().bottom
              const totalHeight = scrollElement.clientHeight + 45
              const restHeight = totalHeight - bottom

              if (restHeight < 105) {
                setMenuPosition('top')
              } else {
                setMenuPosition('bottom')
              }

              console.log('====>restHeight', restHeight)

              setIsContextMenuOpen((s) => !s)
            }
          }}
        >
          <div>
            {!sentByMe && (
              <div className={classNames('text-xs font-semibold')}>
                {userProfileMap?.[sender]?.name ?? addressToUserName(sender)}
              </div>
            )}
            <div
              className={classNames('text-sm color-[#2C2C2E]')}
              style={{
                wordBreak: 'normal',
                overflowWrap: 'anywhere',
                whiteSpace: 'pre-wrap'
              }}
            >
              <MessageViewer message={realMessage} messageId={messageId} />
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

      {quotedMessage !== undefined && (
        <div
          className={classNames(
            'flex flex-row',
            sentByMe ? 'justify-end' : 'justify-start pl-12'
          )}
        >
          <div className={classNames('mt-1.5 py-1 bg-[#f5f5f5] max-w-full')}>
            <div
              className={classNames(
                'rounded-lg text-xs leading-[18px] px-1.5 two_line_ellipsis'
              )}
            >
              <MessageViewer message={quotedMessage} messageId={messageId} />
            </div>
          </div>
        </div>
      )}
      {isContextMenuOpen && messageBodyRef.current && (
        <ContextMenuWithMask
          sender={sender}
          scrollElement={scrollElement}
          avatar={avatar}
          sentByMe={sentByMe}
          setIsContextMenuOpen={setIsContextMenuOpen}
          realMessage={realMessage}
          messageElement={messageBodyRef.current}
          menuPosition={menuPosition}
          onQuoteMessage={onQuoteMessage}
        />
      )}
    </div>
  )
}

function ContextMenuWithMask(props: {
  sender: string
  messageElement: HTMLDivElement
  menuPosition: 'bottom' | 'top'
  sentByMe: boolean
  realMessage: string
  avatar: string
  scrollElement: HTMLDivElement | null
  onQuoteMessage: Dispatch<SetStateAction<QuotedMessage | undefined>>
  setIsContextMenuOpen: Dispatch<SetStateAction<boolean>>
}) {
  const {
    messageElement,
    menuPosition,
    sentByMe,
    realMessage,
    onQuoteMessage,
    setIsContextMenuOpen,
    sender,
    avatar,
    scrollElement
  } = props

  const rootElement = document.getElementById('root')

  const messageRect = messageElement.getBoundingClientRect()
  const rootRect = rootElement!.getBoundingClientRect()
  const scrollRect = scrollElement?.getBoundingClientRect()

  const isTooTop = messageRect.top < 45
  const isTooBottom =
    scrollRect && messageRect.bottom > scrollRect.height + scrollRect.top

  const mBorderLeftWidth = Math.round(messageRect.left - rootRect.left)
  const mBorderTopWidth = isTooTop
    ? 45
    : Math.round(messageRect.top - rootRect.top)
  const mBorderRightwidth = Math.round(rootRect.right - messageRect.right)
  const mBorderBottomWidth = isTooBottom
    ? rootRect.bottom - scrollRect.bottom
    : Math.round(rootRect.bottom - messageRect.bottom)

  return createPortal(
    <div
      style={{
        width: Math.round(messageRect.width),
        height:
          isTooBottom && isTooTop
            ? scrollRect.height
            : isTooTop
            ? messageRect.bottom - 45
            : isTooBottom
            ? scrollRect.bottom - messageRect.top
            : Math.round(messageRect.height),
        borderLeftWidth: mBorderLeftWidth,
        borderTopWidth: mBorderTopWidth,
        borderRightWidth: mBorderRightwidth,
        borderBottomWidth: mBorderBottomWidth,
        borderColor: 'rgba(51, 51, 51, 0.5)'
      }}
      className={classNames('absolute top-0 left-0 box-content rounded-2xl')}
      onClick={(event) => {
        event.stopPropagation()
        setIsContextMenuOpen(false)
      }}
    >
      <div className={classNames('w-full h-full overflow-hidden')}>
        <div
          className={classNames(
            'w-full h-full shadow-[0px_0px_0px_10px_rgba(51,51,51,0.5)] rounded-lg'
          )}
        ></div>
      </div>
      {!sentByMe && (
        <img
          src={avatar}
          className={classNames(
            'absolute left-[-48px] top-0 w-9 h-9 border rounded-lg'
          )}
        />
      )}
      <div
        className={classNames(
          menuPosition === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2',
          sentByMe ? 'right-0' : 'left-0',
          'absolute w-[132px] z-10 mt-2 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none'
        )}
      >
        {[
          {
            text: 'Copy',
            icon: CopyMessageSVG,
            onClick: (event: React.MouseEvent<HTMLDivElement>) => {
              const asyncFn = async () => {
                await copyText(realMessage)
                setIsContextMenuOpen(false)
              }
              asyncFn()
            }
          },
          {
            text: 'Reply',
            icon: ReplySVG,
            onClick: (event: React.MouseEvent<HTMLDivElement>) => {
              onQuoteMessage({
                sender: sender,
                message: realMessage
              })
              setIsContextMenuOpen(false)
            }
          }
        ].map(({ text, icon, onClick }, index) => (
          <div
            key={index}
            onClick={onClick}
            className={
              'flex w-full flex-row justify-between pl-4 py-4 pr-3 cursor-pointer'
            }
          >
            <span className={'text-sm leading-4'}>{text}</span>
            <img src={icon} />
          </div>
        ))}
      </div>
    </div>,
    rootElement!
  )
}
