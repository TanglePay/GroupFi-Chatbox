import { useState, useEffect, useCallback } from 'react';
import {
    useMessageDomain,
  } from 'groupfi_chatbox_shared'
import { GroupConfig } from 'iotacat-sdk-core';
const useMyGroupConfig = () => {
  const [markedGroupConfig, setMarkedGroupConfig] = useState<GroupConfig[]>();
  const { messageDomain } = useMessageDomain();

  useEffect(() => {
    // Initial fetch of the configuration
    const initialConfig = messageDomain.getMarkedGroupConfigs();
    setMarkedGroupConfig(initialConfig);

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
