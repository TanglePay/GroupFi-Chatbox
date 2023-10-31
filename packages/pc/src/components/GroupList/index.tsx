import { useState, Fragment, useEffect } from 'react'
import { classNames, timestampFormater } from 'utils'
import {
  ContainerWrapper,
  HeaderWrapper,
  ContentWrapper,
  Loading
} from '../Shared'
import GroupSVG from 'public/icons/group.svg'

import IotaapeSVG from 'public/avatars/iotaape.svg'

import { Link } from 'react-router-dom'
import { useMessageDomain } from 'groupfi_trollbox_shared'
import { IInboxGroup } from 'groupfi_trollbox_shared'
import { useGroupFiService } from 'hooks'

function GropuList() {
  const { messageDomain } = useMessageDomain()
  const [inboxList, setInboxList] = useState<any[]>([])
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
  const [activeTab, setActiveTab] = useState<string>('forMe')

  const tabList = [
    {
      label: 'For Me',
      key: 'forMe'
      // loading: groupList.groupListForMeLoading,
      // list: groupList.groupListForMe
    },
    {
      label: 'My Groups',
      key: 'ofMe'
      // loading: groupList.groupListOfMeLoading,
      // list: groupList.groupListOfMe,
      // asyncAction: () => groupList.loadGroupListOfMe.call(groupList, {})
    }
  ]

  const currentTab = tabList.find(({ key }) => key === activeTab)
  // const { loading, list = [] } = currentTab ?? {}

  return (
    <ContainerWrapper>
      <HeaderWrapper>
        {tabList.map(({ label, key }, index) => (
          <Fragment key={key}>
            {index > 0 && (
              <div
                className={classNames(
                  'flex-none border-l border-black/10 mt-1.5 mb-1.5'
                )}
              ></div>
            )}
            <div
              onClick={() => {
                setActiveTab(key)
                // if (asyncAction !== undefined) {
                //   asyncAction()
                // }
              }}
              className={classNames(
                'flex-1 pt-2.5 pb-2.5 cursor-pointer hover:bg-gray-50',
                index === 0 ? 'rounded-tl-2xl' : undefined,
                index === tabList.length - 1 ? 'rounded-tr-2xl' : undefined,
                activeTab === key ? 'text-primary' : 'text-black/50'
              )}
            >
              {label}
            </div>
          </Fragment>
        ))}
      </HeaderWrapper>
      <ContentWrapper>
        {inboxList.map((inboxGroup: IInboxGroup) => (
          <GroupListItem
            key={inboxGroup.groupId}
            groupId={inboxGroup.groupId}
            groupName={inboxGroup.groupName ?? ''}
            latestMessage={inboxGroup.latestMessage}
            unReadNum={inboxGroup.unreadCount}
          />
        ))}
        {/* {loading ? (
          <Loading />
        ) : (
          list.map((group) => (
            <ObservedGroupListItem key={group} name={group} />
          ))
        )} */}
      </ContentWrapper>
    </ContainerWrapper>
  )
}

function GroupListItem({
  groupId,
  groupName,
  latestMessage,
  unReadNum
}: {
  groupId: string
  groupName: string
  latestMessage: any
  unReadNum: number
}) {
  const { sender, message, timestamp } = latestMessage || {}

  const groupFiService = useGroupFiService()

  const [isPublic, setIsPublic] = useState<boolean>()

  const getIsGroupPublic = async () => {
    console.log('***Enter getIsGroupPublic')
    const res = await groupFiService.isGroupPublic(groupId)
    console.log('***isPublic', groupId, res)
    setIsPublic(res)
  }

  useEffect(() => {
    getIsGroupPublic()
  }, [])

  const shorterSender = sender?.slice(sender.length - 5)
  return (
    <Link to={`/group/${groupId}`}>
      <div
        className={classNames('flex flex-row hover:bg-gray-50 mx-4 rounded-lg')}
      >
        <div
          className={classNames(
            'relative grid grid-cols-3 gap-0.5 w-[46px] h-12 bg-gray-200/70 rounded mr-4 my-3 flex-none p-1'
          )}
        >
          {new Array(9).fill(IotaapeSVG).map((svg, index) => (
            <img src={svg} key={index} />
          ))}
          <div
            className={classNames(
              'absolute -top-1 -right-1 w-2 h-2 rounded bg-[#D53554]'
            )}
          ></div>
        </div>
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
            {latestMessage ? (
              <>
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
                  {unReadNum > 0 ? `[${unReadNum} messages] ` : null}
                  {shorterSender}
                  <span className={classNames('mx-px')}>:</span>
                  {message}
                </div>
              </>
            ) : (
              'loading...'
            )}
          </div>
          <div className={classNames('flex-none text-sm opacity-30 mt-19px')}>
            {timestampFormater(timestamp)}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default GropuList
