import {
  GroupFiServiceWrapper,
  HeaderWrapper,
  ReturnIcon,
  ContainerWrapper,
  GroupTitle,
  ContentWrapper,
  Loading
} from '../Shared'
import { useState, useCallback } from 'react'
import { classNames, addressToPngSrc, addressToUserName } from 'utils'
import { useGroupMembers } from 'hooks'
import { GroupFiService } from 'groupfi_trollbox_shared'

import { Member } from '../GroupInfo'

function GroupMemberList(props: {
  groupId: string
  groupFiService: GroupFiService
}) {
  const { groupId, groupFiService } = props

  const userAddress = groupFiService.getUserAddress()

  const { memberAddresses, isLoading } = useGroupMembers(groupId)

  const [mutedAddress, setMutedAddress] = useState<string[]>([])

  const isGroupMember =
    (memberAddresses ?? []).find((address) => address === userAddress) !==
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
          showGroupIcon={false}
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
                groupFiService={groupFiService}
                address={memberAddress}
                key={memberAddress}
                isLastOne={(index + 1) % 5 === 0}
                name={addressToUserName(memberAddress)}
                userAddress={userAddress}
                refresh={refreshMutedMembers}
              />
            ))}
          </div>
        )}
      </ContentWrapper>
    </ContainerWrapper>
  )
}

export default () => (
  <GroupFiServiceWrapper<{
    groupFiService: GroupFiService
    groupId: string
  }>
    component={GroupMemberList}
    paramsMap={{ id: 'groupId' }}
  />
)

