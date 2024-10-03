import { classNames } from 'utils'
// @ts-ignore
import EmojiSVG from 'public/icons/emoji.svg?react'
// @ts-ignore
import MuteRedSVG from 'public/icons/mute-red.svg?react'
// @ts-ignore
import WarningSVG from 'public/icons/warning.svg?react'

import {
  ContainerWrapper,
  HeaderWrapper,
  ReturnIcon,
  HomeIcon,
  MoreIcon,
  GroupTitle,
  AppLoading
} from '../Shared'

import { useSearchParams, useParams } from 'react-router-dom'
import EmojiPicker, { EmojiStyle, EmojiClickData } from 'emoji-picker-react'
import { useEffect, useState, useRef, useCallback, Fragment } from 'react'
import {
  useMessageDomain,
  IMessage,
  EventGroupMemberChanged,
  GroupFiService,
  HeadKey
} from 'groupfi_chatbox_shared'

import { useAppSelector } from 'redux/hooks'
import useMyGroupConfig from 'hooks/useMyGroupConfig'

import { RowVirtualizerDynamic } from './VirtualList'

import MessageInput from './MessageInput'
import useWalletConnection from 'hooks/useWalletConnection'
import useRegistrationStatus from 'hooks/useRegistrationStatus'
import {
  GROUP_INFO_KEY,
  removeLocalParentStorage,
  setLocalParentStorage
} from 'utils/storage'
import useGroupMeta from 'hooks/useGroupMeta'

export interface QuotedMessage {
  sender: string
  message: string
  name?: string
}

