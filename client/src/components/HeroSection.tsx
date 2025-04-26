import React from 'react';
import { ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  imageSrc: string;
}

export default function HeroSection({
  title,
  subtitle,
  ctaText,
  ctaLink,
  imageSrc,
}: HeroSectionProps) {
  return (
    <div className="relative overflow-hidden rounded-xl mb-8 shadow-card">
      {/* Background gradient overlay */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-primary-lavender/80 to-accent3-light/80 mix-blend-multiply z-10"
        aria-hidden="true"
      />
      
      {/* Hero image */}
      <div className="relative h-64 sm:h-80 md:h-96 w-full overflow-hidden">
        <img 
          src={imageSrc} 
          alt="Mother and baby" 
          className="absolute inset-0 w-full h-full object-cover object-center" 
        />
      </div>
      
      {/* Text content */}
      <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 text-white">
        <h2 className="text-2xl sm:text-3xl font-medium mb-2 drop-shadow-sm">{title}</h2>
        <p className="text-sm sm:text-base mb-4 max-w-md drop-shadow-sm">{subtitle}</p>
        
        <a 
          href={ctaLink} 
          className="inline-flex items-center justify-center bg-accent1-DEFAULT text-white rounded-full px-6 py-3 text-base font-semibold w-fit shadow-button hover:bg-accent1-dark transition-colors"
        >
          {ctaText}
          <ArrowRight size={18} className="ml-2" />
        </a>
      </div>
    </div>
  );
}