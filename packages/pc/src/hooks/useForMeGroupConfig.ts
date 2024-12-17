import { useState, useEffect } from 'react';
import {
    useMessageDomain,
  } from 'groupfi-sdk-chat'
import { GroupConfigPlus, IIncludesAndExcludes } from 'groupfi-sdk-core';
import { isGroupIdEqual } from 'utils';

// Return all chat groups
const useForMeGroupConfig = () => {
  const [forMeGroupConfig, setForMeGroupConfig] = useState<Array<GroupConfigPlus & {isMember?:boolean}>>();
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

// Filter out certain includes.
export function useForMeGroupConfigWithIncludes(includes?: IIncludesAndExcludes[]) {
  const wantedGroupIds = (includes ?? []).map(item => item.groupId)
  // const dappGroupIds = (includes ?? []).map(item => item.groupId)
  const allForMeGroupConfig = useForMeGroupConfig()

  return allForMeGroupConfig?.filter(({groupId}) => {
    const found = wantedGroupIds.find(wantedGroupId => isGroupIdEqual(wantedGroupId, groupId))
    return !!found
  })

  // return allForMeGroupConfig?.filter(({dappGroupId}) => wantedGroupIds.includes(dappGroupId))
}

export default useForMeGroupConfig;