export function ChatRoom(props: { groupId: string }) {
  const { groupId } = props
  const { groupName } = useGroupMeta(groupId)

  const { messageDomain } = useMessageDomain()
  const groupFiService = messageDomain.getGroupFiService()

  const isAnnouncement = messageDomain.isAnnouncementGroup(groupId)

  const [searchParams] = useSearchParams()

  const isHomeIcon = searchParams.get('home')

  const tailDirectionAnchorRef = useRef<{
    directionMostMessageId?: string
    chunkKeyForDirectMostMessageId?: string
  }>({})

  const fetchingMessageRef = useRef<{
    fetchingOldData: boolean
    fetchingNewData: boolean
  }>({
    fetchingOldData: false,
    fetchingNewData: false
  })

  const [messageList, setMessageList] = useState<
    Array<IMessage | EventGroupMemberChanged>
  >([])

  const fetchMessageToTailDirection = async (
    size: number = 20
  ): Promise<number> => {
    if (fetchingMessageRef.current.fetchingOldData) {
      return 0
    }
    fetchingMessageRef.current.fetchingOldData = true
    console.log(
      '====>fetchMessageToTailDirection',
      tailDirectionAnchorRef.current
    )
    const { chunkKeyForDirectMostMessageId, directionMostMessageId } =
      tailDirectionAnchorRef.current
    try {
      const { messages, ...rest } =
        await messageDomain.getConversationMessageList({
          groupId,
          key: chunkKeyForDirectMostMessageId ?? HeadKey,
          messageId: directionMostMessageId,
          direction: 'tail',
          size
        })
      console.log('====> fetchMessageToTailDirection', { ...messages }, rest)
      tailDirectionAnchorRef.current.chunkKeyForDirectMostMessageId =
        rest.chunkKeyForDirectMostMessageId
      if (rest.directionMostMessageId) {
        tailDirectionAnchorRef.current.directionMostMessageId =
          rest.directionMostMessageId
      }

      if (messages.length > 0) {
        const latestMessageId = messages[0].messageId

        if (
          headDirectionAnchorRef.current.directionMostMessageId === undefined
        ) {
          setMessageList((prev) => [...prev, ...messages.reverse()])
        } else {
          // messages is toward tail direction, so reverse it, then prepend to messageList
          setMessageList((prev) => [...messages.reverse(), ...prev])
        }

        if (
          headDirectionAnchorRef.current.directionMostMessageId === undefined
        ) {
          console.log(
            '====> fetchMessageToTailDirection set headDirectionAnchorRef',
            latestMessageId
          )
          headDirectionAnchorRef.current.directionMostMessageId =
            latestMessageId
        }
      }
      return messages.length
    } catch (e) {
      console.error(e)
      return 0
    } finally {
      fetchingMessageRef.current.fetchingOldData = false
    }
  }

  const headDirectionAnchorRef = useRef<{
    directionMostMessageId?: string
    chunkKeyForDirectMostMessageId?: string
  }>({})

  const fetchMessageToHeadDirection = async (size: number = 20) => {
    if (fetchingMessageRef.current.fetchingNewData) {
      return
    }
    if (headDirectionAnchorRef.current.directionMostMessageId === undefined) {
      return
    }
    fetchingMessageRef.current.fetchingNewData = true

    const { chunkKeyForDirectMostMessageId, directionMostMessageId } =
      headDirectionAnchorRef.current

    try {
      const { messages, ...rest } =
        await messageDomain.getConversationMessageList({
          groupId,
          key: chunkKeyForDirectMostMessageId ?? HeadKey,
          messageId: directionMostMessageId,
          direction: 'head',
          size: 5
        })

      console.log(
        '====>messages in fetchMessageToHeadDirection',
        {
          ...messages
        },
        rest
      )
      headDirectionAnchorRef.current.chunkKeyForDirectMostMessageId =
        rest.chunkKeyForDirectMostMessageId
      if (rest.directionMostMessageId) {
        console.log(
          '====> fetchMessageToHeadDirection set directionMostMessageId',
          rest.directionMostMessageId
        )
        headDirectionAnchorRef.current.directionMostMessageId =
          rest.directionMostMessageId
      }

      setMessageList((prev) => [...prev, ...messages])
    } catch (e) {
      console.error(e)
    } finally {
      fetchingMessageRef.current.fetchingNewData = false
    }
  }

  const fetchMessageToHeadDirectionWrapped = useCallback(async () => {
    if (headDirectionAnchorRef.current.directionMostMessageId === undefined) {
      await fetchMessageToTailDirection(20)
    } else {
      await fetchMessageToHeadDirection()
    }
  }, [groupId])

  const fetchMessageToTailDirectionWrapped = useCallback(
    async (size: number = 40) => {
      return await fetchMessageToTailDirection(size)
    },
    [groupId]
  )

  const onGroupMemberChanged = useCallback(
    (groupMemberChangedEvent: EventGroupMemberChanged) => {
      if (
        groupMemberChangedEvent.groupId ===
          groupFiService.addHexPrefixIfAbsent(groupId) &&
        groupMemberChangedEvent.isNewMember
      ) {
        setMessageList((prev) => [...prev, groupMemberChangedEvent])
      }
    },
    [groupId]
  )

  const init = useCallback(async () => {
    await fetchMessageToTailDirection(40)
    messageDomain.onConversationDataChanged(
      groupId,
      fetchMessageToHeadDirectionWrapped
    )
    messageDomain.onGroupMemberChanged(onGroupMemberChanged)
  }, [groupId])

  const deinit = () => {
    messageDomain.offGroupMemberChanged(onGroupMemberChanged)
    messageDomain.offConversationDataChanged(
      groupId,
      fetchMessageToHeadDirectionWrapped
    )
    messageDomain.offIsHasPublicKeyChanged(
      isHasPublicKeyChangedCallbackRef.current
    )
    messageDomain.navigateAwayFromGroup(groupId)
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
      isHasPublicKeyChangedCallbackRef.current = (value) => {
        const { isHasPublicKey } = value ?? {}
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

  const enteringGroup = async () => {
    await messageDomain.enteringGroupByGroupId(groupId)
    messageDomain.clearUnreadCount(groupId)
  }

  useEffect(() => {
    init()
    fetchAddressStatus()
    enteringGroup()

    return () => {
      setMessageList([])
      tailDirectionAnchorRef.current = {}
      fetchingMessageRef.current = {
        fetchingOldData: false,
        fetchingNewData: false
      }
      headDirectionAnchorRef.current = {}
      setQuotedMessage(undefined)
      deinit()
    }
  }, [groupId])

  const [isSending, setIsSending] = useState(false)

  const [quotedMessage, setQuotedMessage] = useState<QuotedMessage | undefined>(
    undefined
  )

  const isWalletConnected = useWalletConnection()
  const isRegistered = useRegistrationStatus()
  const renderChatRoomButtonForAllCase = () => {
    if (!isWalletConnected) {
      return <ChatRoomWalletConnectButton />
    }
    if (!isRegistered) {
      return <ChatRoomBrowseModeButton />
    }

    if (addressStatus === undefined) {
      return <ChatRoomLoadingButton />
    }

    if (isAnnouncement && !addressStatus.isQualified) {
      return null
    }

    if (
      addressStatus.marked &&
      addressStatus.isQualified &&
      !addressStatus.muted
    ) {
      if (isSending) {
        return <ChatRoomSendingButton />
      }
      return (
        <MessageInput
          onQuoteMessage={setQuotedMessage}
          groupId={groupId}
          onSend={setIsSending}
          quotedMessage={quotedMessage}
        />
      )
    }

    return (
      <div className={classNames('h-12')}>
        <ChatRoomButton
          groupId={groupId}
          marked={addressStatus.marked}
          muted={addressStatus.muted}
          qualified={addressStatus.isQualified}
          isHasPublicKey={addressStatus.isHasPublicKey}
          refresh={refresh}
          groupFiService={groupFiService}
        />
      </div>
    )
  }

  return (
    <ContainerWrapper>
      <HeaderWrapper>
        {isHomeIcon ? <HomeIcon /> : <ReturnIcon backUrl="/" />}
        <GroupTitle
          isAnnouncement={isAnnouncement}
          showAnnouncementIcon={isAnnouncement}
          showGroupPrivateIcon={addressStatus?.isGroupPublic === false}
          title={groupName}
        />
        <MoreIcon to={'info'} />
      </HeaderWrapper>
      <div
        className={classNames(
          'flex-1 overflow-x-hidden overflow-y-auto relative'
        )}
      >
        {messageList.length > 0 && (
          <RowVirtualizerDynamic
            onQuoteMessage={setQuotedMessage}
            messageList={messageList.slice().reverse()}
            groupFiService={groupFiService}
            loadPrevPage={fetchMessageToTailDirectionWrapped}
            groupId={groupId}
          />
        )}
      </div>
      <div className={classNames('flex-none basis-auto')}>
        <div className={classNames('px-5 pb-5')}>
          {renderChatRoomButtonForAllCase()}
        </div>
      </div>
    </ContainerWrapper>
  )
}

export function TrollboxEmoji(props: {
  messageInputRef: React.MutableRefObject<HTMLDivElement | null>
  lastRange: Range | undefined
}) {
  const { messageInputRef, lastRange } = props
  const [show, setShow] = useState(false)

  const [bottom, setBottom] = useState(0)

  useEffect(() => {
    const clientHeight = messageInputRef.current?.clientHeight ?? 0
    setBottom(clientHeight + 36 + 12)
  }, [messageInputRef.current?.clientHeight])

  return (
    <>
      <EmojiSVG
        className={classNames('flex-none cursor-pointer mr-2 dark:fill-white')}
        onClick={() => setShow((s) => !s)}
      />
      {show && (
        <div
          // className={classNames('absolute left-5 bottom-[76px]')}
          className={classNames('absolute left-5')}
          style={{
            width: 'calc(100% - 40px)',
            height: `calc(100% - ${bottom + 10}px)`,
            bottom: bottom
          }}
        >
          <EmojiPicker
            width={'100%'}
            height={'100%'}
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
                lastRange.collapse(false)

                const selection = getSelection()
                selection!.removeAllRanges()
                selection!.addRange(lastRange)
              }

              setShow(false)
            }}
          />
        </div>
      )}
    </>
  )
}

