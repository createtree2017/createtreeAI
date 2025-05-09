import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// 유아용품 아이템 정의
const babyItems = [
  { id: 1, emoji: '🧸', name: '곰인형', size: 3 },
  { id: 2, emoji: '🍼', name: '젖병', size: 2.5 },
  { id: 3, emoji: '🎯', name: '모빌', size: 3.2 },
  { id: 4, emoji: '🧩', name: '퍼즐', size: 2.8 },
  { id: 5, emoji: '📚', name: '책', size: 2.6 },
  { id: 6, emoji: '🧠', name: '두뇌발달놀이', size: 3 },
  { id: 7, emoji: '🦊', name: '여우인형', size: 2.8 },
  { id: 8, emoji: '🦁', name: '사자인형', size: 3.1 },
  { id: 9, emoji: '🚼', name: '아기옷', size: 2.4 },
  { id: 10, emoji: '🧶', name: '털실', size: 2 },
];

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

const FloatingBabyItems: React.FC = () => {
  const [items, setItems] = useState<FloatingItem[]>([]);

  useEffect(() => {
    // 화면 크기에 따라 아이템 생성
    const generateItems = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      const newItems: FloatingItem[] = [];
      
      // 일부 아이템만 랜덤하게 선택
      const selectedItems = [...babyItems].sort(() => 0.5 - Math.random()).slice(0, 5);
      
      selectedItems.forEach((item) => {
        newItems.push({
          ...item,
          x: Math.random() * windowWidth,
          y: Math.random() * windowHeight,
          duration: 20 + Math.random() * 40, // 20-60초 사이 랜덤 움직임
          delay: Math.random() * 5, // 0-5초 사이 랜덤 지연
          opacity: 0.2 + Math.random() * 0.4, // 0.2-0.6 사이 랜덤 투명도
        });
      });
      
      setItems(newItems);
    };
    
    generateItems();
    
    // 화면 크기 변경 시 아이템 재생성
    window.addEventListener('resize', generateItems);
    
    return () => {
      window.removeEventListener('resize', generateItems);
    };
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {items.map((item) => (
        <motion.div
          key={item.id}
          className="absolute blur-sm"
          style={{
            left: `${item.x}px`,
            top: `${item.y}px`,
            fontSize: `${item.size}rem`,
            opacity: item.opacity,
          }}
          animate={{
            x: [0, 100, 50, -50, -100, 0],
            y: [0, -100, 50, -50, 100, 0],
            rotate: [0, 10, -10, 15, -15, 0],
            scale: [1, 1.1, 0.9, 1.05, 0.95, 1],
          }}
          transition={{
            duration: item.duration,
            delay: item.delay,
            repeat: Infinity,
            repeatType: "loop",
            ease: "linear",
          }}
        >
          <span role="img" aria-label={item.name}>{item.emoji}</span>
        </motion.div>
      ))}
    </div>
  );
};

export default FloatingBabyItems;