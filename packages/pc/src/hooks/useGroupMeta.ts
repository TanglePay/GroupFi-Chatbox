import { wrapGroupMeta } from 'components/Shared'
import { useMessageDomain } from 'groupfi-sdk-chat'

const useGroupMeta = (groupId: string) => {
  const { messageDomain } = useMessageDomain()
  const groupMeta = messageDomain.getGroupConfigFromCache(groupId)

  if (!groupMeta) {
    throw new Error(`groupMeta not found, groupId: ${groupId}`)
  }
  return wrapGroupMeta(groupMeta)
}

export default useGroupMeta
