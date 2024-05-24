import { useState, useEffect } from 'react';
import {
    useMessageDomain,
  } from 'groupfi_trollbox_shared'
const useWalletConnection = () => {
    const { messageDomain } = useMessageDomain();
  const [isWalletConnected, setIsWalletConnected] = useState(messageDomain.isWalletConnected);

  useEffect(() => {
    // Define the callback for wallet address changes
    const handleWalletAddressChange = () => {
      setIsWalletConnected(messageDomain.isWalletConnected);
    };

    // Subscribe to wallet address changes
    messageDomain.onWalletAddressChanged(handleWalletAddressChange);

    // Cleanup on unmount
    return () => {
      messageDomain.offWalletAddressChanged(handleWalletAddressChange);
    };
  }, []);

  return isWalletConnected;
};

export default useWalletConnection;
