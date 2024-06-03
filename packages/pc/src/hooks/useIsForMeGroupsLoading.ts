import { useState, useEffect } from 'react'
import { useMessageDomain } from 'groupfi_chatbox_shared'

const useIsForMeGroupsLoading = () => {
  const { messageDomain } = useMessageDomain()

  const [isLoading, setIsLoading] = useState(
    messageDomain.isForMeGroupsLoading()
  )

  useEffect(() => {
    const handleLoadingChange = () => {
      const updateLoadingStatus = messageDomain.isForMeGroupsLoading()
      setIsLoading(updateLoadingStatus)
    }

    messageDomain.onIsForMeGroupsLoadingChanged(handleLoadingChange)
    handleLoadingChange()
    return () => {
      messageDomain.offIsForMeGroupsLoadingChanged(handleLoadingChange)
    }
  })

  return isLoading
}

export default useIsForMeGroupsLoading
