import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState, useRef, Dispatch, SetStateAction } from 'react'
import { createPortal } from 'react-dom'

// @ts-ignore
import CopyMessageSVG from 'public/icons/copy-message.svg?react'
// @ts-ignore
import ReplySVG from 'public/icons/reply.svg?react'
import {
  addressToUserName,
  copyText,
  classNames,
  checkIsSameDay,
  dateFormater,
  timeFormater
} from 'utils'
import MessageViewer from './MessageViewer'
import { useOneBatchUserProfile } from 'hooks'

import { QuotedMessage } from './index'
import { useMessageDomain } from 'groupfi-sdk-chat'

interface MessageItemInfo {
  avatar: string
  sender: string
  message: string
  timestamp: number
  name?: string
  sentByMe?: boolean
  messageId: string
  onQuoteMessage: Dispatch<SetStateAction<QuotedMessage | undefined>>
  scrollElement: HTMLDivElement | null
  comparedTimestamp?: number
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

export function parseOriginFromRealMessage(
  message: string
): [string, string | undefined] {
  if (message === null) {
    // for finding bug
    message = 'message is null'
  }
  const regex = /(\%\{ori:[^]+\})/
  let [realMessageWithoutOrigin, originContent] = message
    .split(regex)
    .filter(Boolean)
  if (originContent !== undefined) {
    const cmdAndValue = originContent.match(/\%\{ori:([^]+)\}/)
    if (cmdAndValue && cmdAndValue[1]) {
      originContent = cmdAndValue[1]
    }
  }
  return [realMessageWithoutOrigin, originContent]
}

export default function NewMessageItem({
  avatar,
  sender,
  name,
  message,
  timestamp,
  sentByMe = false,
  messageId,
  onQuoteMessage,
  scrollElement,
  comparedTimestamp
}: MessageItemInfo) {
  const { messageDomain } = useMessageDomain()
  const groupFiService = messageDomain.getGroupFiService()

  const timeRef = useRef<HTMLDivElement>(null)

  const currentAddress = groupFiService.getCurrentAddress()

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
  const [realMessageWithoutOrigin, originContent] =
    parseOriginFromRealMessage(realMessage)
  const location = useLocation()
  return (
    <div>
      {comparedTimestamp !== undefined &&
        !checkIsSameDay(comparedTimestamp, timestamp) && (
          <div className={classNames('text-center text-xs text-[#666668]')}>
            {dateFormater(timestamp, true)}
          </div>
        )}
      <div className={classNames('px-5 py-1.5', sentByMe ? 'pl-14' : '')}>
        <div
          className={classNames(
            'flex flex-row',
            sentByMe ? 'justify-end' : 'justify-start'
          )}
        >
          {!sentByMe && (
            <Link
              to={{
                pathname: `/user/${sender}`,
                search: `?from=${encodeURIComponent(location.pathname)}`
              }}
            >
              <div
                className={classNames(
                  'flex-none w-9 h-9 border rounded-lg mr-3 dark:border-[#333333]'
                )}
              >
                <img src={avatar} className={classNames('rounded-lg object-cover w-full h-full')} />
              </div>
            </Link>
          )}
          <div
            className={classNames(
              'grow-0 shrink-1 basis-auto bg-[#F2F2F7] dark:bg-[#3C3D3F] px-1.5 py-1 rounded-md relative'
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
              <div
                className={classNames(
                  'text-xs dark:text-white font-semibold flex items-center'
                )}
              >
                {name ?? addressToUserName(sender)}
                {originContent && (
                  <span
                    className={classNames(
                      'text-[10px] ml-1 text-[#666668] dark:text-[#B0B0B0]'
                    )}
                  >
                    @{originContent}
                  </span>
                )}
              </div>
              <div
                className={classNames(
                  'text-sm color-[#2C2C2E] dark:text-white'
                )}
                style={{
                  wordBreak: 'normal',
                  overflowWrap: 'anywhere',
                  whiteSpace: 'pre-wrap'
                }}
              >
                <MessageViewer
                  isSelf={currentAddress === sender}
                  message={realMessageWithoutOrigin}
                  messageId={messageId}
                  ifMessageIncludeOriginContent={false}
                  ifShowImg={true}
                />
                <div
                  ref={timeRef}
                  className={classNames(
                    'text-xxs text-right block font-light text-[#666668] dark:text-[#B0B0B0] whitespace-nowrap pl-1.5'
                  )}
                >
                  {timeFormater(timestamp)}
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
            <div
              className={classNames(
                'mt-1.5 py-1 bg-[#f5f5f5] dark:bg-[#2A2A2A] dark:text-white max-w-full'
              )}
            >
              <div
                className={classNames(
                  'rounded-lg text-xs leading-[18px] px-1.5 two_line_ellipsis'
                )}
              >
                <MessageViewer
                  message={quotedMessage}
                  messageId={messageId}
                  ifMessageIncludeOriginContent={true}
                  ifShowImg={true}
                />
              </div>
            </div>
          </div>
        )}
        {isContextMenuOpen && messageBodyRef.current && (
          <ContextMenuWithMask
            sender={sender}
            name={name}
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
    </div>
  )
}

function ContextMenuWithMask(props: {
  sender: string
  name?: string
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
    name,
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
        borderBottomWidth: mBorderBottomWidth
      }}
      className={classNames(
        'absolute top-0 left-0 box-content rounded-2xl border-[#33333380] dark:border-[#ffffff40]'
      )}
      onClick={(event) => {
        event.stopPropagation()
        setIsContextMenuOpen(false)
      }}
    >
      <div className={classNames('w-full h-full overflow-hidden')}>
        <div
          className={classNames(
            'w-full h-full shadow-[0px_0px_0px_10px_rgba(51,51,51,0.5)] dark:shadow-[0px_0px_0px_10px_rgba(255,255,255,0.25)] rounded-lg'
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
          'absolute w-[132px] z-10 mt-2 origin-top-right divide-y divide-gray-100 dark:divide-gray-700 rounded-md bg-white dark:bg-[#3C3D3F] dark:text-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none'
        )}
      >
        {[
          {
            text: 'Copy',
            icon: <CopyMessageSVG fill={'white'} />,
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
            icon: <ReplySVG />,
            onClick: (event: React.MouseEvent<HTMLDivElement>) => {
              onQuoteMessage({
                sender: sender,
                name: name,
                message: realMessage,
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
            {icon}
          </div>
        ))}
      </div>
    </div>,
    rootElement!
  )
}
