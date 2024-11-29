import { useMessageDomain } from 'groupfi-sdk-chat'
import { useEffect, useState, useCallback } from 'react'

export default function useGroupMember(groupId: string) {
  const { messageDomain } = useMessageDomain()

  const [member, setMember] = useState<
    { addr: string; publicKey: string }[] | undefined
  >()

  const refreshMember = useCallback(async () => {
    const res = await messageDomain.getGroupMember(groupId)
    setMember(res)
  }, [])

  useEffect(() => {
    refreshMember()

    messageDomain.onGroupMemberChanged(refreshMember)

    return () => messageDomain.offGroupMemberChanged(refreshMember)
  }, [])

  return member
}
