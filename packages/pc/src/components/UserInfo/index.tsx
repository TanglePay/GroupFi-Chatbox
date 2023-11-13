import { useParams } from 'react-router-dom'
import RobotSVG from 'public/avatars/robot.svg'
import { useNavigate } from 'react-router-dom'
import {
  ContainerWrapper,
  HeaderWrapper,
  GroupTitle,
  ReturnIcon,
  ContentWrapper,
  Copy,
  CollapseIcon,
  Loading,
  ArrowRight,
  GroupFiServiceWrapper
} from '../Shared'
import { classNames, removeHexPrefixIfExist } from 'utils'
import { PropsWithChildren, useEffect, useState } from 'react'
import { GroupFiService } from 'groupfi_trollbox_shared'

function UserInfo(props: { userId: string; groupFiService: GroupFiService }) {
  const { userId, groupFiService } = props

  return (
    <ContainerWrapper>
      <HeaderWrapper>
        <ReturnIcon />
        <GroupTitle showGroupIcon={false} title={'DETAILS'} />
      </HeaderWrapper>
      <ContentWrapper>
        <div className={classNames('py-5 pl-5 flex flex-row')}>
          <img src={RobotSVG} className={classNames('w-[73px] h-[73px]')} />
          <div className={classNames('pt-1 pr-5 pl-4')}>
            <div className={classNames('font-medium text-[#333]')}>Name</div>
            <div
              className={classNames(
                'break-all text-xs text-[#6C737C] leading-5 mt-1'
              )}
            >
              {userId}
              <Copy text={userId ?? ''} />
            </div>
          </div>
        </div>
        <UserInfoCollapse title="NFT"></UserInfoCollapse>
        <UserInfoCollapse title="GROUPS">
          <JoinedGroupList userId={userId} groupFiService={groupFiService} />
        </UserInfoCollapse>
      </ContentWrapper>
    </ContainerWrapper>
  )
}

function JoinedGroupList(props: {
  userId: string
  groupFiService: GroupFiService
}) {
  const { userId, groupFiService } = props

  const navigate = useNavigate()

  const [joinedGroups, setJoinedGroups] = useState<
    { groupId: string; groupName: string }[] | undefined
  >(undefined)

  const loadJoinedGruops = async () => {
    const memberGroups = await groupFiService.loadAddressMemberGroups(userId)
    console.log('***memberGroups', memberGroups)
    setJoinedGroups(memberGroups)
  }

  useEffect(() => {
    loadJoinedGruops()
  }, [])

  return joinedGroups !== undefined ? (
    joinedGroups.map(({ groupId, groupName }) => (
      <div
        key={groupId}
        className={classNames(
          'pl-4 pr-2 py-2.5 border rounded-2xl border-[rgba(51, 51, 51, 0.08)] mt-3 flex flex-row'
        )}
        onClick={(event) => {
          event.stopPropagation()
        }}
      >
        <div
          className={classNames(
            'relative grid grid-cols-3 gap-0.5 w-[46px] h-12 bg-gray-200/70 rounded flex-none p-1'
          )}
        >
          {new Array(9).fill(RobotSVG).map((svg, index) => (
            <img src={svg} key={index} />
          ))}
        </div>
        <div className={classNames('self-center ml-3 grow')}>{groupName}</div>

        <div
          className={classNames('self-center w-6 h-6')}
          onClick={() => {
            navigate(`/group/${removeHexPrefixIfExist(groupId)}/info`)
          }}
        >
          <ArrowRight />
        </div>
      </div>
    ))
  ) : (
    <Loading />
  )
}

function UserInfoCollapse({
  title,
  children
}: PropsWithChildren<{ title: string }>) {
  const [collapsed, setCollapsed] = useState(true)

  const [haveExpanded, setHaveExpanded] = useState(false)

  useEffect(() => {
    if (!collapsed) {
      setHaveExpanded(true)
    }
  }, [collapsed])

  return (
    <div
      onClick={() => {
        setCollapsed((s) => !s)
      }}
      className={classNames(
        'mx-5 cursor-pointer select-none border-t border-black/10 py-4'
      )}
    >
      <h3 className={classNames('font-medium text-[#333] inline-block mr-1.5')}>
        {title}
      </h3>
      <CollapseIcon collapsed={collapsed} />
      {!haveExpanded ? null : (
        <div className={collapsed ? 'hidden' : 'block'}>{children}</div>
      )}
    </div>
  )
}

export default () => (
  <GroupFiServiceWrapper<{ groupFiService: GroupFiService; userId: string }>
    component={UserInfo}
    paramsMap={{ id: 'userId' }}
  />
)
