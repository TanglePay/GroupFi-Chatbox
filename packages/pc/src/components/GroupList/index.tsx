import { useState, useEffect } from 'react'
import {
  classNames,
  timeFormater,
  checkIsToday,
  addressToUserName,
  addressToPngSrc,
  dateFormater
} from 'utils'
import {
  ContainerWrapper,
  HeaderWrapper,
  ContentWrapper,
  GroupFiServiceWrapper,
  GroupListTab,
  GroupIcon,
  AppLoading
} from '../Shared'
import PrivateGroupSVG from 'public/icons/private.svg'
import NoGroupSVG from 'public/icons/no-group.svg'
import { useGroupIsPublic, useOneBatchUserProfile } from 'hooks'
import MessageViewer from '../ChatRoom/MessageViewer'

import { Link } from 'react-router-dom'
import {
  useMessageDomain,
  IInboxGroup,
  GroupFiService,
  UserProfileInfo
} from 'groupfi_trollbox_shared'

import { useAppSelector } from 'redux/hooks'

export default function GropuList() {
  const { messageDomain } = useMessageDomain()
  const groupFiService = messageDomain.getGroupFiService()

  const [inboxList, setInboxList] = useState<IInboxGroup[]>([])

  const refreshInboxList = async () => {
    const inboxList = await messageDomain.getInboxList()
    // log inboxList
    console.log('refreshInboxList', inboxList)

    setInboxList(inboxList)
  }

  useEffect(() => {
    refreshInboxList()
    messageDomain.onInboxLoaded(refreshInboxList)
    messageDomain.onInboxReady(refreshInboxList)
    messageDomain.onInboxDataChanged(refreshInboxList)

    return () => {
      messageDomain.offInboxDataChanged(refreshInboxList)
      messageDomain.offInboxReady(refreshInboxList)
      messageDomain.offInboxLoaded(refreshInboxList)
    }
  }, [])

  const activeTab = useAppSelector((state) => state.appConifg.activeTab)

  return (
    <ContainerWrapper>
      <HeaderWrapper>
        <GroupListTab groupFiService={groupFiService} />
      </HeaderWrapper>
      <ContentWrapper>
        {activeTab === 'forMe' && (
          <ForMeGroups groupFiService={groupFiService} inboxList={inboxList} />
        )}
        {activeTab === 'ofMe' && (
          <MyGroups groupFiService={groupFiService} inboxList={inboxList} />
        )}
        {activeTab === 'profile' && (
          <UserProfile groupFiService={groupFiService} />
        )}
      </ContentWrapper>
    </ContainerWrapper>
  )
}

function ForMeGroups(props: {
  inboxList: IInboxGroup[]
  groupFiService: GroupFiService
}) {
  const { groupFiService, inboxList } = props
  const forMeGroups = useAppSelector((state) => state.forMeGroups.groups)

  if (forMeGroups === undefined) {
    return <AppLoading />
  }

  const groups = forMeGroups.map((group) => {
    const found = inboxList.find((g) => g.groupId === group.groupId)
    if (found) {
      return {
        ...group,
        ...found
      }
    }
    return {
      ...group,
      latestMessage: undefined,
      unreadCount: 0
    }
  })

  return groups.length > 0 ? (
    groups.map(
      ({ groupId, groupName, latestMessage, unreadCount }: IInboxGroup) => (
        <GroupListItem
          key={groupId}
          groupId={groupId}
          groupName={groupName ?? ''}
          latestMessage={latestMessage}
          unReadNum={unreadCount}
          groupFiService={groupFiService}
        />
      )
    )
  ) : (
    <NoGroupPrompt groupType="forme" />
  )
}

function MyGroups(props: {
  inboxList: IInboxGroup[]
  groupFiService: GroupFiService
}) {
  const { groupFiService, inboxList } = props
  const myGroups = useAppSelector((state) => state.myGroups.groups)

  if (myGroups === undefined) {
    return null
  }

  const sortedMyGroups: IInboxGroup[] = []
  const helperSet = new Set()

  inboxList.map((g) => {
    const index = myGroups.findIndex(({ groupId }) => groupId === g.groupId)
    if (index > -1) {
      sortedMyGroups.push({
        ...g,
        groupName: g.groupName ?? myGroups[index].groupName
      })
      helperSet.add(g.groupId)
    }
  })

  for (const group of myGroups) {
    if (!helperSet.has(group.groupId)) {
      sortedMyGroups.push({
        ...group,
        unreadCount: 0,
        latestMessage: undefined
      })
    }
  }

  return sortedMyGroups.length > 0 ? (
    sortedMyGroups.map(
      ({ groupId, groupName, latestMessage, unreadCount }: IInboxGroup) => (
        <GroupListItem
          key={groupId}
          groupId={groupId}
          groupName={groupName ?? ''}
          latestMessage={latestMessage}
          unReadNum={unreadCount}
          groupFiService={groupFiService}
        />
      )
    )
  ) : (
    <NoGroupPrompt groupType="mygroup" />
  )
}

