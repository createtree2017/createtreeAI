import React from 'react';
import { Link } from 'wouter';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  bgColor: string;
  textColor: string;
  href: string;
}

export default function FeatureCard({
  title,
  description,
  icon: Icon,
  bgColor,
  textColor,
  href,
}: FeatureCardProps) {
  return (
    <Link href={href}>
      <div 
        className={`
          relative rounded-xl overflow-hidden shadow-card 
          transition-all duration-300 transform hover:scale-[1.02] 
          h-full flex flex-col
          ${bgColor} ${textColor}
        `}
      >
        <div className="absolute top-0 right-0 w-20 h-20 opacity-20">
          <Icon size={80} />
        </div>
        
        <div className="p-5 flex flex-col h-full">
          <div className="flex items-center mb-3">
            <div className="bg-white/30 p-2.5 rounded-lg mr-3 shadow-soft">
              <Icon size={22} strokeWidth={2.5} />
            </div>
            <h3 className="font-semibold text-lg">{title}</h3>
          </div>
          
          <p className="text-sm font-medium mb-4 opacity-95">{description}</p>
          
          <div className="mt-auto">
            <div className="bg-white/20 hover:bg-white/30 transition-colors rounded-lg py-2 px-3 text-sm font-semibold inline-flex items-center shadow-soft">
              <span>Explore</span>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 16 16" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="ml-1.5"
              >
                <path 
                  d="M3.33334 8H12.6667" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
                <path 
                  d="M8 3.33337L12.6667 8.00004L8 12.6667" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}