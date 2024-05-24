import { useState, useEffect } from 'react';
import { useMessageDomain } from 'groupfi_trollbox_shared';

const useRegistrationStatus = () => {
  const { messageDomain } = useMessageDomain();
  const [isRegistered, setIsRegistered] = useState(messageDomain.isRegistered);

  useEffect(() => {
    // Define the callback for registration status changes
    const handleRegisterStatusChange = () => {
      setIsRegistered(messageDomain.isRegistered);
    };

    // Subscribe to registration status changes
    messageDomain.onRegisterStatusChanged(handleRegisterStatusChange);

    // Cleanup on unmount
    return () => {
      messageDomain.offRegisterStatusChanged(handleRegisterStatusChange);
    };
  }, [messageDomain]);

  return isRegistered;
};

export default useRegistrationStatus;
