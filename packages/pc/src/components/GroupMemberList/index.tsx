import {
  HeaderWrapper,
  ReturnIcon,
  ContainerWrapper,
  GroupTitle,
  ContentWrapper,
  Loading
} from '../Shared'
import { useParams, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { classNames, addressToUserName } from 'utils'
import { useGroupMembers, useOneBatchUserProfile } from 'hooks'
import { useMessageDomain } from 'groupfi_chatbox_shared'
import useUserBrowseMode from 'hooks/useUserBrowseMode'
import { IMUserLikeGroupMember, IMUserMuteGroupMember } from 'groupfi-sdk-core'

import { Member } from '../GroupInfo'

export function GroupMemberList(props: { groupId: string }) {
  const { messageDomain } = useMessageDomain()
  const { groupId } = props

  const groupFiService = messageDomain.getGroupFiService()

  const groupIdWithHexPrefix = groupFiService.addHexPrefixIfAbsent(groupId)

  const currentAddress = groupFiService.getCurrentAddress()

  const { memberAddresses, isLoading } = useGroupMembers(groupId)

  const { userProfileMap } = useOneBatchUserProfile(memberAddresses ?? [])

  const isGroupMember =
    (memberAddresses ?? []).find((address) => address === currentAddress) !==
    undefined

  const isUserBrowseMode = useUserBrowseMode()

  const [allLikedUsers, setAllLikedUsers] = useState<IMUserLikeGroupMember[]>(
    []
  )

  const [allMutedUsers, setAllMutedUsers] = useState<IMUserMuteGroupMember[]>(
    []
  )

  const fetchAllMutedUsers = async () => {
    const res = await groupFiService.getAllUserMuteGroupMembers()
    setAllMutedUsers(res)
  }

  const fetchAllLikedUsers = async () => {
    const res = await groupFiService.getAllUserLikeGroupMembers()
    setAllLikedUsers(res)
  }

  useEffect(() => {
    if (!isUserBrowseMode) {
      fetchAllLikedUsers()
      fetchAllMutedUsers()
    }
  }, [isUserBrowseMode])
  const location = useLocation()
  const groupUrl = location.pathname.replace('/members', '')
  return (
    <ContainerWrapper>
      <HeaderWrapper>
        <ReturnIcon backUrl={groupUrl} />
        <GroupTitle
          showGroupPrivateIcon={false}
          title={`Group (${(memberAddresses ?? []).length})`}
        />
      </HeaderWrapper>
      <ContentWrapper>
        {isLoading ? (
          <Loading />
        ) : (
          <div
            className={classNames('grid gap-y-2 px-15px pt-5 pb-3')}
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(62px, 1fr))'
            }}
          >
            {(memberAddresses ?? []).map((memberAddress, index) => {
              const memberSha256Hash = groupFiService.sha256Hash(memberAddress)
              const isSameMember = (
                member: IMUserLikeGroupMember | IMUserMuteGroupMember
              ) =>
                member.groupId === groupIdWithHexPrefix &&
                member.addrSha256Hash === memberSha256Hash
              const addMember = (
                old: IMUserLikeGroupMember[] | IMUserMuteGroupMember[]
              ) => [
                ...old,
                {
                  groupId: groupIdWithHexPrefix,
                  addrSha256Hash: memberSha256Hash
                }
              ]
              const removeMember = (
                old: IMUserLikeGroupMember[] | IMUserMuteGroupMember[]
              ) =>
                old.filter(
                  (m) =>
                    m.groupId !== groupIdWithHexPrefix ||
                    m.addrSha256Hash !== memberSha256Hash
                )
              const isLiked = allLikedUsers.find(isSameMember)
              const isMuted = allMutedUsers.find(isSameMember)
              return (
                <Member
                  isLiked={!!isLiked}
                  isMuted={!!isMuted}
                  likeOperationCallback={async () => {
                    setAllLikedUsers(isLiked ? removeMember : addMember)
                    fetchAllLikedUsers()
                  }}
                  muteOperationCallback={async () => {
                    setAllMutedUsers(isMuted ? removeMember : addMember)
                    fetchAllMutedUsers()
                  }}
                  groupId={groupId}
                  isGroupMember={isGroupMember}
                  userProfile={userProfileMap?.get(memberAddress)}
                  groupFiService={groupFiService}
                  address={memberAddress}
                  key={memberAddress}
                  isLastOne={(index + 1) % 5 === 0}
                  name={addressToUserName(memberAddress)}
                  currentAddress={currentAddress}
                />
              )
            })}
          </div>
        )}
      </ContentWrapper>
    </ContainerWrapper>
  )
}

export default () => {
  const params = useParams()
  const groupId = params.id
  if (!groupId) {
    return null
  }
  return <GroupMemberList groupId={groupId} />
}
