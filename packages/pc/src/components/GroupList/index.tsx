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
  AppLoading,
  Powered
} from '../Shared'
// @ts-ignore
import PrivateGroupSVG from 'public/icons/private.svg?react'
// @ts-ignore
import NoGroupSVG from 'public/icons/no-group.svg?react'
// @ts-ignore
import AnnouncementGroupSVG from 'public/icons/announcement.svg?react'
import { useGroupIsPublic, useOneBatchUserProfile } from 'hooks'
import MessageViewer from '../ChatRoom/MessageViewer'

import { Link } from 'react-router-dom'
import {
  useMessageDomain,
  IInboxGroup,
  GroupFiService,
  UserProfileInfo,
  IIncludesAndExcludes
} from 'groupfi_chatbox_shared'

import { useAppSelector } from 'redux/hooks'
import useForMeGroupConfig from 'hooks/useForMeGroupConfig'
import useIsForMeGroupsLoading from 'hooks/useIsForMeGroupsLoading'
import useMyGroupConfig from 'hooks/useMyGroupConfig'
import useUserBrowseMode from 'hooks/useUserBrowseMode'
import useAnnouncement from 'hooks/useAnnouncement'

export default function GropuList() {
  const { messageDomain } = useMessageDomain()
  const groupFiService = messageDomain.getGroupFiService()

  const [inboxList, setInboxList] = useState<IInboxGroup[]>([])

  const isUserBrowseMode = useUserBrowseMode()

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

  let activeTab = useAppSelector((state) => state.appConifg.activeTab)
  activeTab = isUserBrowseMode ? 'forMe' : activeTab

  // const announcement = useAppSelector((state) => state.forMeGroups.announcement)
  const announcement = useAnnouncement()

  return (
    <ContainerWrapper>
      <HeaderWrapper>
        <GroupListTab groupFiService={groupFiService} />
      </HeaderWrapper>
      <ContentWrapper>
        {activeTab === 'forMe' && (
          <ForMeGroups
            groupFiService={groupFiService}
            inboxList={inboxList}
            announcement={announcement}
          />
        )}
        {activeTab === 'ofMe' && (
          <MyGroups
            groupFiService={groupFiService}
            inboxList={inboxList}
            announcement={announcement}
          />
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
  
  const isForMeGroupsLoading = useIsForMeGroupsLoading()

  const { messageDomain } = useMessageDomain()
  if (forMeGroups === undefined) {
    return <AppLoading />
  }

  if (isForMeGroupsLoading) {
    return <AppLoading />
  }

  let groups = forMeGroups.map((group) => {
    const found = inboxList.find((g) =>
      messageDomain.gidEquals(g.groupId, group.groupId)
    )
    if (found) {
      return {
        ...group,
        ...found,
        groupName: group.groupName
      }
    }
    return {
      ...group,
      latestMessage: undefined,
      unreadCount: 0
    }
  })
  if (announcement && announcement.length > 0) {
    const ags = groups.filter((g) =>
      announcement.some((ag) => ag.groupId === g.dappGroupId)
    )
    const nags = groups.filter(
      (g) => !announcement.some((ag) => ag.groupId === g.dappGroupId)
    )
    groups = [...ags, ...nags]
  }

  return groups.length > 0 ? (
    groups.map(
      ({
        groupId,
        groupName,
        dappGroupId,
        latestMessage,
        unreadCount,
        isPublic
      }) => (
        <GroupListItem
          key={groupId}
          isPublic={isPublic}
          groupId={groupId}
          groupName={groupName ?? ''}
          latestMessage={latestMessage}
          unReadNum={unreadCount}
          isAnnouncement={announcement?.some(
            (ag) => ag.groupId === dappGroupId
          )}
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
    return <AppLoading />
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
      ({
        groupId,
        groupName,
        dappGroupId,
        latestMessage,
        unreadCount
      }: IInboxGroup) => (
        <GroupListItem
          key={groupId}
          groupId={groupId}
          groupName={groupName ?? ''}
          latestMessage={latestMessage}
          unReadNum={unreadCount}
          isAnnouncement={announcement?.some(
            (ag) => ag.groupId === dappGroupId
          )}
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
      <NoGroupSVG
        className={classNames(
          'm-auto dark:fill-transparent stroke-[#333333] dark:stroke-white'
        )}
      />
      <div
        className={classNames(
          'text-center mt-5 font-medium text-[#333] dark:text-[#ddd]'
        )}
      >
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
                'pl-4 text-base font-medium text-[#2C2C2E] dark:text-white'
              )}
            >
              {userProfile?.name ?? addressToUserName(currentAddress)}
            </span>
          </>
        ) : null}
      </div>
      <Powered />
    </div>
  )
}

function GroupListItem({
  groupId,
  groupName,
  latestMessage,
  unReadNum,
  isAnnouncement,
  groupFiService,
  isPublic
}: {
  isPublic?: boolean
  groupId: string
  groupName: string
  latestMessage: any
  unReadNum: number
  isAnnouncement?: boolean
  groupFiService: GroupFiService
  latestMessageSenderProfile?: UserProfileInfo
}) {
  const { isPublic: isPublicFromFetch } = useGroupIsPublic(groupId)

  const isGroupPublic = isPublic !== undefined ? isPublic : isPublicFromFetch

  const latestMessageSender = latestMessage?.sender

  const { userProfileMap } = useOneBatchUserProfile(
    latestMessageSender ? [latestMessageSender] : []
  )

  const latestMessageTimestamp = latestMessage?.timestamp

  return (
    <Link to={`/group/${groupId}?announcement=${isAnnouncement}`}>
      <div
        className={classNames(
          'flex flex-row hover:bg-gray-50 dark:hover:bg-gray-800 mx-4 rounded-lg'
        )}
      >
        <GroupIcon
          groupId={groupId}
          unReadNum={unReadNum}
          groupFiService={groupFiService}
        />
        <div
          className={classNames(
            'flex flex-row flex-1 border-b border-black/10 dark:border-[#eeeeee80] max-w-full overflow-hidden'
          )}
        >
          <div
            className={classNames(
              'flex-auto mt-13px cursor-pointer overflow-hidden dark:text-white'
            )}
          >
            <div>
              {isGroupPublic === false && (
                <PrivateGroupSVG
                  className={classNames('inline-block mr-1 w-4 h-4 mb-[3px]')}
                />
              )}
              {isAnnouncement === true && (
                <AnnouncementGroupSVG
                  className={classNames('inline-block mr-1 w-5 h-5 mb-[3px]')}
                />
              )}
              {isAnnouncement ? 'Announcement' : groupName}
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
                    ifShowImg={false}
                  />
                </>
              )}
            </div>
          </div>
          {latestMessageTimestamp && (
            <div className={classNames('flex-none text-sm opacity-30 dark:text-white mt-19px')}>
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
