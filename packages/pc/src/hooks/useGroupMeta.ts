import { wrapGroupMeta } from 'components/Shared'
import { useMessageDomain } from 'groupfi-sdk-chat'
import { MessageGroupMeta } from 'groupfi-sdk-core'
import { useNavigate } from 'react-router-dom'

const useGroupMeta = (groupId: string) => {
  const { messageDomain } = useMessageDomain()
  const navigate = useNavigate()
  const groupMeta = messageDomain.getGroupConfigFromCache(groupId)

  if (!groupMeta) {
    console.error(`Group metadata not found for groupId: ${groupId}`)
    // Navigate to home page
    navigate('/')
    return {
      groupName: '',
      icon: '',
      isPublic: false
    } as unknown as MessageGroupMeta
  }
  
  return wrapGroupMeta(groupMeta)
}

export default useGroupMeta
