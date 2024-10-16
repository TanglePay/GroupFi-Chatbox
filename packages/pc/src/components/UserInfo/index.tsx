import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
  GroupIcon
} from '../Shared'
import {
  classNames,
  removeHexPrefixIfExist,
  addressToPngSrc,
  addressToPngSrcV2,
  addressToUserName
} from 'utils'
import { PropsWithChildren, useEffect, useState } from 'react'
import { GroupFiService, useMessageDomain } from 'groupfi-sdk-shared'
// @ts-ignore
import PrivateGroupSVG from 'public/icons/private.svg?react'

import { useGroupIsPublic, useOneBatchUserProfile } from 'hooks'
import useGroupMeta from 'hooks/useGroupMeta'

export function UserInfo(props: { userId: string }) {
  const { messageDomain } = useMessageDomain()
  const groupFiService = messageDomain.getGroupFiService()

  const { userId } = props

  const { userProfileMap } = useOneBatchUserProfile([userId])

  const avatar = userProfileMap?.get(userId)?.avatar
    ? userProfileMap?.get(userId)?.avatar
    : addressToPngSrcV2(groupFiService.sha256Hash(userId))

  const [searchParams] = useSearchParams()
  const from = searchParams.get('from')
  return (
    <ContainerWrapper>
      <HeaderWrapper>
        <ReturnIcon backUrl={from || ''} />
        <GroupTitle showGroupPrivateIcon={false} title={'DETAILS'} />
      </HeaderWrapper>
      <ContentWrapper>
        <div className={classNames('py-5 pl-5 flex flex-row')}>
          <img
            src={avatar}
            className={classNames(
              'w-[73px] rounded-xl h-[73px] object-cover flex-none'
            )}
          />
          <div className={classNames('pt-1 pr-5 pl-4')}>
            <div
              className={classNames('font-medium text-[#333] dark:text-white')}
            >
              {userProfileMap?.get(userId)?.name ?? addressToUserName(userId)}
            </div>
            <div
              className={classNames(
                'break-all text-xs text-[#6C737C] leading-5 mt-1 dark:text-white'
              )}
            >
              {userId}
              <Copy text={userId ?? ''} />
            </div>
          </div>
        </div>
        {/* <UserInfoCollapse title="NFT"></UserInfoCollapse> */}
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

  const [joinedGroups, setJoinedGroups] = useState<string[] | undefined>(
    undefined
  )

  const loadJoinedGroups = async () => {
    const memberGroups = await groupFiService.loadAddressMemberGroups(userId)
    setJoinedGroups(memberGroups)
  }

  useEffect(() => {
    loadJoinedGroups()
  }, [])

  return joinedGroups !== undefined ? (
    joinedGroups.map((groupId) => (
      <div
        key={groupId}
        className={classNames(
          'pl-4 pr-2 py-2.5 border rounded-2xl border-[rgba(51, 51, 51, 0.08)] dark:bg-[#3C3D3F] dark:border-[#3C3D3F] mt-3 flex flex-row items-center'
        )}
        onClick={(event) => {
          event.stopPropagation()
        }}
      >
        <GroupIcon
          groupId={removeHexPrefixIfExist(groupId)}
          groupFiService={groupFiService}
          unReadNum={0}
        />
        <GroupNameWithIcon groupId={groupId} />
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

function GroupNameWithIcon(props: { groupId: string }) {
  const { groupId } = props
  const { groupName } = useGroupMeta(groupId)

  const { isPublic } = useGroupIsPublic(groupId)

  return (
    <>
      {isPublic === false && (
        <PrivateGroupSVG
          className={classNames(
            'fill-white stroke-black dark:!fill-[#3d3e3f] dark:!fill-transparent dark:stroke-white'
          )}
        />
      )}
      <div className={classNames('self-center ml-2 grow dark:text-white')}>
        {groupName}
      </div>
    </>
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
        'mx-5 cursor-pointer select-none border-t border-black/10 dark:border-[#eeeeee80] py-4'
      )}
    >
      <h3
        className={classNames(
          'font-medium text-[#333] inline-block mr-1.5 dark:text-white'
        )}
      >
        {title}
      </h3>
      <CollapseIcon collapsed={false} />
      {!haveExpanded ? null : (
        <div className={collapsed ? 'hidden' : 'block'}>{children}</div>
      )}
    </div>
  )
}

export default () => {
  const params = useParams()
  const userId = params.id
  if (!userId) {
    return null
  }
  return <UserInfo userId={userId} />
}
