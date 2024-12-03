import { useMessageDomain } from 'groupfi-sdk-chat'
import { useEffect, useState, useCallback } from 'react'
import { isGroupIdEqual } from 'utils'

export default function useGroupMember(groupId: string) {
  const { messageDomain } = useMessageDomain()

  const [member, setMember] = useState<
    { addr: string; publicKey: string }[] | undefined
  >()

  const refreshMember = useCallback(async () => {
    const res = await messageDomain.getGroupMember(groupId)
    setMember(res)
  }, [])

  const handleGroupMember = useCallback(
    ({ groupId: groupIdFromEvent }: { groupId: string }) => {
      if (isGroupIdEqual(groupId, groupIdFromEvent)) {
        refreshMember()
      }
    },
    [groupId]
  )

  useEffect(() => {
    refreshMember()

    messageDomain.onGroupMemberChanged(handleGroupMember)

    return () => messageDomain.offGroupMemberChanged(handleGroupMember)
  }, [])

  return member
}
