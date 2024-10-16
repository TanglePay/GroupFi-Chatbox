import { useState, useEffect, useCallback } from 'react';
import {
    useMessageDomain,
  } from 'groupfi-sdk-chat'
import { GroupConfig } from 'groupfi-sdk-core';
const useMyGroupConfig = () => {
  const { messageDomain } = useMessageDomain();
  const [markedGroupConfig, setMarkedGroupConfig] = useState<GroupConfig[] | undefined>(messageDomain.getMarkedGroupConfigs());
  
  useEffect(() => {
    // Initial fetch of the configuration
    // const initialConfig = messageDomain.getMarkedGroupConfigs();
    // setMarkedGroupConfig(initialConfig);

    // Define the callback for config changes
    const handleConfigChange = () => {
      const updatedConfig = messageDomain.getMarkedGroupConfigs();
      setMarkedGroupConfig(updatedConfig);
    };

    // Subscribe to config changes
    messageDomain.onMarkedGroupConfigsChanged(handleConfigChange);

    // Cleanup on unmount
    return () => {
      messageDomain.offMarkedGroupConfigsChanged(handleConfigChange);
    };
  }, []);

  return markedGroupConfig;
};

export default useMyGroupConfig;
