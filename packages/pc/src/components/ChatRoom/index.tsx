import { classNames, isGroupIdEqual, getCurrentTimestamp } from 'utils'
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

import { useSearchParams, useParams, useNavigate } from 'react-router-dom'
import EmojiPicker, { EmojiStyle, EmojiClickData } from 'emoji-picker-react'
import {
  useEffect,
  useState,
  useRef,
  useCallback,
  Fragment,
  useMemo
} from 'react'
import {
  useMessageDomain,
  IMessage,
  EventGroupMemberChanged,
  GroupFiService,
  HeadKey
} from 'groupfi-sdk-chat'

import { useAppDispatch, useAppSelector } from 'redux/hooks'
import useMyGroupConfig from 'hooks/useMyGroupConfig'

import { RowVirtualizerDynamic } from './VirtualList'

import MessageInput from './MessageInput'
import useWalletConnection from 'hooks/useWalletConnection'
import useUserBrowseMode from 'hooks/useUserBrowseMode'
import useRegistrationStatus from 'hooks/useRegistrationStatus'
import {
  getLocalParentStorage,
  GROUP_INFO_KEY,
  removeLocalParentStorage,
  setLocalParentStorage
} from 'utils/storage'
import useGroupMeta from 'hooks/useGroupMeta'
import useIncludesAndExcludes from 'hooks/useIncludesAndExcludes'
import { changeActiveTab } from 'redux/appConfigSlice'
import { useGroupIsPublic } from 'hooks'
import useGroupMember from 'hooks/useGroupMember'

export interface QuotedMessage {
  sender: string
  message: string
  name?: string
}