function ChatRoomButtonLoading() {
  return (
    <div className={classNames('loader-spinner loader-spinner-md')}>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  )
}

function ChatRoomLoadingButton(props: { label?: String }) {
  const { label } = props
  return (
    <button className={classNames('w-full rounded-2xl py-3 h-12')}>
      <div className={classNames('py-[7px] flex items-center justify-center')}>
        {!!label ? (
          <Fragment>
            <ChatRoomButtonLoading />
            <div
              className={classNames(
                'text-base font-bold text-[#333] dark:text-white ml-2'
              )}
            >
              {label}
            </div>
          </Fragment>
        ) : // <Loading marginTop="mt-0" type="dot-typing" />
        null}
      </div>
    </button>
  )
}

export function ChatRoomSendingButton() {
  return (
    <button
      className={classNames(
        'w-full h-12 rounded-2xl py-3 bg-[#F2F2F7] dark:bg-gray-700'
      )}
    >
      Sending...
    </button>
  )
}

function ChatRoomBrowseModeButton() {
  const { messageDomain } = useMessageDomain()
  return (
    <button
      onClick={() => {
        messageDomain.setUserBrowseMode(false)
      }}
      className={classNames(
        'w-full bg-accent-600 dark:bg-accent-500 h-12 rounded-2xl py-3 text-white'
      )}
    >
      Create Account
    </button>
  )
}
function ChatRoomWalletConnectButton() {
  return (
    <button
      className={classNames(
        'w-full h-12 rounded-2xl py-3 text-accent-600 dark:text-accent-500 cursor-default flex items-center justify-center'
      )}
    >
      <WarningSVG />
      <div className="ml-2 overflow-hidden whitespace-nowrap text-ellipsis">
        Connect your wallet to unlock more
      </div>
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
  // const [loading, setLoading] = useState(false)
  const [loadingLabel, setLoadingLabel] = useState('')

  if (!!loadingLabel) {
    return <ChatRoomLoadingButton label={loadingLabel} />
  }
  const isJoinOrMark = !muted && (qualified || !marked)

  return (
    <button
      className={classNames(
        'w-full rounded-2xl py-3',
        // marked || muted ? 'bg-[#F2F2F7] dark:bg-gray-700' : 'bg-primary',
        // muted || marked ? 'bg-transparent' : 'bg-primary',
        isJoinOrMark ? 'bg-accent-500' : 'bg-transparent',
        !isJoinOrMark ? 'pointer-events-none cursor-default' : ''
      )}
      onClick={async () => {
        if (qualified || !marked) {
          // setLoading(true)
          setLoadingLabel(qualified ? 'Joining in' : 'Subscribing')
          const promise = qualified
            ? messageDomain.joinGroup(groupId)
            : messageDomain.markGroup(groupId)

          await promise
          refresh()
          // setLoading(false)
          setLoadingLabel('')
        }
      }}
    >
      <span
        className={classNames(
          'text-base',
          isJoinOrMark
            ? 'text-white'
            : muted
            ? 'text-[#D53554]'
            : 'text-accent-600 dark:text-accent-500'
          // muted ? 'text-[#D53554]' : marked ? 'text-[#3671EE]' : 'text-white'
        )}
      >
        {muted ? (
          <>
            <MuteRedSVG className={classNames('inline-block mr-3 mt-[-3px]')} />
            <span>You are muted in this group</span>
          </>
        ) : qualified ? (
          'JOIN'
        ) : marked ? (
          <MarkedContent groupFiService={groupFiService} groupId={groupId} />
        ) : (
          'SUBSCRIBE'
        )}
      </span>
    </button>
  )
}

function MarkedContent(props: {
  groupId: string
  groupFiService: GroupFiService
}) {
  const { groupFiService, groupId } = props

  const groupMeta = useGroupMeta(groupId)
  const {
    qualifyType,
    groupName,
    contractAddress,
    tokenThresValue,
    chainId,
    symbol,
    collectionName
  } = groupMeta
  const isToken: Boolean =
    qualifyType === 'token' && contractAddress !== undefined

  const [tokenInfo, setTokenInfo] = useState<
    | { TotalSupply: string; Decimals: number; Name: string; Symbol: string }
    | undefined
  >(undefined)

  const fetchTokenTotalBalance = async () => {
    const res = await groupFiService.fetchTokenTotalBalance(
      contractAddress,
      chainId
    )
    setTokenInfo(res)
  }

  useEffect(() => {
    if (isToken && !symbol) {
      fetchTokenTotalBalance()
    }
  }, [])

  if (isToken && !symbol && tokenInfo === undefined) {
    return ''
  }

  if (qualifyType === 'event') {
    return (
      <div className={classNames('flex items-center justify-center')}>
        <WarningSVG />
        <span
          className={classNames(
            'font-medium mx-1 inline-block truncate align-bottom'
          )}
        >
          {symbol}
        </span>
      </div>
    )
  }

  return (
    <div className={classNames('flex items-center justify-center')}>
      <WarningSVG />
      <span className={classNames('ml-2')}>Own</span>
      <span
        className={classNames(
          'font-medium mx-1 inline-block truncate align-bottom'
        )}
        style={{
          maxWidth: `calc(100% - 140px)`
        }}
      >
        {qualifyType === 'nft'
          ? collectionName ?? groupName
          : isToken
          ? `${tokenThresValue} ${!!symbol ? symbol : tokenInfo?.Symbol}`
          : null}
      </span>
      <span>to speak</span>
    </div>
  )
}

export default () => {
  const myGroupConfig = useMyGroupConfig()
  const activeTab = useAppSelector((state) => state.appConifg.activeTab)
  const params = useParams()
  const groupId = params.id
  const nodeInfo = useAppSelector((state) => state.appConifg.nodeInfo)
  useEffect(() => {
    if (groupId) {
      setLocalParentStorage(GROUP_INFO_KEY, { groupId }, nodeInfo)
    }
    return () => {
      removeLocalParentStorage(GROUP_INFO_KEY, nodeInfo)
    }
  }, [groupId])
  if (!groupId) {
    return null
  }

  // Ensure that myGroups config data has been loaded.
  if (activeTab === 'ofMe') {
    if (myGroupConfig === undefined || myGroupConfig.length === 0) {
      return <AppLoading />
    }
  }

  return <ChatRoom groupId={groupId} />
}
