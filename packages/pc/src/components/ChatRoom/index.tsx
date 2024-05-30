import { classNames } from 'utils'
// @ts-ignore
import EmojiSVG from 'public/icons/emoji.svg?react'

// @ts-ignore
import MuteRedSVG from 'public/icons/mute-red.svg?react'
import {
  ContainerWrapper,
  HeaderWrapper,
  ReturnIcon,
  HomeIcon,
  MoreIcon,
  GroupTitle,
  Loading,
  GroupFiServiceWrapper
} from '../Shared'
import { MessageGroupMeta } from 'iotacat-sdk-core'

import { useSearchParams, useParams } from 'react-router-dom'
import EmojiPicker, { EmojiStyle, EmojiClickData } from 'emoji-picker-react'
import { useEffect, useState, useRef, useCallback } from 'react'
import {
  useMessageDomain,
  IMessage,
  EventGroupMemberChanged,
  GroupFiService,
  HeadKey,
  ShimmerMode
} from 'groupfi_chatbox_shared'

import { addGroup } from 'redux/myGroupsSlice'
import { useAppDispatch } from 'redux/hooks'
import Decimal from 'decimal.js'

import { RowVirtualizerDynamic } from './VirtualList'

import MessageInput from './MessageInput'
import useWalletConnection from 'hooks/useWalletConnection'
import useRegistrationStatus from 'hooks/useRegistrationStatus'

// hard code, copy from back end
const SOON_TOKEN_ID =
  '0x0884298fe9b82504d26ddb873dbd234a344c120da3a4317d8063dbcf96d356aa9d0100000000'

const GFTEST1_TOKEN_ID = '0xcFEf46C76168ba18071d0A5a403c3DaF181F9EEc'

const GFTEST2_TOKEN_ID = '0xfDbc4c5b14A538Aa2F6cD736b525C8e9532C5FA6'

function getTokenNameFromTokenId(
  tokenId: string,
  groupFiService: GroupFiService
) {
  const smrTokenId = groupFiService.addHexPrefixIfAbsent(
    groupFiService.sha256Hash('smr')
  )
  console.log('==> smrTokenId', smrTokenId)
  switch (tokenId) {
    case SOON_TOKEN_ID:
      return 'SOON'
    case GFTEST1_TOKEN_ID:
      return 'GFTEST1'
    case GFTEST2_TOKEN_ID:
      return 'GFTEST2'
    case smrTokenId:
      return 'SMR'
    default:
      return 'Unknown token'
  }
}

export interface QuotedMessage {
  sender: string
  message: string
}

