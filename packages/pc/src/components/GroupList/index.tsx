import { useState, useEffect } from 'react'
import {
  classNames,
  timeFormater,
  checkIsToday,
  addressToUserName,
  addressToPngSrc,
  dateFormater,
  removeHexPrefixIfExist
} from 'utils'
import {
  ContainerWrapper,
  HeaderWrapper,
  ContentWrapper,
  GroupListTab,
  GroupIcon,
  AppLoading,
  Powered,
  Copy,
  wrapGroupMeta
} from '../Shared'
// @ts-ignore
import PrivateGroupSVG from 'public/icons/private.svg?react'
// @ts-ignore
import NoGroupSVG from 'public/icons/no-group.svg?react'
// @ts-ignore
import AnnouncementGroupSVG from 'public/icons/announcement.svg?react'
import { useGroupIsPublic } from 'hooks'
import MessageViewer from '../ChatRoom/MessageViewer'

import { Link, useNavigate } from 'react-router-dom'
import {
  useMessageDomain,
  IInboxGroup,
  GroupFiService,
  UserProfileInfo,
  IIncludesAndExcludes,
  IInboxMessage
} from 'groupfi-sdk-chat'

import { useAppSelector } from 'redux/hooks'
import useForMeGroupConfig from 'hooks/useForMeGroupConfig'
import useIsForMeGroupsLoading from 'hooks/useIsForMeGroupsLoading'
import useMyGroupConfig from 'hooks/useMyGroupConfig'
import useUserBrowseMode from 'hooks/useUserBrowseMode'
import useAnnouncement from 'hooks/useAnnouncement'
import useProfile from 'hooks/useProfile'

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

type GroupRenderList = IInboxGroup & {
  groupName: string
  isPublic?: boolean
  icon?: string
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

  const wrappedforMeGroups = forMeGroups.map((groupConfig) => ({
    ...wrapGroupMeta(groupConfig),
    groupId: groupConfig.groupId
  }))

  let groups: GroupRenderList[] = wrappedforMeGroups.map((group) => {
    const found = inboxList.find((g) =>
      messageDomain.gidEquals(g.groupId, group.groupId)
    )
    if (found) {
      return {
        ...found,
        ...group
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
        isPublic,
        icon
      }) => (
        <GroupListItem
          key={groupId}
          isPublic={isPublic}
          groupId={groupId}
          groupName={groupName ?? ''}
          icon={icon}
          latestMessage={latestMessage}
          unReadNum={unreadCount}
          position={'forMe'}
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
  const rawMyGroupConfig = useMyGroupConfig()

  const { messageDomain } = useMessageDomain()

  if (rawMyGroupConfig === undefined) {
    return <AppLoading />
  }

  // Filter annocement group
  const myGroupConfig = rawMyGroupConfig.filter(
    ({ dappGroupId }) =>
      !(announcement ?? []).find(({ groupId }) => groupId === dappGroupId)
  )

  const wrappedMyGroupConfig = myGroupConfig.map((groupConfig) => ({
    ...wrapGroupMeta(groupConfig),
    groupId: groupConfig.groupId
  }))

  let sortedMyGroups: GroupRenderList[] = []
  const helperSet = new Set()

  inboxList.map((g) => {
    const index = wrappedMyGroupConfig.findIndex(({ groupId }) =>
      messageDomain.gidEquals(g.groupId, groupId)
    )
    if (index > -1) {
      const groupConfig = wrappedMyGroupConfig[index]
      sortedMyGroups.push({
        ...g,
        ...groupConfig
      })
      helperSet.add(g.groupId)
    }
  })

  for (const group of wrappedMyGroupConfig) {
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
        icon,
        dappGroupId,
        latestMessage,
        unreadCount
      }) => (
        <GroupListItem
          key={groupId}
          position={'ofMe'}
          groupId={groupId}
          icon={icon}
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
    <div className={classNames('h-full mt-[30%]')}>
      <div>
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
    </div>
  )
}

function UserProfile(props: { groupFiService: GroupFiService }) {
  const { groupFiService } = props
  const navigate = useNavigate()

  const navigateToProfileEdit = () => {
    navigate('/profile/edit')
  }

  const profile = useProfile()

  const currentAddress = groupFiService.getCurrentAddress()

  return (
    <div className={classNames('w-full h-full flex flex-col justify-between')}>
      <div className={classNames('px-5')}>
        <div
          className={classNames(
            'py-5 flex flex-row items-center border-b border-black/8'
          )}
        >
          {currentAddress ? (
            <>
              <img
                className={classNames(
                  'w-20 h-20 rounded-2xl cursor-pointer object-cover flex-none'
                )}
                src={
                  !!profile?.avatar
                    ? profile.avatar
                    : addressToPngSrc(groupFiService.sha256Hash, currentAddress)
                }
                onClick={navigateToProfileEdit}
              />
              <div className={classNames('pl-4 cursor-pointer')}>
                <div
                  className={classNames(
                    'group text-base font-medium text-[#2C2C2E] dark:text-white hover:text-accent-600 dark:hover:text-accent-500 flex flex-row items-center'
                  )}
                  onClick={navigateToProfileEdit}
                >
                  {profile?.name ?? addressToUserName(currentAddress)}
                  <i
                    className={classNames(
                      'ml-2 -rotate-[135deg] inline-block border-l-2 border-b-2 group-hover:border-accent-600 dark:group-hover:border-accent-500 border-black dark:border-white w-2 h-2'
                    )}
                  ></i>
                </div>
                <div
                  className={classNames(
                    'break-all text-xs text-[#6C737C] leading-5 mt-1 dark:text-white'
                  )}
                >
                  {currentAddress}
                  <Copy text={currentAddress} />
                </div>
              </div>
            </>
          ) : null}
        </div>
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
  isPublic,
  position,
  icon
}: {
  icon?: string
  isPublic?: boolean
  groupId: string
  groupName: string
  latestMessage: IInboxMessage | undefined
  unReadNum: number
  isAnnouncement?: boolean
  groupFiService: GroupFiService
  latestMessageSenderProfile?: UserProfileInfo
  position: 'ofMe' | 'forMe'
}) {
  const { isPublic: isPublicFromFetch } = useGroupIsPublic(groupId)

  const isGroupPublic = isPublic !== undefined ? isPublic : isPublicFromFetch

  const latestMessageTimestamp = latestMessage?.timestamp

  return (
    <Link
      to={`/group/${removeHexPrefixIfExist(
        groupId
      )}?announcement=${isAnnouncement}`}
    >
      <div
        className={classNames(
          'flex flex-row hover:bg-gray-50 dark:hover:bg-gray-800 mx-4 rounded-lg'
        )}
      >
        <GroupIcon
          icon={icon}
          groupId={groupId}
          unReadNum={position === 'ofMe' ? unReadNum : 0}
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
            <div
              className={classNames(
                'overflow-hidden whitespace-nowrap text-ellipsis'
              )}
            >
              {isAnnouncement === true && (
                <AnnouncementGroupSVG
                  className={classNames('inline-block mr-1 w-5 h-5 mb-[3px]')}
                />
              )}
              {isGroupPublic === false && (
                <PrivateGroupSVG
                  className={classNames('inline-block mr-1 w-4 h-4 mb-[3px]')}
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
                  {latestMessage.name ??
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
            <div
              className={classNames(
                'flex-none text-sm opacity-30 dark:text-white mt-19px'
              )}
            >
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
