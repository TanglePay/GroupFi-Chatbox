import { wrapGroupMeta } from 'components/Shared'
import { useMessageDomain } from 'groupfi-sdk-chat'

const useGroupMeta = (groupId: string) => {
  const { messageDomain } = useMessageDomain()
  const groupFiService = messageDomain.getGroupFiService()

  const groupMeta = groupFiService.getGroupMetaByGroupId(groupId)
  if (!groupMeta) {
    throw new Error('groupMeta not found')
  }
  return wrapGroupMeta(groupMeta)
}

export default useGroupMeta