function NoGroupPrompt(props: { groupType: 'mygroup' | 'forme' }) {
  const { groupType } = props
  const content =
    groupType === 'forme'
      ? 'No Available Group For You'
      : groupType === 'mygroup'
      ? "You haven't Joined in / Subscribed Any Groups"
      : ''
  return (
    <div className={classNames('mt-[132px]')}>
      <img src={NoGroupSVG} className={classNames('m-auto')} />
      <div className={classNames('text-center mt-5 font-medium text-[#333]')}>
        {content}
      </div>
    </div>
  )
}

function UserProfile(props: { groupFiService: GroupFiService }) {
  const { groupFiService } = props
  const currentAddress = groupFiService.getCurrentAddress()
  const userProfile = useAppSelector((state) => state.appConifg.userProfile)

  return (
    <div className={classNames('w-full px-5')}>
      <div
        className={classNames(
          'py-5 flex flex-row items-center border-b border-black/8'
        )}
      >
        <img
          className={classNames('w-20 h-20 rounded-2xl')}
          src={addressToPngSrc(groupFiService.sha256Hash, currentAddress)}
        />
        <span
          className={classNames('pl-4 text-base font-medium text-[#2C2C2E]')}
        >
          {userProfile?.name ?? addressToUserName(currentAddress)}
        </span>
      </div>
      <div className={classNames('text-sm py-5')}>
        Provided by
        <a
          href={'https://groupfi.ai'}
          target="_blank"
          className={classNames('link ml-1')}
        >
          groupfi.ai
        </a>
      </div>
    </div>
  )
}

function GroupListItem({
  groupId,
  groupName,
  latestMessage,
  unReadNum,
  groupFiService
}: {
  groupId: string
  groupName: string
  latestMessage: any
  unReadNum: number
  groupFiService: GroupFiService
  latestMessageSenderProfile?: UserProfileInfo
}) {
  const { isPublic } = useGroupIsPublic(groupId)

  const latestMessageSender = latestMessage?.sender

  const { userProfileMap } = useOneBatchUserProfile(
    latestMessageSender ? [latestMessageSender] : []
  )

  const latestMessageTimestamp = latestMessage?.timestamp

  return (
    <Link to={`/group/${groupId}`}>
      <div
        className={classNames('flex flex-row hover:bg-gray-50 mx-4 rounded-lg')}
      >
        <GroupIcon
          groupId={groupId}
          unReadNum={unReadNum}
          groupFiService={groupFiService}
        />
        <div
          className={classNames(
            'flex flex-row flex-1 border-b border-black/10 max-w-full overflow-hidden'
          )}
        >
          <div
            className={classNames(
              'flex-auto mt-13px cursor-pointer overflow-hidden'
            )}
          >
            <div>
              {isPublic === false && (
                <img
                  src={PrivateGroupSVG}
                  className={classNames('inline-block mr-1 w-4 h-4 mb-[3px]')}
                />
              )}
              {groupName}
            </div>
            <div
              className={classNames(
                'text-sm opacity-30 overflow-hidden whitespace-nowrap text-ellipsis'
              )}
            >
              {unReadNum > 0
                ? unReadNum === 1
                  ? `[${unReadNum} message] `
                  : unReadNum <= 20
                  ? `[${unReadNum} messages] `
                  : '[20+ messages] '
                : null}
              {latestMessage !== undefined && (
                <>
                  {userProfileMap?.[latestMessage.sender]?.name ??
                    addressToUserName(latestMessage.sender)}
                  <span className={classNames('mx-px')}>:</span>
                  <MessageViewer
                    message={latestMessage.message}
                    groupId={groupId}
                    ifMessageIncludeOriginContent={true}
                  />
                </>
              )}
            </div>
          </div>
          {latestMessageTimestamp && (
            <div className={classNames('flex-none text-sm opacity-30 mt-19px')}>
              {checkIsToday(latestMessageTimestamp)
                ? timeFormater(latestMessageTimestamp)
                : dateFormater(latestMessageTimestamp)}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

// export default () => (
//   <GroupFiServiceWrapper<{ groupFiService: GroupFiService }>
//     component={GropuList}
//     paramsMap={{}}
//   />
// )
