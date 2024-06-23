import { useState, useEffect } from 'react'
import { useMessageDomain } from 'groupfi_chatbox_shared'
const useWalletConnection = () => {
  const { messageDomain } = useMessageDomain()
  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(true)

  useEffect(() => {
    // Define the callback for wallet address changes
    const handleWalletAddressChange = () => {
      setIsWalletConnected(messageDomain.isWalletConnected())
    }

    // Subscribe to wallet address changes
    messageDomain.onWalletAddressChanged(handleWalletAddressChange)
    handleWalletAddressChange()
    // Cleanup on unmount
    return () => {
      messageDomain.offWalletAddressChanged(handleWalletAddressChange)
    }
  }, [])

  return isWalletConnected
}

export default useWalletConnection
