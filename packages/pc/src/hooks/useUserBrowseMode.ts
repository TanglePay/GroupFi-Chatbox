import { useState, useEffect } from 'react'
import { useMessageDomain } from 'groupfi_trollbox_shared'

const useUserBrowseMode = () => {
  const { messageDomain } = useMessageDomain()
  const [isUserBrowseMode, setIsUserBrowseMode] = useState(
    messageDomain.isUserBrowseMode()
  )

  useEffect(() => {
    const handleUserBrowseModeChange = () => {
      setIsUserBrowseMode(messageDomain.isUserBrowseMode())
    }

    messageDomain.onLoginStatusChanged(handleUserBrowseModeChange)

    return () => {
      messageDomain.offLoginStatusChanged(handleUserBrowseModeChange)
    }
  }, [])

  return isUserBrowseMode
}

export default useUserBrowseMode
