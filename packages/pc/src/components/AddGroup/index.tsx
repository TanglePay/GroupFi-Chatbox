import { useEffect, useState } from 'react';
import axios from 'axios'; 
import { useNavigate } from 'react-router-dom';
import { removeHexPrefixIfExist } from 'utils';
import { IIncludesAndExcludes, useMessageDomain } from "groupfi-sdk-chat";

import { useForMeGroupConfigWithIncludes } from 'hooks/useForMeGroupConfig'


interface Group {
  groupName: string;
  groupId: string;
}

interface ChainOption {
  id: number;
  name: string;
}

const chainOptions: ChainOption[] = [
  { id: 1, name: 'Ethereum' },
  { id: 10, name: 'Optimism' },
  { id: 42, name: 'Lukso' },
  { id: 56, name: 'Binance' },
  { id: 137, name: 'Polygon' },
  { id: 148, name: 'Shimmer' },
  { id: 185, name: 'Mint' },
  { id: 518, name: 'Solana' },
];

export function AddGroupButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <div 
        className="flex justify-center items-center h-6 cursor-pointer"
        onClick={handleClick}
      >
        <span className="text-2xl font-light">+</span>
      </div>
      {isModalOpen && <AddGroupModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
}

function AddGroupModal({ onClose }: { onClose: () => void }) {
  const [chainId, setChainId] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { messageDomain } = useMessageDomain();

  // Save the added dapp includes.
  const [addedDappIncludes, setAddedDappIncludes] = useState<IIncludesAndExcludes[]>()

  // Retrieve group configs information based on the added dapp includes.
  const addedGroupsConfig = useForMeGroupConfigWithIncludes(addedDappIncludes)

  useEffect(() => {
    if (addedDappIncludes?.length) {
      // Subscribe to added groups.
      messageDomain.listenGroupsAdd(addedDappIncludes)
    }
  }, [addedDappIncludes])


  useEffect(() => {
    // In this scenario, there is only one group, so it can be handled simply. 
    // If addedGroupsConfig has a return value, it indicates that the added group configuration has been retrieved.
    if (addedGroupsConfig?.length) {
      const config = addedGroupsConfig[0]
      const groupId = removeHexPrefixIfExist(config.groupId);
      navigate(`/group/${groupId}`);
      onClose();
    }
  }, [addedGroupsConfig])

  const handleSearch = async () => {
    setError(null);
    if (!chainId) {
      setError('Please select a Chain ID');
      return;
    }
    try {
      const response = await axios.post('https://api.config.groupfi.ai/api/groupfi/v1/dappquerygroupconfigs', {
        contractAddress,
        chainId: parseInt(chainId, 10)
      });

      if (response.data === null) {
        setError('No groups found for the given Chain ID and Contract Address');
        setGroups([]);
      } else {
        setGroups(response.data);
      }
    } catch (err) {
      setError('An error occurred while searching for groups');
      console.error('Error fetching groups:', err);
    }
  };

  const handleGroupSelect = (dappGroupId: string) => {
    const includes = [{ groupId: dappGroupId }];
    setAddedDappIncludes(includes)
    // setAddedDappGroupId(dappGroupId)
    // Subscribe to an additional group
    // messageDomain.listenGroupsAdd(includes)
    // const configs = await groupFiService.fetchForMeGroupConfigs({ includes });
    // const groupid = removeHexPrefixIfExist(configs[0].groupId);
    // navigate(`/group/${groupid}`);
    // onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-[480px] max-w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Search Group</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <select
          value={chainId}
          onChange={(e) => setChainId(e.target.value)}
          className="w-full mb-4 p-3 border rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white"
        >
          <option value="">Select Chain ID</option>
          {chainOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.id} - {option.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Contract Address"
          value={contractAddress}
          onChange={(e) => setContractAddress(e.target.value)}
          className="w-full mb-4 p-3 border rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white"
        />
        <button 
          onClick={handleSearch} 
          className="w-full mb-4 p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-300"
        >
          Search
        </button>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {groups.length > 0 && (
          <div className="mt-4 max-h-60 overflow-y-auto">
            {/* <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Select a group:</h3> */}
            <div className="grid grid-cols-1 gap-2">
              {groups.map((group) => (
                <button
                  key={group.groupId}
                  onClick={() => handleGroupSelect(group.groupId)}
                  className="p-2 text-left bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition duration-300"
                >
                  {group.groupName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
