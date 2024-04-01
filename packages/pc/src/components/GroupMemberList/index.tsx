import {
  GroupFiServiceWrapper,
  HeaderWrapper,
  ReturnIcon,
  ContainerWrapper,
  GroupTitle,
  ContentWrapper,
  Loading
} from '../Shared'
import { useParams } from 'react-router-dom'
import { useState, useCallback } from 'react'
import { classNames, addressToPngSrc, addressToUserName } from 'utils'
import { useGroupMembers, useOneBatchUserProfile } from 'hooks'
import { useMessageDomain } from 'groupfi_trollbox_shared'

import { Member } from '../GroupInfo'

export function GroupMemberList(props: { groupId: string }) {
  const { messageDomain } = useMessageDomain()
  const { groupId } = props

  const groupFiService = messageDomain.getGroupFiService()

  const currentAddress = groupFiService.getCurrentAddress()

  const { memberAddresses, isLoading } = useGroupMembers(groupId)

  const { userProfileMap } = useOneBatchUserProfile(memberAddresses ?? [])

  const [mutedAddress, setMutedAddress] = useState<string[]>([])

  const isGroupMember =
    (memberAddresses ?? []).find((address) => address === currentAddress) !==
    undefined

  const mutedMembers = async () => {
    const addressHashRes = await groupFiService.getGroupMuteMembers(groupId)
    console.log('***mutedMembers', addressHashRes)
    setMutedAddress(addressHashRes)
  }

  const refreshMutedMembers = useCallback(
    (memberAddress: string) => {
      const memberAddressHash = groupFiService.sha256Hash(memberAddress)
      setMutedAddress((s) =>
        s.includes(memberAddressHash)
          ? s.filter((i) => i !== memberAddressHash)
          : [...s, memberAddressHash]
      )
    },
    [mutedMembers]
  )

  return (
    <ContainerWrapper>
      <HeaderWrapper>
        <ReturnIcon />
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
            className={classNames(
              'grid grid-cols-[repeat(5,1fr)] gap-x-3.5 gap-y-2 px-15px pt-5 pb-3'
            )}
          >
            {(memberAddresses ?? []).map((memberAddress, index) => (
              <Member
                groupId={groupId}
                isGroupMember={isGroupMember}
                avatar={addressToPngSrc(
                  groupFiService.sha256Hash,
                  memberAddress
                )}
                muted={mutedAddress.includes(
                  groupFiService.sha256Hash(memberAddress)
                )}
                userProfile={userProfileMap?.[memberAddress]}
                groupFiService={groupFiService}
                address={memberAddress}
                key={memberAddress}
                isLastOne={(index + 1) % 5 === 0}
                name={addressToUserName(memberAddress)}
                currentAddress={currentAddress}
                refresh={refreshMutedMembers}
              />
            ))}
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
  // <GroupFiServiceWrapper<{
  //   groupFiService: GroupFiService
  //   groupId: string
  // }>
  //   component={GroupMemberList}
  //   paramsMap={{ id: 'groupId' }}
  // />
}
