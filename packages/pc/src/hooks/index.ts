import { useMessageDomain } from 'groupfi_trollbox_shared'
import { AppInitedContext } from '../App'
import { useContext } from 'react'
import useSWR from 'swr'

export function useGroupFiService() {
  const { messageDomain } = useMessageDomain()
  const { inited } = useContext(AppInitedContext)

  return inited ? messageDomain.getGroupFiService() : null
}

export function getGroupMembersSwrKey(groupId: string): string[] {
  return ['group_members', groupId]
}
export function useGroupMembers(groupId: string, max?: number) {
  const groupFiService = useGroupFiService()
  const { data, error, isLoading } = useSWR(
    getGroupMembersSwrKey(groupId),
    ([_, id]) => groupFiService!.loadGroupMemberAddresses(id)
  )

  const memberAddresses =
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
  const groupFiService = useGroupFiService()
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
