import { GroupFiService, useMessageDomain } from 'groupfi-sdk-shared'
import useSWR from 'swr'

// export function useGroupFiService() {
//   const { messageDomain } = useMessageDomain()

//   return inited ? messageDomain.getGroupFiService() : null
// }

export function getGroupMembersSwrKey(groupId: string): string[] {
  return ['group_members', groupId]
}

export function getOneBatchUserProfile(addressList: string[]) {
  if (addressList.length === 0) {
    return null
  }
  return ['one_batch_user_profile', ...addressList]
}

export function useOneBatchUserProfile(addressList: string[]) {
  const { messageDomain } = useMessageDomain()
  const groupFiService = messageDomain.getGroupFiService()
  const { data, error, isLoading } = useSWR(
    getOneBatchUserProfile(addressList),
    ([_, ...list]) => groupFiService.batchGetProfileFromNameMappingCache(list)
  )

  return {
    userProfileMap: data,
    error,
    isLoading
  }
}

export function useGroupMembers(groupId: string, max?: number) {
  const { messageDomain } = useMessageDomain()
  const groupFiService = messageDomain.getGroupFiService()
  const { data, error, isLoading } = useSWR(
    getGroupMembersSwrKey(groupId),
    ([_, id]) => groupFiService!.loadGroupMemberAddresses(id)
  )

  const memberAddresses: string[] | undefined =
    data !== undefined && max !== undefined && data.length > max
      ? data.slice(0, max)
      : data

  return {
    memberAddresses,
    error,
    isLoading
  }
}



export function getGroupIsPublicSwrKey(groupId: string): string[] {
  return ['group_is_public', groupId]
}

export function useGroupIsPublic(groupId: string) {
  const { messageDomain } = useMessageDomain()
  const groupFiService = messageDomain.getGroupFiService()
  const { data, error, isLoading, isValidating } = useSWR(
    getGroupIsPublicSwrKey(groupId),
    ([_, id]) => groupFiService!.isGroupPublic(id)
  )

  return {
    isPublic: data,
    error,
    isLoading,
    isValidating
  }
}
