import { useMessageDomain } from 'groupfi-sdk-chat'
import { useCallback, useEffect } from 'react'
import useSWR, { mutate } from 'swr'

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

export function getGroupIsPublicSwrKey(
  groupId: string,
  notActualFetch?: boolean
): string[] | null {
  if (notActualFetch) {
    return null
  }
  return ['group_is_public', groupId]
}

export function useGroupIsPublic(groupId: string, notActualFetch?: boolean) {
  const { messageDomain } = useMessageDomain()
  const groupFiService = messageDomain.getGroupFiService()

  // const { data, error, isLoading, isValidating } = useSWR(
  //   getGroupIsPublicSwrKey(groupId, notActualFetch),
  //   ([_, id]) => groupFiService!.isGroupPublic(id)
  // )

  const fetchIsGroupPublic = async (groupId: string) => {
    const res = await messageDomain.isGroupPublic(groupId)
    if (res !== undefined) {
      return res
    }
    return await groupFiService.isGroupPublic(groupId)
  }

  const { data, error, isLoading, isValidating } = useSWR(
    getGroupIsPublicSwrKey(groupId, notActualFetch),
    ([_, id]) => fetchIsGroupPublic(id)
  )

  const refreshData = useCallback(() => {
    mutate(getGroupIsPublicSwrKey(groupId, notActualFetch))
  }, [groupId])

  useEffect(() => {
    messageDomain.onGroupIsPublicChanged(refreshData)
    return () => messageDomain.offGroupIsPublicChanged(refreshData)
  }, [groupId])

  return {
    isPublic: data,
    error,
    isLoading,
    isValidating
  }
}
