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
      // 강제로 각 크기 카테고리에 최소한의 객체 배정
      // 작은 객체부터 큰 객체 순으로 최소 갯수 배정하여 모든 크기가 화면에 나타나도록 함
      if (index < sizeMaxCount.size5) {
        // 처음 1개는 무조건 매우 큰 객체로
        sizeCategory = 5;
        sizeCounters.size5++;
      } else if (index < sizeMaxCount.size5 + sizeMaxCount.size4) {
        // 그 다음은 큰 객체로
        sizeCategory = 4;
        sizeCounters.size4++;
      } else if (index < sizeMaxCount.size5 + sizeMaxCount.size4 + sizeMaxCount.size3) {
        // 그 다음은 중간 객체로
        sizeCategory = 3;
        sizeCounters.size3++;
      } else if (index < sizeMaxCount.size5 + sizeMaxCount.size4 + sizeMaxCount.size3 + sizeMaxCount.size2) {
        // 그 다음은 작은 객체로
        sizeCategory = 2;
        sizeCounters.size2++;
      } else {
        // 나머지는 매우 작은 객체로
        sizeCategory = 1;
        sizeCounters.size1++;
      }
      
      let size, opacity, blur, duration;
      
      // 크기, 투명도, 블러 효과, 애니메이션 속도를 크기 카테고리에 맞게 설정
      if (sizeCategory === 1) { // 가장 작은 아이템 (1단계)
        size = Math.random() * 8 + 12; // 12-20px
        opacity = Math.random() * 0.1 + 0.1; // 0.1-0.2
        blur = Math.random() * 0.5 + 1; // 1-1.5px (약한 흐림)
        duration = Math.random() * 10 + 25; // 25-35초 (더 빠르게 수정)
      } else if (sizeCategory === 2) { // 작은 아이템 (2단계)
        size = Math.random() * 10 + 20; // 20-30px
        opacity = Math.random() * 0.1 + 0.08; // 0.08-0.18
        blur = Math.random() * 0.7 + 1.5; // 1.5-2.2px (약간 흐림)
        duration = Math.random() * 10 + 20; // 20-30초 (더 빠르게 수정)
      } else if (sizeCategory === 3) { // 중간 아이템 (3단계)
        size = Math.random() * 15 + 30; // 30-45px
        opacity = Math.random() * 0.1 + 0.08; // 0.08-0.18 (더 선명하게)
        blur = Math.random() * 0.8 + 2; // 2-2.8px (중간 흐림)
        duration = Math.random() * 8 + 15; // 15-23초 (더 빠르게 수정)
      } else if (sizeCategory === 4) { // 큰 아이템 (4단계)
        size = Math.random() * 25 + 45; // 45-70px
        opacity = Math.random() * 0.08 + 0.06; // 0.06-0.14 (더 선명하게)
        blur = Math.random() * 1 + 2.5; // 2.5-3.5px (약간 줄임)
        duration = Math.random() * 7 + 12; // 12-19초 (더 빠르게 수정)
      } else { // 매우 큰 아이템 (5단계)
        size = Math.random() * 60 + 90; // 90-150px (매우 큰 사이즈)
        opacity = Math.random() * 0.07 + 0.04; // 0.04-0.11 (더 선명하게)
        blur = Math.random() * 1.5 + 3; // 3-4.5px (약간 줄임)
        duration = Math.random() * 5 + 8; // 8-13초 (더 빠르게 수정)
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
            // 각 객체마다 다른 랜덤 움직임 패턴을 적용
            // useMemo나 useCallback을 사용하지 않고 한 번만 계산되도록 내부에서 값 생성
            ...(() => {
              // 랜덤하게 x, y 움직임 생성
              const generateRandomMovement = (baseSize: number) => {
                // 랜덤 움직임 강도 (일부 객체는 더 크게 움직이고 일부는 작게 움직임)
                const movementIntensity = Math.random() * 0.5 + 0.5; // 0.5-1.0 사이의 랜덤 강도
                const range = baseSize * 0.8 * movementIntensity;
                
                return [
                  Math.random() * range * 2 - range,
                  Math.random() * range * 2 - range,
                  Math.random() * range * 2 - range,
                  Math.random() * range * 2 - range,
                  Math.random() * range * 2 - range,
                ];
              };
              
              // 랜덤하게 회전 움직임 생성
              const generateRandomRotation = () => {
                // 회전 각도도 랜덤하게 설정 (일부 객체는 많이 회전하고 일부는 덜 회전)
                const rotationIntensity = Math.random() * 20 + 5; // 5-25 사이의 회전 강도
                
                return [
                  0,
                  Math.random() * rotationIntensity * 2 - rotationIntensity,
                  Math.random() * rotationIntensity * 2 - rotationIntensity,
                  Math.random() * rotationIntensity * 2 - rotationIntensity,
                  0
                ];
              };
              
              return {
                x: generateRandomMovement(item.size),
                y: generateRandomMovement(item.size),
                rotate: generateRandomRotation(),
              };
            })(),
          }}
          transition={{
            repeat: Infinity,
            repeatType: "reverse",
            duration: item.duration,
            delay: item.delay,
            // 랜덤하게 ease 효과 결정 (easeInOut, easeIn, easeOut, linear 중에서)
            ease: (() => {
              const easeTypes = ["easeInOut", "easeIn", "easeOut", "linear", "circIn", "circOut"];
              return easeTypes[Math.floor(Math.random() * easeTypes.length)];
            })(),
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