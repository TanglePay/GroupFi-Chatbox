import { useState, Fragment, useEffect } from 'react'
import { classNames, timestampFormater } from 'utils'
import {
  ContainerWrapper,
  HeaderWrapper,
  ContentWrapper,
  Loading
} from '../Shared'

import IotaapeSVG from 'public/avatars/iotaape.svg'
import { useMessageDomain } from 'groupfi_trollbox_shared'
import { Link } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

function GropuList() {
  const [activeTab, setActiveTab] = useState<string>('forMe')
  const { messageDomain } = useMessageDomain()
  useEffect(() => {
    messageDomain.bootstrap()
    console.log('messageDomain.bootstrap()', messageDomain)
  }, [])
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
        <GroupListItem name={'ice-berg-1'} />
        <GroupListItem name={'ice-berg-2'} />
        <GroupListItem name={'ice-berg-3'} />
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

function GroupListItem({ name }: { name: string }) {
  const group = {
    group: 'ice-berg-1',
    latestMessage: {
      sender: 'sender',
      message: 'message',
      timestamp: new Date().getTime()
    },
    unReadNum: 0
  }

  const { group: groupName, latestMessage, unReadNum } = group
  const { sender, message, timestamp } = latestMessage || {}

  console.log('****latestMessage', latestMessage)
  const shorterSender = sender?.slice(sender.length - 5)
  return (
    <Link to={`/group/${groupName}`}>
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
                <div>{groupName}</div>
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

const ObservedGroupList = observer(GropuList)

export default ObservedGroupList