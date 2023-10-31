import { useMessageDomain } from 'groupfi_trollbox_shared'

export function useGroupFiService() {
  const { messageDomain } = useMessageDomain()
  return messageDomain.getGroupFiService()
}
