import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ActivityItemProps {
  icon: LucideIcon;
  bgColor: string;
  textColor: string;
  title: string;
  timestamp: string;
  type: "music" | "image";
  onAction: () => void;
}

export default function ActivityItem({
  icon: Icon,
  bgColor,
  textColor,
  title,
  timestamp,
  type,
  onAction,
}: ActivityItemProps) {
  return (
    <div className="rounded-lg overflow-hidden shadow-soft bg-white mb-4">
      <div className="flex items-center p-4">
        <div className={`w-10 h-10 rounded-lg ${bgColor} ${textColor} flex items-center justify-center mr-3 flex-shrink-0`}>
          <Icon size={20} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-neutral-darkest truncate">
            {title}
          </h4>
          <p className="text-xs text-neutral-dark mt-0.5">
            {timestamp}
          </p>
        </div>
        
        <button 
          onClick={onAction}
          className="ml-2 text-sm font-medium text-primary-lavender hover:text-primary-lavender/80 transition-colors"
        >
          {type === 'music' ? 'Listen' : 'View'}
        </button>
      </div>
    </div>
  );
}