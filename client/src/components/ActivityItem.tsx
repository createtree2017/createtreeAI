import React from 'react';
import { LucideIcon, ExternalLink } from 'lucide-react';

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
    <div className="rounded-xl overflow-hidden shadow-soft bg-white mb-4 border border-neutral-light/50 hover:border-primary-lavender/20 transition-colors duration-300">
      <div className="flex items-center p-4">
        <div className={`w-12 h-12 rounded-xl ${bgColor} ${textColor} flex items-center justify-center mr-4 flex-shrink-0 shadow-soft`}>
          <Icon size={22} strokeWidth={2} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-neutral-darkest truncate font-heading">
            {title}
          </h4>
          <p className="text-xs text-neutral-dark mt-0.5 font-body">
            {timestamp}
          </p>
        </div>
        
        <button 
          onClick={onAction}
          className={`
            ml-2 text-sm font-medium transition-all duration-300
            ${type === 'music' 
              ? 'text-primary-lavender hover:text-primary-lavender/80' 
              : 'text-[#ff9fb5] hover:text-[#ff8aa3]'
            }
            rounded-full px-4 py-1.5 
            ${type === 'music' 
              ? 'bg-primary-lavender/10 hover:bg-primary-lavender/20' 
              : 'bg-[#ff9fb5]/10 hover:bg-[#ff9fb5]/20'
            }
          `}
          aria-label={type === 'music' ? `Listen to ${title}` : `View ${title}`}
        >
          <span className="flex items-center">
            {type === 'music' ? 'Listen' : 'View'}
            <ExternalLink size={14} className="ml-1.5" />
          </span>
        </button>
      </div>
    </div>
  );
}