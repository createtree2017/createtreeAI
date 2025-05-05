import React from 'react';
import { Link } from 'wouter';
import { LucideIcon } from 'lucide-react';

interface PolioCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  imageSrc?: string;
  href: string;
  isNew?: boolean;
  aspectRatio?: "square" | "portrait" | "landscape";
}

export default function PolioCard({
  title,
  description,
  icon: Icon,
  imageSrc,
  href,
  isNew = false,
  aspectRatio = "square",
}: PolioCardProps) {
  const aspectRatioClasses = {
    square: "aspect-square",
    portrait: "aspect-[2/3]",
    landscape: "aspect-[4/3]",
  };

  return (
    <Link href={href} className="block group">
      <div className="relative rounded-2xl overflow-hidden bg-[#1e1e24] border border-[#2a2a36] transition-all duration-300 hover:border-[#3a3a46] flex flex-col h-full">
        {/* 이미지 */}
        <div className={`${aspectRatioClasses[aspectRatio]} w-full overflow-hidden relative bg-[#181820]`}>
          {imageSrc ? (
            <img 
              src={imageSrc} 
              alt={title} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : Icon ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#232330] to-[#1a1a22]">
              <Icon size={aspectRatio === "square" ? 64 : 48} strokeWidth={1.5} className="text-primary-lavender opacity-80" />
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#232330] to-[#1a1a22]"></div>
          )}
          
          {/* NEW 배지 */}
          {isNew && (
            <div className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-bold bg-primary-lavender text-white rounded-md">
              NEW
            </div>
          )}
        </div>
        
        {/* 타이틀과 설명 */}
        <div className="p-3 flex-1 flex flex-col">
          <h3 className="font-medium text-white text-sm">{title}</h3>
          {description && (
            <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{description}</p>
          )}
        </div>
      </div>
    </Link>
  );
}