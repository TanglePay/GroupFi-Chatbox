import { useEffect, useState } from 'react';
import { GroupFiService } from '../service/GroupFiService';

const groupFiServiceInstance = new GroupFiService();

export const useGroupFiService = () => {
  const [loaded, setLoaded] = useState(groupFiServiceInstance.isBootstraped);
  useEffect(() => {
    if (!loaded) {
      (async () => {
        await groupFiServiceInstance.bootstrap();
        setLoaded(true);
      })();
    }
  }, []);
  return loaded ? groupFiServiceInstance : undefined;
};
