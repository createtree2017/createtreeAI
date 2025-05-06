import React from 'react';

interface TopMenuBarProps {
  title?: string;
}

const TopMenuBar: React.FC<TopMenuBarProps> = ({ title = "Mom's Service" }) => {
  return (
    <div className="bg-black text-white w-full p-4 flex items-center justify-center relative">
      <button className="absolute left-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      <h1 className="font-medium text-lg">{title}</h1>
    </div>
  );
};

export default TopMenuBar;