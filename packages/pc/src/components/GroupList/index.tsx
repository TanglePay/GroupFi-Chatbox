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
import AnnouncementGroupSVG from 'public/icons/announcement.svg'
import { useGroupIsPublic, useOneBatchUserProfile } from 'hooks'
import MessageViewer from '../ChatRoom/MessageViewer'

import { Link } from 'react-router-dom'
import {
  useMessageDomain,
  IInboxGroup,
  GroupFiService,
  UserProfileInfo,
  IIncludesAndExcludes
} from 'groupfi_trollbox_shared'

import { useAppSelector } from 'redux/hooks'
import useForMeGroupConfig from 'hooks/useForMeGroupConfig'
import useMyGroupConfig from 'hooks/useMyGroupConfig'

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
  const announcement = useAppSelector((state) => state.forMeGroups.announcement)

  return (
    <ContainerWrapper>
      <HeaderWrapper>
        <GroupListTab groupFiService={groupFiService} />
      </HeaderWrapper>
      <ContentWrapper>
        {activeTab === 'forMe' && (
          <ForMeGroups groupFiService={groupFiService} inboxList={inboxList} announcement={announcement} />
        )}
        {activeTab === 'ofMe' && (
          <MyGroups groupFiService={groupFiService} inboxList={inboxList} announcement={announcement} />
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
  announcement: IIncludesAndExcludes[] | undefined
}) {
  const { groupFiService, inboxList, announcement } = props
  const forMeGroups = useForMeGroupConfig()
  const { messageDomain } = useMessageDomain()
  if (forMeGroups === undefined) {
    return <AppLoading />
  }

  let groups = forMeGroups.map((group) => {
    const found = inboxList.find((g) =>
      messageDomain.gidEquals(g.groupId, group.groupId)
    )
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
  if (announcement && announcement.length > 0) {
    const ags = groups.filter(g => announcement.some(ag => ag.groupName === g.groupName))
    const nags = groups.filter(g => !announcement.some(ag => ag.groupName === g.groupName))
    groups = [...ags, ...nags]
  }

  return groups.length > 0 ? (
    groups.map(
      ({ groupId, groupName, latestMessage, unreadCount }: IInboxGroup, i: number) => (
        <GroupListItem
          key={groupId}
          groupId={groupId}
          groupName={groupName ?? ''}
          latestMessage={latestMessage}
          unReadNum={unreadCount}
          isAnnouncement={announcement?.some(ag => ag.groupName === groupName)}
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
  announcement: IIncludesAndExcludes[] | undefined
}) {
  const { groupFiService, inboxList, announcement } = props
  const myGroupConfig = useMyGroupConfig()
  // const myGroups = useAppSelector((state) => state.myGroups.groups)
  const { messageDomain } = useMessageDomain()
  if (myGroupConfig === undefined) {
    return null
  }

  let sortedMyGroups: IInboxGroup[] = []
  const helperSet = new Set()

  inboxList.map((g) => {
    const index = myGroupConfig.findIndex(({ groupId }) =>
      messageDomain.gidEquals(g.groupId, groupId)
    )
    if (index > -1) {
      sortedMyGroups.push({
        ...g,
        groupName: g.groupName ?? myGroupConfig[index].groupName
      })
      helperSet.add(g.groupId)
    }
  })

  for (const group of myGroupConfig) {
    if (!helperSet.has(group.groupId)) {
      sortedMyGroups.push({
        ...group,
        unreadCount: 0,
        latestMessage: undefined
      })
    }
  }
  // remove duplication from sortedMyGroups, if any has the same groupId, groupId can be prefixed with 0x or not
  const seen = new Set()
  sortedMyGroups = sortedMyGroups.filter((g) => {
    const key = messageDomain.gid(g.groupId)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
  return sortedMyGroups.length > 0 ? (
    sortedMyGroups.map(
      ({ groupId, groupName, latestMessage, unreadCount }: IInboxGroup) => (
        <GroupListItem
          key={groupId}
          groupId={groupId}
          groupName={groupName ?? ''}
          latestMessage={latestMessage}
          unReadNum={unreadCount}
          isAnnouncement={announcement?.some(ag => ag.groupName === groupName)}
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
      ? "You don't have any groups yet"
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

  const userProfile = useAppSelector((state) => state.appConifg.userProfile)

  const currentAddress = groupFiService.getCurrentAddress()

  return (
    <div className={classNames('w-full px-5')}>
      <div
        className={classNames(
          'py-5 flex flex-row items-center border-b border-black/8'
        )}
      >
        {currentAddress ? (
          <>
            <img
              className={classNames('w-20 h-20 rounded-2xl')}
              src={addressToPngSrc(groupFiService.sha256Hash, currentAddress)}
            />
            <span
              className={classNames(
                'pl-4 text-base font-medium text-[#2C2C2E]'
              )}
            >
              {userProfile?.name ?? addressToUserName(currentAddress)}
            </span>
          </>
        ) : null}
      </div>
      <div className={classNames('text-sm py-5')}>
        Powered by
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
  isAnnouncement,
  groupFiService
}: {
  groupId: string
  groupName: string
  latestMessage: any
  unReadNum: number
  isAnnouncement?: boolean
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
    <Link to={`/group/${groupId}?announcement=${isAnnouncement}`}>
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
              {isAnnouncement === true && (
                <img
                  src={AnnouncementGroupSVG}
                  className={classNames('inline-block mr-1 w-5 h-5 mb-[3px]')}
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
