import { useState, useEffect } from 'react';
import { useMessageDomain } from 'groupfi_chatbox_shared';

const usePairXStatus = () => {
  const { messageDomain } = useMessageDomain();
  const [isPairXSet, setIsPairXSet] = useState<boolean>();

  useEffect(() => {
    // Define the callback for PairX changes
    const handlePairXChange = () => {
      setIsPairXSet(messageDomain.getIsPairXSet());
    };

    // Subscribe to PairX changes
    messageDomain.onPairXChanged(handlePairXChange);
    handlePairXChange();
    // Cleanup on unmount
    return () => {
      messageDomain.offPairXChanged(handlePairXChange);
    };
  }, [messageDomain]);

  return isPairXSet;
};

export default usePairXStatus;