export function ChatRoom(props: { groupId: string }) {
  const { groupId } = props

  const { messageDomain } = useMessageDomain()
  const groupFiService = messageDomain.getGroupFiService()

  const [searchParams] = useSearchParams()

  const isHomeIcon = searchParams.get('home')
  const isAnnouncement = searchParams.get('announcement') === 'true'

  console.log('====> searchParams', isHomeIcon, isAnnouncement)

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

      // if (messages.length) {
      //   setMessageList((prev) => {
      //     // append to prev, then reverse, then dedup, then reverse
      //     const merged = [...prev, ...messages].reverse()
      //     const seenMessageId = new Set<string>()
      //     const deduped = []
      //     for (const message of merged) {
      //       if (!seenMessageId.has(message.messageId)) {
      //         seenMessageId.add(message.messageId)
      //         deduped.push(message)
      //       }
      //     }
      //     return deduped.reverse()
      //   })
      // }
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
  }, [])

  const fetchMessageToTailDirectionWrapped = useCallback(
    async (size: number = 40) => {
      return await fetchMessageToTailDirection(size)
    },
    []
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
    []
  )

  const init = useCallback(async () => {
    await fetchMessageToTailDirection(40)
    messageDomain.onConversationDataChanged(
      groupId,
      fetchMessageToHeadDirectionWrapped
    )
    messageDomain.onGroupMemberChanged(onGroupMemberChanged)
  }, [])

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
    console.log('ChatRoom useEffect')
    init()
    fetchAddressStatus()
    enteringGroup()

    return () => {
      deinit()
    }
  }, [])

  const [isSending, setIsSending] = useState(false)

  const [quotedMessage, setQuotedMessage] = useState<QuotedMessage | undefined>(
    undefined
  )

  const isUserBrowseMode = messageDomain.isUserBrowseMode()
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
  }
  return (
    <ContainerWrapper>
      <HeaderWrapper>
        {isHomeIcon ? <HomeIcon /> : <ReturnIcon />}
        <GroupTitle
          showAnnouncementIcon={isAnnouncement}
          showGroupPrivateIcon={addressStatus?.isGroupPublic === false}
          title={groupFiService.groupIdToGroupName(groupId) ?? ''}
        />
        <MoreIcon to={'info'} />
      </HeaderWrapper>
      <div
        className={classNames(
          'flex-1 overflow-x-hidden overflow-y-auto relative'
        )}
      >
        <RowVirtualizerDynamic
          onQuoteMessage={setQuotedMessage}
          messageList={messageList.slice().reverse()}
          groupFiService={groupFiService}
          loadPrevPage={fetchMessageToTailDirectionWrapped}
          groupId={groupId}
        />
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

  return (
    <>
      <EmojiSVG
        className={classNames('flex-none cursor-pointer mr-2')}
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

function ChatRoomLoadingButton() {
  return (
    <button className={classNames('w-full rounded-2xl py-3 bg-[#F2F2F7] dark:bg-gray-700')}>
      <div className={classNames('py-[7px]')}>
        <Loading marginTop="mt-0" type="dot-typing" />
      </div>
    </button>
  )
}

function ChatRoomSendingButton() {
  return (
    <button className={classNames('w-full rounded-2xl py-3 bg-[#F2F2F7] dark:bg-gray-700')}>
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
      className={classNames('w-full rounded-2xl py-3 bg-primary text-white')}
    >
      Create Account
    </button>
  )
}
function ChatRoomWalletConnectButton() {
  const { messageDomain } = useMessageDomain()
  return (
    <button
      className={classNames(
        'w-full rounded-2xl py-3 bg-[#F2F2F7] text-[#3671EE] cursor-default'
      )}
    >
      Connect your wallet to unlock more
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

  const groupMeta = groupFiService.getGroupMetaByGroupId(groupId)

  if (groupMeta === undefined) {
    return null
  }

  const { qualifyType, groupName, tokenId } = groupMeta

  if (loading) {
    return <ChatRoomLoadingButton />
  }

  return (
    <button
      className={classNames(
        'w-full rounded-2xl py-3',
        marked || muted ? 'bg-[#F2F2F7] dark:bg-gray-700' : 'bg-primary'
      )}
      onClick={async () => {
        if (qualified || !marked) {
          setLoading(true)
          const promise = qualified
            ? messageDomain.joinGroup(groupId)
            : messageDomain.markGroup(groupId)

          await promise
          appDispatch(
            addGroup({
              groupId,
              groupName:
                groupFiService.groupIdToGroupName(groupId) ??
                'unknown groupName',
              qualifyType: qualifyType ?? 'unknown qualifyType'
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
            <MuteRedSVG
              className={classNames('inline-block mr-3 mt-[-3px]')}
            />
            <span>You are muted in this group</span>
          </>
        ) : qualified ? (
          'JOIN'
        ) : marked ? (
          <MarkedContent
            messageGroupMeta={groupMeta}
            groupFiService={groupFiService}
          />
        ) : (
          'SUBSCRIBE'
        )}
      </span>
    </button>
  )
}

function MarkedContent(props: {
  messageGroupMeta: MessageGroupMeta
  groupFiService: GroupFiService
}) {
  const { messageGroupMeta, groupFiService } = props
  const { qualifyType, groupName, tokenId, tokenThres, chainId } =
    messageGroupMeta

  return (
    <div>
      <span>Own</span>
      <span
        className={classNames(
          'font-medium mx-1 inline-block max-w-[124px] truncate align-bottom'
        )}
      >
        {qualifyType === 'nft' ? (
          groupName
        ) : qualifyType === 'token' && tokenId !== undefined ? (
          <TokenGroupMarkedContent
            tokenId={tokenId}
            chainId={chainId}
            groupFiService={groupFiService}
            tokenThres={tokenThres}
          />
        ) : null}
      </span>
      <span>to speak</span>
    </div>
  )
}

function TokenGroupMarkedContent(props: {
  tokenId: string
  chainId: number
  tokenThres: string
  groupFiService: GroupFiService
}) {
  const { chainId, tokenId, tokenThres, groupFiService } = props

  const [tokenInfo, setTokenInfo] = useState<
    { TotalSupply: string; Decimals: number } | undefined
  >(undefined)

  const fetchTokenTotalBalance = async () => {
    const res = await groupFiService.fetchTokenTotalBalance(tokenId, chainId)
    setTokenInfo(res)
  }

  useEffect(() => {
    fetchTokenTotalBalance()
  }, [])

  if (tokenInfo === undefined) {
    return '...'
  }

  const tokenName = getTokenNameFromTokenId(tokenId, groupFiService)

  const commonDecimal = new Decimal(tokenInfo.TotalSupply)
    .times(new Decimal(tokenThres))
    .div(new Decimal(`1e${tokenInfo.Decimals}`))

  const specificTokenThresDecimal =
    chainId === 0 ? commonDecimal : commonDecimal.div('1e4')

  return `${specificTokenThresDecimal.ceil()} ${tokenName}`
}

export default () => {
  const params = useParams()
  const groupId = params.id
  if (!groupId) {
    return null
  }
  return <ChatRoom groupId={groupId} />
}

// <GroupFiServiceWrapper<{ groupFiService: GroupFiService; groupId: string }>
//   component={ChatRoom}
//   paramsMap={{
//     id: 'groupId'
//   }}
// />
