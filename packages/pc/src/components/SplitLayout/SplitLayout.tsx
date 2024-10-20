import React from 'react';
import { Outlet } from 'react-router-dom';
import GroupList from '../GroupList/index';

const SplitLayout: React.FC = () => {
  return (
    <div className="flex h-full">
      <div className="w-1/3 border-r left-r">
        <GroupList />
      </div>
      <div className="w-2/3">
        <Outlet />
      </div>
    </div>
  );
};

export default SplitLayout;