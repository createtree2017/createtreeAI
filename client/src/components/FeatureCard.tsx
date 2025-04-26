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
  highlight?: boolean;
}

export default function FeatureCard({
  title,
  description,
  icon: Icon,
  bgColor,
  textColor,
  href,
  highlight = false,
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
        <div className="absolute top-1 right-1 w-24 h-24 opacity-25">
          <Icon size={96} strokeWidth={1.8} />
        </div>
        
        <div className="p-5 flex flex-col h-full">
          <div className="flex items-center mb-3">
            <div className="bg-white/40 p-3 rounded-lg mr-3.5 shadow-card">
              <Icon size={24} strokeWidth={2.8} />
            </div>
            <h3 className="font-semibold text-lg tracking-wide">{title}</h3>
          </div>
          
          <p className="text-sm font-medium mb-4 opacity-95">{description}</p>
          
          <div className="mt-auto">
            <div className={`
              ${highlight 
                ? 'bg-white/90 text-[#e9779d] hover:bg-white py-2 px-4 shadow-card' 
                : 'bg-white/20 hover:bg-white/30 py-2 px-3 shadow-soft'
              } 
              transition-all duration-300 rounded-lg text-sm font-semibold inline-flex items-center
            `}>
              <span>{highlight ? 'Start Now' : 'Explore'}</span>
              <svg 
                width={highlight ? "18" : "16"} 
                height={highlight ? "18" : "16"} 
                viewBox="0 0 16 16" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className={highlight ? "ml-2 animate-pulse" : "ml-1.5"}
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