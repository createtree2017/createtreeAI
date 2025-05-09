import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface FloatingItem {
  id: number;
  emoji: string;
  name: string;
  size: number;
  x: number;
  y: number;
  duration: number;
  delay: number;
  opacity: number;
  blur: number;
}

// 유아용품 관련 이모지 목록
const babyItems = [
  { emoji: '🍼', name: '젖병' },
  { emoji: '👶', name: '아기' },
  { emoji: '🧸', name: '테디베어' },
  { emoji: '🧩', name: '퍼즐' },
  { emoji: '🧦', name: '양말' },
  { emoji: '👕', name: '옷' },
  { emoji: '🎀', name: '리본' },
  { emoji: '🦄', name: '유니콘' },
  { emoji: '🐘', name: '코끼리' },
  { emoji: '🚼', name: '아기표시' },
  { emoji: '🌙', name: '달' },
  { emoji: '⭐', name: '별' },
  { emoji: '🌈', name: '무지개' },
  { emoji: '🧴', name: '로션' },
  { emoji: '🧷', name: '안전핀' },
];

const FloatingBabyItems: React.FC = () => {
  const [items, setItems] = useState<FloatingItem[]>([]);

  useEffect(() => {
    // 화면 크기에 따라 총 아이템 개수 결정
    const numItems = window.innerWidth < 768 ? 20 : 30;
    
    // 카테고리 5단계로 확장 (1~5 크기)
    // 1: 매우 작음, 2: 작음, 3: 중간, 4: 큼, 5: 매우 큼
    
    // 크기별 카운트 변수
    let sizeCounters = {
      size1: 0,
      size2: 0,
      size3: 0,
      size4: 0,
      size5: 0
    };
    
    // 크기별 최대 개수 (반응형)
    const sizeMaxCount = {
      size1: window.innerWidth < 768 ? 9 : 13,  // 작은 크기 객체 많게
      size2: window.innerWidth < 768 ? 7 : 10,  // 작은 크기 객체 많게
      size3: window.innerWidth < 768 ? 2 : 4,   // 중간 크기는 적당히
      size4: window.innerWidth < 768 ? 1 : 2,   // 큰 크기는 적게
      size5: window.innerWidth < 768 ? 1 : 1    // 매우 큰 크기는 1개로 제한
    };
    
    // 랜덤 아이템 생성
    const newItems: FloatingItem[] = Array.from({ length: numItems }).map((_, index) => {
      const randomItem = babyItems[Math.floor(Math.random() * babyItems.length)];
      
      // 크기 카테고리 결정 - 남은 슬롯을 기반으로
      let sizeCategory = 1; // 기본값은 가장 작은 크기
      
      // 카테고리 결정 로직
      // 1. 각 카테고리에 최소 개수 이상 할당되어 있는지 확인
      // 2. 그 후에는 작은 크기(1,2)가 더 높은 확률로 선택되도록 함
      if (sizeCounters.size5 < sizeMaxCount.size5 && Math.random() < 0.1) {
        sizeCategory = 5;
        sizeCounters.size5++;
      } else if (sizeCounters.size4 < sizeMaxCount.size4 && Math.random() < 0.2) {
        sizeCategory = 4;
        sizeCounters.size4++;
      } else if (sizeCounters.size3 < sizeMaxCount.size3 && Math.random() < 0.3) {
        sizeCategory = 3;
        sizeCounters.size3++;
      } else if (sizeCounters.size2 < sizeMaxCount.size2 && Math.random() < 0.4) {
        sizeCategory = 2;
        sizeCounters.size2++;
      } else {
        sizeCategory = 1;
        sizeCounters.size1++;
      }
      
      let size, opacity, blur, duration;
      
      // 크기, 투명도, 블러 효과, 애니메이션 속도를 크기 카테고리에 맞게 설정
      if (sizeCategory === 1) { // 가장 작은 아이템 (1단계)
        size = Math.random() * 8 + 12; // 12-20px
        opacity = Math.random() * 0.1 + 0.1; // 0.1-0.2
        blur = Math.random() * 0.5 + 1; // 1-1.5px (약한 흐림)
        duration = Math.random() * 25 + 55; // 55-80초 (가장 느리게)
      } else if (sizeCategory === 2) { // 작은 아이템 (2단계)
        size = Math.random() * 10 + 20; // 20-30px
        opacity = Math.random() * 0.1 + 0.08; // 0.08-0.18
        blur = Math.random() * 0.7 + 1.5; // 1.5-2.2px (약간 흐림)
        duration = Math.random() * 20 + 45; // 45-65초 (느리게)
      } else if (sizeCategory === 3) { // 중간 아이템 (3단계)
        size = Math.random() * 15 + 30; // 30-45px
        opacity = Math.random() * 0.08 + 0.06; // 0.06-0.14
        blur = Math.random() * 0.8 + 2.2; // 2.2-3px (중간 흐림)
        duration = Math.random() * 15 + 35; // 35-50초 (중간 속도)
      } else if (sizeCategory === 4) { // 큰 아이템 (4단계)
        size = Math.random() * 25 + 45; // 45-70px
        opacity = Math.random() * 0.06 + 0.04; // 0.04-0.1
        blur = Math.random() * 1 + 3; // 3-4px (더 흐리게)
        duration = Math.random() * 15 + 25; // 25-40초 (빠르게)
      } else { // 매우 큰 아이템 (5단계)
        size = Math.random() * 60 + 90; // 90-150px (매우 큰 사이즈)
        opacity = Math.random() * 0.04 + 0.02; // 0.02-0.06 (매우 투명하게)
        blur = Math.random() * 2 + 4; // 4-6px (매우 흐릿하게)
        duration = Math.random() * 10 + 20; // 20-30초 (매우 빠르게)
      }
      
      return {
        id: index,
        emoji: randomItem.emoji,
        name: randomItem.name,
        size: size,
        x: Math.random() * 100, // 화면 가로 위치 (%)
        y: Math.random() * 100, // 화면 세로 위치 (%)
        duration: duration, // 크기별로 다른 애니메이션 속도
        delay: Math.random() * -20, // 시작 지연
        opacity: opacity,
        blur: blur,
      };
    });
    
    setItems(newItems);
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden">
      {items.map((item) => (
        <motion.div
          key={item.id}
          className="absolute select-none"
          style={{
            fontSize: `${item.size}px`,
            top: `${item.y}%`,
            left: `${item.x}%`,
            opacity: item.opacity,
            zIndex: 0,
            filter: `blur(${item.blur}px)`,
          }}
          animate={{
            x: [
              // 크기에 따라 움직임의 범위 조절
              Math.random() * (item.size * 0.8) - (item.size * 0.4),
              Math.random() * (item.size * 0.8) - (item.size * 0.4),
              Math.random() * (item.size * 0.8) - (item.size * 0.4),
              Math.random() * (item.size * 0.8) - (item.size * 0.4),
              Math.random() * (item.size * 0.8) - (item.size * 0.4),
            ],
            y: [
              Math.random() * (item.size * 0.8) - (item.size * 0.4),
              Math.random() * (item.size * 0.8) - (item.size * 0.4),
              Math.random() * (item.size * 0.8) - (item.size * 0.4),
              Math.random() * (item.size * 0.8) - (item.size * 0.4),
              Math.random() * (item.size * 0.8) - (item.size * 0.4),
            ],
            rotate: [0, Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 20 - 10, 0], // 회전 각도 줄임
          }}
          transition={{
            repeat: Infinity,
            repeatType: "reverse",
            duration: item.duration,
            delay: item.delay,
            ease: "easeInOut",
          }}
          aria-label={item.name}
        >
          {item.emoji}
        </motion.div>
      ))}
    </div>
  );
};

export default FloatingBabyItems;