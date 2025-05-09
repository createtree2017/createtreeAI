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
    const numItems = window.innerWidth < 768 ? 12 : 18;
    
    // 크기 카테고리별 확률 분포 - 작은(0):60%, 중간(1):30%, 큰(2):7%, 특대(3):3%
    const categoriesProbability = [0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,2,2,3];
    
    // 특대 크기 아이템은 최대 1-2개로 제한
    let extraLargeCount = 0;
    const maxExtraLarge = window.innerWidth < 768 ? 1 : 2;
    
    // 랜덤 아이템 생성
    const newItems: FloatingItem[] = Array.from({ length: numItems }).map((_, index) => {
      const randomItem = babyItems[Math.floor(Math.random() * babyItems.length)];
      
      // 크기 카테고리 결정 (가중치에 따라 선택)
      let sizeCategory = categoriesProbability[Math.floor(Math.random() * categoriesProbability.length)];
      
      // 특대 아이템 수 제한
      if (sizeCategory === 3) {
        if (extraLargeCount >= maxExtraLarge) {
          // 특대 개수가 이미 최대라면 작은 사이즈로 변경
          sizeCategory = 0;
        } else {
          extraLargeCount++;
        }
      }
      
      let size, opacity, blur, duration;
      
      // 크기, 투명도, 블러 효과, 애니메이션 속도를 크기 카테고리에 맞게 설정
      if (sizeCategory === 0) { // 작은 아이템 (멀리 있는 느낌)
        size = Math.random() * 15 + 15; // 15-30px
        opacity = Math.random() * 0.1 + 0.05; // 0.05-0.15
        blur = Math.random() * 0.5 + 1.5; // 1.5-2px (약한 흐림)
        duration = Math.random() * 30 + 50; // 50-80초 (느리게)
      } else if (sizeCategory === 1) { // 중간 아이템 (중간 거리 느낌)
        size = Math.random() * 15 + 30; // 30-45px
        opacity = Math.random() * 0.1 + 0.08; // 0.08-0.18
        blur = Math.random() * 0.7 + 2; // 2-2.7px (중간 흐림)
        duration = Math.random() * 20 + 40; // 40-60초 (중간 속도)
      } else if (sizeCategory === 2) { // 큰 아이템 (가까이 있는 느낌)
        size = Math.random() * 20 + 45; // 45-65px
        opacity = Math.random() * 0.08 + 0.04; // 0.04-0.12
        blur = Math.random() * 1 + 2.8; // 2.8-3.8px (더 흐리게)
        duration = Math.random() * 20 + 30; // 30-50초 (빠르게)
      } else { // 특대 아이템 (매우 가까이)
        size = Math.random() * 40 + 75; // 75-115px
        opacity = Math.random() * 0.05 + 0.03; // 0.03-0.08 (더 투명하게)
        blur = Math.random() * 1.5 + 3.5; // 3.5-5px (매우 흐릿하게)
        duration = Math.random() * 15 + 20; // 20-35초 (매우 빠르게)
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