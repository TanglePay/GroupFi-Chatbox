import { useRef, useState, useEffect, Dispatch, SetStateAction } from 'react'

import PlusSVG from 'public/icons/plus-sm.svg'
import CancelSVG from 'public/icons/error.svg'
import sdkReceiver from 'sdk'
import { useMessageDomain } from 'groupfi_trollbox_shared'
import { addressToUserName, classNames } from 'utils'
import { QuotedMessage, TrollboxEmoji } from './index'
import { Modal } from '../Shared'
import MessageViewer from './MessageViewer'

export default function MessageInput({
  groupId,
  onSend,
  onQuoteMessage,
  quotedMessage
}: {
  groupId: string
  onQuoteMessage: Dispatch<SetStateAction<QuotedMessage | undefined>>
  quotedMessage?: QuotedMessage
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
        {/* <img
          onClick={() => {
            setMessageInputAlertType(2)
          }}
          className={classNames('flex-none mr-2 cursor-pointer')}
          src={MessageSVG}
        /> */}
        <TrollboxEmoji
          messageInputRef={messageInputRef}
          lastRange={lastRange}
        />
        <div
          className={classNames(
            'flex-1 max-w-full overflow-hidden flex flex-col-reverse'
          )}
        >
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
                let messageText = event.currentTarget.textContent

                if (messageText === null || messageText.trim() === '') {
                  setMessageInputAlertType(1)
                  return
                }

                if (quotedMessage !== undefined) {
                  const quotedMessageStr = `${addressToUserName(
                    quotedMessage.sender
                  )}: ${quotedMessage.message}`
                  messageText = `${messageText}%{quo:${quotedMessageStr}}`
                }

                console.log('====> messageText:', messageText)

                onSend(true)
                try {
                  const { messageSent, blockId } =
                    await messageDomain.sendMessageToGroup(groupId, messageText)

                  sdkReceiver.emitEvent({
                    method: 'send_a_message',
                    messageData: {
                      blockId,
                      message: messageSent.message
                    }
                  })

                  messageDomain.onSentMessage(messageSent)
                  onQuoteMessage(undefined)
                } catch (e) {
                  console.error(e)
                } finally {
                  onSend(false)
                }
              }
            }}
            style={{
              wordBreak: 'normal',
              overflowWrap: 'anywhere',
              whiteSpace: 'pre-wrap',
              maxHeight: 150,
              overflow: 'auto'
            }}
            contentEditable={true}
            className="bg-white border-0 rounded py-1.5 text-sm pl-2.5 text-gray-900 placeholder:text-black/50 placeholder:text-sm outline-none"
            placeholder="Type Message..."
          ></div>
          {quotedMessage && (
            <div className="flex w-full m-w-full overflow-hidden flex-row bg-white rounded-lg mb-1 pl-2 py-[1px]">
              <div className={classNames(' flex-1 text-xs overflow-hidden')}>
                <div className={classNames('font-medium mb-0.5')}>
                  {addressToUserName(quotedMessage.sender)}
                </div>
                <div className={classNames('truncate')}>
                  <MessageViewer
                    message={quotedMessage.message}
                    groupId={groupId}
                  />
                </div>
              </div>
              <div
                className={classNames(
                  'flex-none w-ful cursor-pointer w-6 m-auto pl-2'
                )}
                onClick={() => {
                  onQuoteMessage(undefined)
                }}
              >
                <img src={CancelSVG} />
              </div>
            </div>
          )}
        </div>
        <img
          onClick={() => {
            setMessageInputAlertType(2)
          }}
          className={classNames('flex-none cursor-pointer ml-2')}
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
