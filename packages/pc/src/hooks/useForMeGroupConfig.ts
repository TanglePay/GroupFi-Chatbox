import { useState, useEffect, useCallback } from 'react';
import {
    useMessageDomain,
  } from 'groupfi_trollbox_shared'
import { GroupConfigPlus } from 'iotacat-sdk-core';

const useForMeGroupConfig = () => {
  const [forMeGroupConfig, setForMeGroupConfig] = useState<GroupConfigPlus[]>();
  const { messageDomain } = useMessageDomain()
  useEffect(() => {
    // Initial fetch of the configuration
    const initialConfig = messageDomain.getForMeGroupConfigs();
    setForMeGroupConfig(initialConfig);

    // Define the callback for config changes
    const handleConfigChange = () => {
      const updatedConfig = messageDomain.getForMeGroupConfigs();
      setForMeGroupConfig(updatedConfig);
    };

    // Subscribe to config changes
    messageDomain.onForMeGroupConfigsChanged(handleConfigChange);

    // Cleanup on unmount
    return () => {
      messageDomain.offForMeGroupConfigsChanged(handleConfigChange);
    };
  }, []);

  return forMeGroupConfig;
};

export default useForMeGroupConfig;
