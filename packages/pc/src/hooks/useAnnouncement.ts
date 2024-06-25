import { useState, useEffect } from 'react'
import { IIncludesAndExcludes, useMessageDomain } from 'groupfi_chatbox_shared'
import useContextField from './useContextField'

const useAnnouncement = () => {
  const announcement = useContextField<IIncludesAndExcludes[]>('announcement')

  return announcement
  // const [announcement, setAnnouncement] = useState<IIncludesAndExcludes[]>([])
  // const { messageDomain } = useMessageDomain()

  // useEffect(() => {
  //   // Initial fetch of the configuration
  //   const initialConfig = messageDomain.getAnnouncement()

  //   setAnnouncement(initialConfig)

  //   // Define the callback for config changes
  //   const handleConfigChange = () => {
  //     const updatedAnnouncement = messageDomain.getAnnouncement()

  //     setAnnouncement(updatedAnnouncement)
  //   }

  //   // Subscribe to config changes
  //   messageDomain.onAnnouncementChanged(handleConfigChange)

  //   // Cleanup on unmount
  //   return () => {
  //     messageDomain.offAnnouncementChanged(handleConfigChange)
  //   }
  // }, [])

  // return announcement
}

export default useAnnouncement
