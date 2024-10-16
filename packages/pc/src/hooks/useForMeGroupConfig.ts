import { useState, useEffect, useCallback } from 'react';
import {
    useMessageDomain,
  } from 'groupfi-sdk-shared'
import { GroupConfigPlus } from 'groupfi-sdk-core';

const useForMeGroupConfig = () => {
  const [forMeGroupConfig, setForMeGroupConfig] = useState<GroupConfigPlus[]>();
  const { messageDomain } = useMessageDomain()
  useEffect(() => {
    // Initial fetch of the configuration
    const initialConfig = messageDomain.getForMeGroupConfigs();
    // log initialConfig
    console.log('useForMeGroupConfig initialConfig', initialConfig)
    setForMeGroupConfig(initialConfig);

    // Define the callback for config changes
    const handleConfigChange = () => {
      const updatedConfig = messageDomain.getForMeGroupConfigs();
      // log updatedConfig
        console.log('useForMeGroupConfig updatedConfig', updatedConfig)
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
