/**
 * Dream Book 이미지 일관성 고도화 - Seed 스크립트
 * 작업지시서 2단계: 기본 스타일과 전역 규칙 삽입
 */

import { db } from "./index";
import { styleTemplates, globalPromptRules } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * 기본 스타일 템플릿 시드 데이터
 */
async function seedStyleTemplates() {
  console.log("🎨 기본 스타일 템플릿 시드 데이터 삽입 시작...");
  
  // 기존 기본 스타일이 있는지 확인
  const existingDefault = await db.query.styleTemplates.findFirst({
    where: eq(styleTemplates.isDefault, true)
  });
  
  if (existingDefault) {
    console.log("✅ 기본 스타일이 이미 존재합니다:", existingDefault.name);
    return;
  }
  
  // 디즈니 스타일 템플릿 삽입
  const disneyStyle = {
    name: "디즈니풍",
    prompt: `디즈니 애니메이션 스타일로 이미지를 생성해주세요.
피사체가 이야기의 중심 인물처럼 보이도록 생생하고 매력적으로 표현해주세요.
디즈니 특유의 크고 생동감 있는 눈, 부드러운 색감, 따뜻한 분위기를 연출해주세요.
배경은 동화적이고 환상적인 느낌으로 표현해주세요.`,
    thumbnailUrl: "/static/style-thumbnails/disney.png",
    isDefault: true
  };
  
  const [insertedDisney] = await db.insert(styleTemplates)
    .values(disneyStyle)
    .returning();
  
  console.log("✅ 디즈니 스타일 템플릿 삽입 완료:", insertedDisney.id);
  
  // 지브리 스타일 템플릿 삽입
  const ghibliStyle = {
    name: "지브리풍", 
    prompt: `스튜디오 지브리 애니메이션 스타일로 이미지를 생성해주세요.
자연스럽고 부드러운 색감, 세밀한 배경 묘사, 따뜻하고 향수를 불러일으키는 분위기를 연출해주세요.
지브리 특유의 부드러운 라인과 깊이 있는 감정 표현을 포함해주세요.
배경은 자연과 조화를 이루는 아름다운 풍경으로 표현해주세요.`,
    thumbnailUrl: "/static/style-thumbnails/ghibli.png",
    isDefault: false
  };
  
  const [insertedGhibli] = await db.insert(styleTemplates)
    .values(ghibliStyle)
    .returning();
    
  console.log("✅ 지브리 스타일 템플릿 삽입 완료:", insertedGhibli.id);
}

/**
 * 기본 전역 프롬프트 규칙 시드 데이터
 */
async function seedGlobalPromptRules() {
  console.log("🔧 기본 전역 프롬프트 규칙 시드 데이터 삽입 시작...");
  
  // 기존 활성 규칙이 있는지 확인
  const existingActive = await db.query.globalPromptRules.findFirst({
    where: eq(globalPromptRules.isActive, true)
  });
  
  if (existingActive) {
    console.log("✅ 활성 전역 규칙이 이미 존재합니다:", existingActive.name);
    return;
  }
  
  // 기본 전역 규칙 삽입 (작업지시서 예시 규칙)
  const defaultRule = {
    name: "기본 이미지 규칙",
    jsonRules: {
      ratio: "1:1",
      subject: "pregnant Korean woman in her 20s",
      quality: "high quality, detailed, professional",
      style: "warm and gentle atmosphere",
      technical: "8k resolution, soft lighting, cinematic composition"
    },
    isActive: true
  };
  
  const [insertedRule] = await db.insert(globalPromptRules)
    .values(defaultRule)
    .returning();
    
  console.log("✅ 기본 전역 프롬프트 규칙 삽입 완료:", insertedRule.id);
  
  // 추가 규칙 템플릿들 (비활성 상태로)
  const additionalRules = [
    {
      name: "아기 중심 규칙",
      jsonRules: {
        ratio: "1:1", 
        subject: "cute Korean baby character",
        quality: "adorable, heartwarming, child-friendly",
        style: "soft pastel colors, gentle expression",
        technical: "cartoon style, smooth rendering"
      },
      isActive: false
    },
    {
      name: "가족 사진 규칙",
      jsonRules: {
        ratio: "4:3",
        subject: "Korean family with pregnant mother", 
        quality: "professional family portrait style",
        style: "happiness, love, anticipation",
        technical: "natural lighting, warm tones"
      },
      isActive: false
    }
  ];
  
  for (const rule of additionalRules) {
    const [inserted] = await db.insert(globalPromptRules)
      .values(rule)
      .returning();
    console.log(`✅ 추가 규칙 템플릿 삽입 완료: ${rule.name} (ID: ${inserted.id})`);
  }
}

/**
 * 메인 시드 함수
 */
export async function seedDreamConsistency() {
  try {
    console.log("🚀 Dream Book 이미지 일관성 시드 데이터 삽입 시작...");
    
    await seedStyleTemplates();
    await seedGlobalPromptRules();
    
    console.log("🎉 Dream Book 이미지 일관성 시드 데이터 삽입 완료!");
    
  } catch (error) {
    console.error("❌ 시드 데이터 삽입 중 오류 발생:", error);
    throw error;
  }
}

// 직접 실행 시 시드 실행
if (require.main === module) {
  seedDreamConsistency()
    .then(() => {
      console.log("✅ 시드 스크립트 실행 완료");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ 시드 스크립트 실행 실패:", error);
      process.exit(1);
    });
}