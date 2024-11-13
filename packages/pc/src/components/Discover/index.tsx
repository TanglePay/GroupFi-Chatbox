import React, { useState, useEffect } from 'react';
import { classNames } from 'utils';
import { useAppDispatch } from 'redux/hooks';

interface Tab {
  id: string;
  name: string;
  chainId: string;
  description: string;
}

interface GroupChat {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  activeOnChain: string;
  members: string;
}

const GroupChatCard: React.FC<GroupChat> = ({ imageUrl, title, description, activeOnChain, members }) => (
  <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:scale-[1.01] bg-white dark:bg-gray-800">
    <div className="flex flex-col items-center">
      <img
        src={imageUrl}
        alt={title}
        className="w-24 h-24 rounded-full object-cover shadow-md"
      />
      <h3 className="text-xl font-semibold mt-4 dark:text-white">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2 line-clamp-2">{description}</p>
    </div>
    <div className="flex justify-between mt-6 text-sm font-medium">
      <span className="flex items-center text-gray-600 dark:text-gray-300">
        <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
        {activeOnChain} active
      </span>
      <span className="flex items-center text-gray-600 dark:text-gray-300">
        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
        </svg>
        {members}
      </span>
    </div>
  </div>
);

const Discover: React.FC = () => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchTabs = async () => {
    try {
      // Placeholder data - replace with actual API call
      const mockTabs = [
        { id: 'poap', name: 'POAP', chainId: '1', description: 'Proof of Attendance Protocol' },
        { id: 'ethglobalBankok', name: 'ethglobalBankok', chainId: '1', description: 'ethglobalBankok' },
        { id: 'lens', name: 'Lens', chainId: '137', description: 'Social Media Protocol' },
        { id: 'farcaster', name: 'Farcaster', chainId: '10', description: 'Decentralized Social Protocol' }
      ];
      setTabs(mockTabs);
      setActiveTab(mockTabs[0].id);
    } catch (error) {
      console.error('Error fetching tabs:', error);
    }
  };

  const fetchGroupChats = async (tabId: string) => {
    setLoading(true);
    try {
      // Placeholder data - replace with actual API call
      const mockData = [
        {
          id: '1',
          imageUrl: 'https://placeholder.com/100',
          title: 'POAP Collectors',
          description: 'A community for POAP collectors',
          activeOnChain: '1.2k',
          members: '3.4k'
        },
        // Add more mock data as needed
      ];
      setGroupChats(mockData);
    } catch (error) {
      console.error('Error fetching group chat data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTabs();
  }, []);

  useEffect(() => {
    if (activeTab) {
      fetchGroupChats(activeTab);
    }
  }, [activeTab]);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <div className="flex border-b border-gray-200 dark:border-gray-700 px-6 bg-white dark:bg-gray-800 sticky top-0 z-10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={classNames(
              'px-6 py-4 text-sm font-medium transition-colors relative',
              activeTab === tab.id
                ? 'text-accent-600 dark:text-accent-500'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            )}
          >
            {tab.name}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent-600 dark:bg-accent-500"></div>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {tabs.find((tab) => tab.id === activeTab) && (
          <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
            <h1 className="text-3xl font-bold dark:text-white">
              {tabs.find((tab) => tab.id === activeTab)?.name} 
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-3 text-lg">
              {tabs.find((tab) => tab.id === activeTab)?.description}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold dark:text-white">Popular Group Chats</h2>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-accent-600 border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupChats.map((groupChat) => (
              <GroupChatCard key={groupChat.id} {...groupChat} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Discover; 