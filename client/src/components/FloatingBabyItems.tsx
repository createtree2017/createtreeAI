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
    // 화면 크기에 따라 아이템 개수 결정
    const numItems = window.innerWidth < 768 ? 10 : 15;
    
    // 랜덤 아이템 생성
    const newItems: FloatingItem[] = Array.from({ length: numItems }).map((_, index) => {
      const randomItem = babyItems[Math.floor(Math.random() * babyItems.length)];
      return {
        id: index,
        emoji: randomItem.emoji,
        name: randomItem.name,
        size: Math.random() * 30 + 20, // 20-50px 크기
        x: Math.random() * 100, // 화면 가로 위치 (%)
        y: Math.random() * 100, // 화면 세로 위치 (%)
        duration: Math.random() * 50 + 30, // 30-80초 움직임 주기
        delay: Math.random() * -20, // 시작 지연
        opacity: Math.random() * 0.4 + 0.1, // 0.1-0.5 투명도 (흐릿한 효과)
      };
    });
    
    setItems(newItems);
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden">
      {items.map((item) => (
        <motion.div
          key={item.id}
          className="absolute select-none blur-[1px]"
          style={{
            fontSize: `${item.size}px`,
            top: `${item.y}%`,
            left: `${item.x}%`,
            opacity: item.opacity,
            zIndex: 0,
          }}
          animate={{
            x: [
              Math.random() * 100 - 50, // -50px ~ 50px
              Math.random() * 100 - 50,
              Math.random() * 100 - 50,
              Math.random() * 100 - 50,
              Math.random() * 100 - 50,
            ],
            y: [
              Math.random() * 100 - 50,
              Math.random() * 100 - 50,
              Math.random() * 100 - 50,
              Math.random() * 100 - 50,
              Math.random() * 100 - 50,
            ],
            rotate: [0, Math.random() * 40 - 20, Math.random() * 40 - 20, Math.random() * 40 - 20, 0],
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