import { useMessageDomain } from 'groupfi_trollbox_shared'
import { AppInitedContext } from '../App'
import { useContext } from 'react'

export function useGroupFiService() {
  const { messageDomain } = useMessageDomain()
  const { inited } = useContext(AppInitedContext)
  
  return inited ?  messageDomain.getGroupFiService() : null
}
