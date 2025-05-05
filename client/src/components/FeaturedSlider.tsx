import React, { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Link } from 'wouter';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface FeaturedItem {
  id: number;
  title: string;
  description: string;
  imageSrc: string;
  href: string;
  isNew?: boolean;
}

interface FeaturedSliderProps {
  items: FeaturedItem[];
  title?: string;
}

export default function FeaturedSlider({ items, title }: FeaturedSliderProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  if (items.length === 0) {
    return null;
  }
  
  // 자동 슬라이드 기능
  useEffect(() => {
    if (!emblaApi) return;
    
    const autoplayInterval = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000); // 5초마다 슬라이드 변경
    
    return () => {
      clearInterval(autoplayInterval);
    };
  }, [emblaApi]);

  return (
    <div className="relative">
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-medium">{title}</h2>
        </div>
      )}
      
      <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
        <div className="flex">
          {items.map((item) => (
            <Link 
              key={item.id} 
              href={item.href}
              className="relative min-w-full block aspect-[2/1] overflow-hidden rounded-2xl group"
            >
              {/* 이미지 배경 */}
              <div className="absolute inset-0">
                <img 
                  src={item.imageSrc} 
                  alt={item.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20" />
              </div>
              
              {/* 텍스트 콘텐츠 */}
              <div className="absolute bottom-0 left-0 p-6 w-full">
                <h3 className="text-white text-xl md:text-2xl font-semibold mb-2">{item.title}</h3>
                <p className="text-white/80 text-sm md:text-base line-clamp-2">{item.description}</p>
                <div className="mt-4 inline-flex items-center bg-white/20 hover:bg-white/30 transition-colors px-4 py-2 rounded-full text-white text-sm">
                  바로가기
                  <ChevronRight size={16} className="ml-1" />
                </div>
              </div>
              
              {/* NEW 배지 */}
              {item.isNew && (
                <div className="absolute top-4 right-4 px-2 py-1 bg-primary-lavender text-white text-xs font-bold rounded-md">
                  NEW
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
      
      {/* 네비게이션 버튼 */}
      <button 
        onClick={scrollPrev} 
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
        aria-label="이전 슬라이드"
      >
        <ChevronLeft size={20} />
      </button>
      <button 
        onClick={scrollNext} 
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
        aria-label="다음 슬라이드"
      >
        <ChevronRight size={20} />
      </button>
      
      {/* 도트 인디케이터 */}
      {scrollSnaps.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === selectedIndex 
                  ? 'bg-primary-lavender w-4' 
                  : 'bg-neutral-600 hover:bg-neutral-500'
              }`}
              aria-label={`슬라이드 ${index + 1}로 이동`}
            />
          ))}
        </div>
      )}
    </div>
  );
}