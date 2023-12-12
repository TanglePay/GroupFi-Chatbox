import { useState, useEffect, useRef } from 'react'
import { classNames, timestampFormater, addressToUserName } from 'utils'
import {
  ContainerWrapper,
  HeaderWrapper,
  ContentWrapper,
  GroupFiServiceWrapper,
  GroupListTab,
  GroupIcon
} from '../Shared'
import GroupSVG from 'public/icons/group.svg'
import { useGroupIsPublic } from 'hooks'
import { MessageViewer } from '../ChatRoom'

import { Link } from 'react-router-dom'
import {
  useMessageDomain,
  IInboxGroup,
  GroupFiService
} from 'groupfi_trollbox_shared'

import { useAppSelector } from 'redux/hooks'

function GropuList(props: { groupFiService: GroupFiService }) {
  const { groupFiService } = props
  const { messageDomain } = useMessageDomain()
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
        <GroupListTab />
      </HeaderWrapper>
      <ContentWrapper>
        {activeTab === 'forMe' && (
          <ForMeGroups groupFiService={groupFiService} inboxList={inboxList} />
        )}
        {activeTab === 'ofMe' && (
          <MyGroups groupFiService={groupFiService} inboxList={inboxList} />
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

  const groups = forMeGroups.map((group) => {
    const found = inboxList.find((g) => g.groupId === group.groupId)
    if (found) {
      return found
    }
    return {
      ...group,
      latestMessage: undefined,
      unreadCount: 0
    }
  })

  return groups.map((inboxGroup: IInboxGroup) => (
    <GroupListItem
      key={inboxGroup.groupId}
      groupId={inboxGroup.groupId}
      groupName={inboxGroup.groupName ?? ''}
      latestMessage={inboxGroup.latestMessage}
      unReadNum={inboxGroup.unreadCount}
      groupFiService={groupFiService}
    />
  ))
}

function MyGroups(props: {
  inboxList: IInboxGroup[]
  groupFiService: GroupFiService
}) {
  const { groupFiService, inboxList } = props
  const myGroups = useAppSelector((state) => state.myGroups.groups)

  let myGroupsCopy = [...myGroups]

  const groups = inboxList
    .filter((g) => {
      const index = myGroupsCopy.findIndex(
        ({ groupId }) => groupId === g.groupId
      )
      if (index > -1) {
        myGroupsCopy.splice(index, 1)
        return true
      }
      return false
    })
    .concat(
      myGroupsCopy.map((g) => ({
        ...g,
        unreadCount: 0,
        latestMessage: undefined
      }))
    )

  return groups.map((inboxGroup: IInboxGroup) => (
    <GroupListItem
      key={inboxGroup.groupId}
      groupId={inboxGroup.groupId}
      groupName={inboxGroup.groupName ?? ''}
      latestMessage={inboxGroup.latestMessage}
      unReadNum={inboxGroup.unreadCount}
      groupFiService={groupFiService}
    />
  ))
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
}) {
  const { isPublic } = useGroupIsPublic(groupId)

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
              {isPublic && (
                <img
                  src={GroupSVG}
                  className={classNames('inline-block mr-1')}
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
                  : `[${unReadNum} messages] `
                : null}
              {latestMessage !== undefined && (
                <>
                  {addressToUserName(latestMessage.sender)}
                  <span className={classNames('mx-px')}>:</span>
                  <MessageViewer
                    message={latestMessage.message}
                    messageId={'for test'}
                  />
                </>
              )}
            </div>
          </div>
          {latestMessage !== undefined && (
            <div className={classNames('flex-none text-sm opacity-30 mt-19px')}>
              {timestampFormater(latestMessage.timestamp)}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

export default () => (
  <GroupFiServiceWrapper<{ groupFiService: GroupFiService }>
    component={GropuList}
    paramsMap={{}}
  />
)
