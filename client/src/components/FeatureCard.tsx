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
        <div className="absolute top-0 right-0 w-16 h-16 opacity-10">
          <Icon size={64} />
        </div>
        
        <div className="p-5 flex flex-col h-full">
          <div className="flex items-center mb-3">
            <div className="bg-white/20 p-2 rounded-lg mr-3">
              <Icon size={20} />
            </div>
            <h3 className="font-medium text-lg">{title}</h3>
          </div>
          
          <p className="text-sm opacity-90 mb-4">{description}</p>
          
          <div className="mt-auto text-sm font-medium flex items-center">
            <span>Explore</span>
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 16 16" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="ml-1"
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
    </Link>
  );
}