export function ChatRoom(props: { groupId: string; isBrowseMode: boolean }) {
  const { groupId, isBrowseMode } = props
  const { groupName } = useGroupMeta(groupId)

  const { messageDomain } = useMessageDomain()
  const groupFiService = messageDomain.getGroupFiService()

  // Check if the specified group is an announcement group.
  const isAnnouncement = messageDomain.isAnnouncementGroup(groupId)

  // Extract and parse search parameters from the URL.
  const [searchParams] = useSearchParams()

  // Check if the "home" parameter exists in the URL. If only one recommended group is present,
  // default to the chatroom page and display the Home icon.
  const isHomeIcon = searchParams.get('home')

  const isWalletConnected = useWalletConnection()

  const isPublic = useIsPublic(groupId)

  // Record the timestamp of when the user enters the group.
  const enterGroupTimestamp = useRef<number>(getCurrentTimestamp())

  const groupMember = useGroupMember(groupId)

  // Store the messageId and chunkKey of the oldest message.
  const tailDirectionAnchorRef = useRef<{
    directionMostMessageId?: string
    chunkKeyForDirectMostMessageId?: string
  }>({})

  // Indicates whether old or new messages are currently being fetched.
  const fetchingMessageRef = useRef<{
    fetchingOldData: boolean
    fetchingNewData: boolean
  }>({
    fetchingOldData: false,
    fetchingNewData: false
  })

  // The messageList array is ordered from oldest to newest messages.
  const [messageList, setMessageList] = useState<
    Array<IMessage | EventGroupMemberChanged>
  >([])

  // Fetch older messages
  const fetchMessageToTailDirection = async (
    size: number = 20
  ): Promise<number> => {
    // Prevent concurrent fetching of older messages.
    if (fetchingMessageRef.current.fetchingOldData) {
      return 0
    }
    fetchingMessageRef.current.fetchingOldData = true
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
      // Update the anchor references for the fetched messages.
      tailDirectionAnchorRef.current.chunkKeyForDirectMostMessageId =
        rest.chunkKeyForDirectMostMessageId
      if (rest.directionMostMessageId) {
        tailDirectionAnchorRef.current.directionMostMessageId =
          rest.directionMostMessageId
      }

      // If messages are fetched, process and update the message list.
      if (messages.length > 0) {
        // Record the most recent message's messageId and assign it to headDirectionAnchorRef.
        const latestMessageId = messages[0].messageId

        // When headDirectionAnchorRef.current.directionMostMessageId is undefined,
        // it means the messageList is still empty. This may include some historical group join notifications,
        // so append the messages to the end of the existing list.
        if (
          headDirectionAnchorRef.current.directionMostMessageId === undefined
        ) {
          setMessageList((prev) => [...prev, ...messages.reverse()])
        } else {
          // messages is toward tail direction, so reverse it, then prepend to messageList
          setMessageList((prev) => [...messages.reverse(), ...prev])
        }

        // If headDirectionAnchorRef is undefined, assign the latest message's messageId to headDirectionAnchorRef.
        if (
          headDirectionAnchorRef.current.directionMostMessageId === undefined
        ) {
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

  // Fetch newer messages in the "head" direction
  const fetchMessageToHeadDirection = async (size: number = 20) => {
    // Prevent concurrent fetching of older messages.
    if (fetchingMessageRef.current.fetchingNewData) {
      return
    }
    // Exit if no messageId is defined in headDirectionAnchorRef
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

      // Update the chunk key and directionMostMessageId in headDirectionAnchorRef
      headDirectionAnchorRef.current.chunkKeyForDirectMostMessageId =
        rest.chunkKeyForDirectMostMessageId
      if (rest.directionMostMessageId) {
        headDirectionAnchorRef.current.directionMostMessageId =
          rest.directionMostMessageId
      }

      // Append the newly fetched messages to the existing message list
      setMessageList((prev) => [...prev, ...messages])
    } catch (e) {
      console.error(e)
    } finally {
      fetchingMessageRef.current.fetchingNewData = false
    }
  }

  // Ensure headDirectionAnchorRef is populated before executing fetchMessageToHeadDirection.
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
        isGroupIdEqual(groupMemberChangedEvent.groupId, groupId) &&
        groupMemberChangedEvent.isNewMember &&
        // The event timestamp uses the most recent milestone time，not the exact time
        // but the difference from the actual timestamp is within 1 minute.
        groupMemberChangedEvent.timestamp + 1 * 60 >=
          enterGroupTimestamp.current
      ) {
        setMessageList((prev) => [...prev, groupMemberChangedEvent])
      }
    },
    [groupId]
  )

  const init = useCallback(async () => {
    // Load 40 historical messages by default when joining a group.
    await fetchMessageToTailDirection(40)
    // Listen for new message events.
    messageDomain.onConversationDataChanged(
      groupId,
      fetchMessageToHeadDirectionWrapped
    )
    // Listen for group member change events.
    messageDomain.onGroupMemberChangedLite(onGroupMemberChanged)
  }, [groupId])

  const deinit = () => {
    messageDomain.onGroupMemberChangedLite(onGroupMemberChanged)
    messageDomain.offConversationDataChanged(
      groupId,
      fetchMessageToHeadDirectionWrapped
    )
    messageDomain.navigateAwayFromGroup(groupId)
  }

  const [addressStatus, setAddressStatus] = useState<{
    marked: boolean
    muted: boolean
    isQualified: boolean
    isHasPublicKey: boolean
  }>()

  const fetchAddressStatus = async () => {
    try {
      const status = await groupFiService.getAddressStatusInGroup(groupId)
      const isHasPublicKey = messageDomain.getIsHasPublicKey()
      const appStatus = {
        ...status,
        isHasPublicKey
      }
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
    if (isWalletConnected) {
      fetchAddressStatus()
    }
    enteringGroup()

    return () => {
      setMessageList([])
      tailDirectionAnchorRef.current = {}
      headDirectionAnchorRef.current = {}
      fetchingMessageRef.current = {
        fetchingOldData: false,
        fetchingNewData: false
      }
      setQuotedMessage(undefined)
      deinit()
    }
  }, [groupId])

  const [isSending, setIsSending] = useState(false)

  const [quotedMessage, setQuotedMessage] = useState<QuotedMessage | undefined>(
    undefined
  )

  const isRegistered = useRegistrationStatus()
  const renderChatRoomButtonForAllCase = () => {
    if (!isWalletConnected) {
      return <ChatRoomWalletConnectButton />
    }
    if (!isRegistered) {
      return <ChatRoomBrowseModeButton />
    }

    if (addressStatus === undefined || groupMember === undefined) {
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
          groupMemberLen={groupMember.length}
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

  // Determine whether it is a private group recommended by the DApp that does not meet the joining criteria.
  const isAccessRequired = useMemo(() => {
    if (isPublic === undefined) {
      return undefined
    }
    if (isPublic === true) {
      return false
    }
    if (isBrowseMode) {
      return isPublic === false
    }
    if (addressStatus === undefined) {
      return undefined
    }
    const isMember = addressStatus.marked && addressStatus.isQualified
    return !isMember
  }, [isPublic, isBrowseMode, addressStatus])

  // The messageList array is ordered from oldest to newest messages.
  // The messageListForVirtualizer array is ordered from newest to oldest messages.
  const messageListForVirtualizer = useMemo(() => {
    return messageList.slice().reverse()
  }, [messageList])

  return (
    <ContainerWrapper>
      <HeaderWrapper>
        {isHomeIcon ? <HomeIcon /> : <ReturnIcon backUrl="/" />}
        <GroupTitle
          isAnnouncement={isAnnouncement}
          showAnnouncementIcon={isAnnouncement}
          showGroupPrivateIcon={isPublic === false}
          title={groupName}
        />
        <MoreIcon to={'info'} />
      </HeaderWrapper>
      <div
        className={classNames(
          'flex-1 overflow-x-hidden overflow-y-auto relative'
        )}
      >
        {isAccessRequired !== undefined ? (
          isAccessRequired ? (
            <AccessRequired />
          ) : messageListForVirtualizer.length > 0 &&
            isGroupIdEqual(messageListForVirtualizer[0].groupId, groupId) ? (
            <RowVirtualizerDynamic
              onQuoteMessage={setQuotedMessage}
              messageList={messageListForVirtualizer}
              loadPrevPage={fetchMessageToTailDirectionWrapped}
              groupId={groupId}
            />
          ) : null
        ) : null}
      </div>
      <div className={classNames('flex-none basis-auto')}>
        <div className={classNames('px-5 pb-5')}>
          {renderChatRoomButtonForAllCase()}
        </div>
      </div>
    </ContainerWrapper>
  )
}

function AccessRequired() {
  return (
    <div
      className={classNames(
        'w-full h-full flex flex-col justify-center justify-items-center'
      )}
    >
      <div
        className={classNames(
          'text-base font-medium text-center dark:text-white'
        )}
      >
        This is a private Group
      </div>
      <div
        className={classNames(
          'text-center text-[#333] mt-1 text-sm dark:text-white'
        )}
      >
        Access required to view content
      </div>
    </div>
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
    <div
      className={classNames(
        'loader-spinner loader-spinner-md text-accent-600 dark:text-accent-500'
      )}
    >
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

const GroupMaxMemberNum = 2000

function ChatRoomButton(props: {
  groupId: string
  marked: boolean
  qualified: boolean
  muted: boolean
  isHasPublicKey: boolean
  refresh: () => void
  groupMemberLen: number
  groupFiService: GroupFiService
}) {
  const { qualified, muted, groupId, refresh, groupFiService, groupMemberLen } =
    props
  const { dappGroupId } = useGroupMeta(groupId)
  const { messageDomain } = useMessageDomain()
  const includesAndExcludes = useIncludesAndExcludes()
  const [loadingLabel, setLoadingLabel] = useState('')

  const isGroupFull = groupMemberLen >= GroupMaxMemberNum
  // const isJoinOrMark = !muted && (qualified || !marked)
  const isJoined = !muted && qualified && !isGroupFull

  const isShowGroupFull = !muted && qualified && isGroupFull

  const nodeInfo = useAppSelector((state) => state.appConifg.nodeInfo)
  const groupInfo = getLocalParentStorage(GROUP_INFO_KEY, nodeInfo)
  const buylink =
    includesAndExcludes?.find((e) => e.groupId === dappGroupId)?.buylink ||
    groupInfo?.buylink ||
    ''
  if (!!loadingLabel) {
    return <ChatRoomLoadingButton label={loadingLabel} />
  }

  return (
    <button
      className={classNames(
        'w-full rounded-2xl py-3 relative',
        // marked || muted ? 'bg-[#F2F2F7] dark:bg-gray-700' : 'bg-primary',
        // muted || marked ? 'bg-transparent' : 'bg-primary',
        isJoined ? 'bg-accent-500' : 'bg-transparent',
        !isJoined ? 'pointer-events-none cursor-default' : '',
        !!buylink
          ? 'rounded-xl border border-[#F2F2F7] dark:border-gray-700 pointer-events-auto cursor-default'
          : '',
        isShowGroupFull ? 'border-0' : ''
      )}
      onClick={async () => {
        if (qualified && !isGroupFull) {
          setLoadingLabel('Joining in')
          await messageDomain.joinGroup(groupId)
          refresh()
          setLoadingLabel('')
        }
      }}
    >
      <span
        className={classNames(
          'text-base',
          isJoined
            ? 'text-white'
            : muted
            ? 'text-[#D53554]'
            : 'text-accent-600 dark:text-accent-500'
        )}
      >
        {
          muted ? (
            <>
              <MuteRedSVG
                className={classNames('inline-block mr-3 mt-[-3px]')}
              />
              <span>You are muted in this group</span>
            </>
          ) : qualified ? (
            groupMemberLen >= GroupMaxMemberNum ? (
              'The group is full'
            ) : (
              'JOIN'
            )
          ) : (
            <MarkedContent
              groupFiService={groupFiService}
              groupId={groupId}
              buylink={buylink}
            />
          )
          // marked ? (
          //   <MarkedContent
          //     groupFiService={groupFiService}
          //     groupId={groupId}
          //     buylink={buylink}
          //   />
          // ) : (
          //   'SUBSCRIBE'
          // )
        }
      </span>
    </button>
  )
}

function MarkedContent(props: {
  groupId: string
  groupFiService: GroupFiService
  buylink: string
}) {
  const { groupId } = props

  const groupMeta = useGroupMeta(groupId)
  const {
    qualifyType,
    groupName,
    contractAddress,
    tokenThresValue,
    chainId,
    symbol,
    qualifyDescription,
    collectionName
  } = groupMeta
  const isToken: Boolean =
    qualifyType === 'token' && contractAddress !== undefined

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

  if (qualifyType === 'metadata') {
    return (
      <div className={classNames('flex items-center justify-center')}>
        <WarningSVG />
        <span
          className={classNames(
            'font-medium mx-1 inline-block truncate align-bottom'
          )}
        >
          {qualifyDescription}
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
          // maxWidth: `calc(100% - 210px)`
          maxWidth: !!props.buylink
            ? `calc(100% - 210px)`
            : `calc(100% - 140px)`
        }}
      >
        {qualifyType === 'nft'
          ? collectionName ?? groupName
          : isToken
          ? `${tokenThresValue} ${symbol}`
          : null}
      </span>
      <span>to speak</span>
      {!!props.buylink ? (
        <>
          <div className={'ml-16'}></div>
          <span
            className={classNames(
              'absolute z-10 cursor-pointer active:opacity-80 top-0 right-0 rounded-br-xl rounded-tr-xl h-[2.875rem] flex items-center justify-center w-[3.75rem] bg-accent-600 text-white text-base'
            )}
            onClick={() => {
              window.open(props.buylink)
            }}
          >
            BUY
          </span>
        </>
      ) : null}
    </div>
  )
}

export default () => {
  const navigate = useNavigate()
  const appDispatch = useAppDispatch()
  const myGroupConfig = useMyGroupConfig()
  const activeTab = useAppSelector((state) => state.appConifg.activeTab)
  const params = useParams()
  const groupId = params.id
  const nodeInfo = useAppSelector((state) => state.appConifg.nodeInfo)

  // let dappGroupId = ''
  const includesAndExcludes = useIncludesAndExcludes()

  // const { messageDomain } = useMessageDomain()
  // if (groupId) {
  //   const groupMeta = messageDomain
  //     .getGroupFiService()
  //     .getGroupMetaByGroupId(groupId || '')
  //   dappGroupId = groupMeta?.dappGroupId || ''
  // }
  
  // const buylink =
  //   includesAndExcludes?.find((e) => e.groupId === dappGroupId)?.buylink || ''

  const buylink = includesAndExcludes?.find(includes => isGroupIdEqual(includes.groupId, groupId ?? ''))?.buylink || ''

  useEffect(() => {
    if (groupId) {
      setLocalParentStorage(GROUP_INFO_KEY, { groupId, buylink }, nodeInfo)
    }
    return () => {
      removeLocalParentStorage(GROUP_INFO_KEY, nodeInfo)
    }
  }, [groupId, buylink])

  const isBrowseMode = useUserBrowseMode()

  if (!groupId) {
    return null
  }

  // const browserMode = messageDomain.isUserBrowseMode()

  // Ensure that myGroups config data has been loaded.
  if (activeTab === 'ofMe') {
    if (isBrowseMode) {
      appDispatch(changeActiveTab('forMe'))
      navigate('/')
      return null
    } else {
      if (myGroupConfig === undefined || myGroupConfig.length === 0) {
        return <AppLoading />
      }
    }
  }

  return <ChatRoom groupId={groupId} isBrowseMode={isBrowseMode} />
}

function useIsPublic(groupId: string): boolean | undefined {
  const [searchParams] = useSearchParams()
  const isPublicStr = searchParams.get('isPublic')
  let isPublic =
    isPublicStr === 'true' ? true : isPublicStr === 'false' ? false : undefined

  const { isPublic: isPublicFromFetch } = useGroupIsPublic(
    groupId,
    // isPublic !== undefined, Actually not fetch
    isPublic !== undefined
  )

  return isPublic ?? isPublicFromFetch
}
