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
    <div className="relative my-6">
      {title && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-xl md:text-2xl font-medium">{title}</h2>
        </div>
      )}
      
      <div className="overflow-hidden rounded-xl" ref={emblaRef}>
        <div className="flex">
          {items.map((item) => (
            <Link 
              key={item.id} 
              href={item.href}
              className="relative min-w-full block aspect-[4/5] md:aspect-[16/9] overflow-hidden rounded-2xl group"
            >
              {/* 이미지 배경 - 모바일에서는 3/4, 데스크톱에서는 2/3 */}
              <div className="absolute inset-0 h-3/4 md:h-2/3">
                <img 
                  src={item.imageSrc} 
                  alt={item.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                />
              </div>
              
              {/* 텍스트 콘텐츠 - 모바일에서는 1/4, 데스크톱에서는 1/3 */}
              <div className="absolute bottom-0 left-0 right-0 h-1/4 md:h-1/3 bg-[#2C3E50] p-3 md:p-4">
                <h3 className="text-white text-lg md:text-xl font-bold">{item.title}</h3>
                <p className="text-white/90 text-xs md:text-sm line-clamp-1 mt-1 md:mt-2 max-w-3xl">{item.description}</p>
                <div className="mt-1 inline-flex items-center bg-[#FF4D6D] hover:bg-[#FF3A5F] transition-colors px-3 py-1 rounded-full text-white text-xs font-medium">
                  무료로 이용하기
                  <ChevronRight size={12} className="ml-1" />
                </div>
              </div>
              
              {/* 신규 배지 */}
              {item.isNew && (
                <div className="absolute top-3 right-3 px-3 py-1 bg-[#FF4D6D] text-white text-xs font-bold rounded-md">
                  신규
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
      
      {/* 네비게이션 버튼 */}
      <button 
        onClick={scrollPrev} 
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
        aria-label="이전 슬라이드"
      >
        <ChevronLeft size={20} />
      </button>
      <button 
        onClick={scrollNext} 
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
        aria-label="다음 슬라이드"
      >
        <ChevronRight size={20} />
      </button>
      
      {/* 도트 인디케이터 */}
      {scrollSnaps.length > 1 && (
        <div className="flex justify-center gap-3 mt-3">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              className={`h-2 rounded-full transition-all ${
                index === selectedIndex 
                  ? 'bg-[#FF4D6D] w-6' 
                  : 'bg-gray-400/50 w-2 hover:bg-gray-400'
              }`}
              aria-label={`슬라이드 ${index + 1}로 이동`}
            />
          ))}
        </div>
      )}
    </div>
  );
}