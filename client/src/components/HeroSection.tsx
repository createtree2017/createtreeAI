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
    <div className="relative overflow-hidden rounded-2xl mb-8 shadow-card border border-primary-lavender/10">
      {/* Background gradient overlay */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-primary-lavender/70 to-primary-mint/60 mix-blend-multiply z-10"
        aria-hidden="true"
      />
      
      {/* Hero image */}
      <div className="relative h-64 sm:h-80 md:h-96 w-full overflow-hidden">
        <img 
          src={imageSrc} 
          alt="Mother and baby bonding moment" 
          className="absolute inset-0 w-full h-full object-cover object-center" 
        />
      </div>
      
      {/* Text content */}
      <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 sm:p-8 text-white">
        <h2 className="text-2xl sm:text-3xl font-medium mb-2 drop-shadow-sm font-heading">{title}</h2>
        <p className="text-sm sm:text-base mb-6 max-w-md drop-shadow-sm font-body leading-relaxed">{subtitle}</p>
        
        <a 
          href={ctaLink} 
          className="inline-flex items-center justify-center bg-gradient-to-r from-[#ff9fb5] to-[#ff8aa3] text-white rounded-full px-6 py-3 text-base font-medium w-fit shadow-lg hover:shadow-xl transition-all duration-300 hover:translate-y-[-2px]"
          aria-label={`${ctaText} - begin creating`}
        >
          {ctaText}
          <ArrowRight size={18} className="ml-2" />
        </a>
      </div>
    </div>
  );
}