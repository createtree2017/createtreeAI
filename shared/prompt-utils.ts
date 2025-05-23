/**
 * Dream Book 이미지 일관성 고도화 - 프롬프트 유틸리티
 * 작업지시서 3단계: 프롬프트 구성 헬퍼 함수들
 */

import { db } from "../db";
import { globalPromptRules } from "./schema";
import { eq } from "drizzle-orm";

/**
 * 활성화된 전역 프롬프트 규칙 조회
 * @returns 활성 규칙의 JSON 데이터 또는 기본값
 */
export async function getActivePromptRules(): Promise<any> {
  try {
    // 활성화된 전역 규칙 조회
    const activeRule = await db.query.globalPromptRules.findFirst({
      where: eq(globalPromptRules.isActive, true)
    });
    
    if (activeRule && activeRule.jsonRules) {
      console.log('[INFO] 활성 전역 규칙 사용:', activeRule.name);
      return activeRule.jsonRules;
    }
    
    // 환경변수 백업 옵션 확인 (작업지시서 11단계)
    const defaultRuleEnv = process.env.DEFAULT_PROMPT_RULE;
    if (defaultRuleEnv) {
      try {
        const parsedRule = JSON.parse(defaultRuleEnv);
        console.log('[INFO] 환경변수 백업 규칙 사용');
        return parsedRule;
      } catch (parseError) {
        console.warn('[WARN] 환경변수 DEFAULT_PROMPT_RULE 파싱 실패:', parseError);
      }
    }
    
    // 기본 하드코딩 규칙 (최후 방안)
    console.log('[WARN] 활성 규칙이 없음, 기본 규칙 사용');
    return {
      ratio: "1:1",
      subject: "pregnant Korean woman in her 20s",
      quality: "high quality, detailed, professional",
      style: "warm and gentle atmosphere",
      technical: "8k resolution, soft lighting, cinematic composition"
    };
    
  } catch (error) {
    console.error('[ERROR] 전역 규칙 조회 실패:', error);
    
    // 오류 시 기본 규칙 반환
    return {
      ratio: "1:1",
      subject: "pregnant Korean woman in her 20s",
      quality: "high quality, detailed, professional"
    };
  }
}

/**
 * 전체 프롬프트 조합 함수
 * @param stylePrompt 스타일 프롬프트
 * @param scenePrompt 장면 프롬프트  
 * @param characterPrompt 캐릭터 프롬프트
 * @param rules 전역 규칙 (선택적)
 * @returns 완성된 프롬프트
 */
export function composePrompt(
  stylePrompt: string,
  scenePrompt: string, 
  characterPrompt: string,
  rules?: any
): string {
  try {
    // 전역 규칙 프롬프트 생성
    let globalRulesPrompt = '';
    if (rules) {
      const ruleComponents = [];
      
      // 비율 규칙
      if (rules.ratio) {
        ruleComponents.push(`Image ratio: ${rules.ratio}`);
      }
      
      // 주제 규칙
      if (rules.subject) {
        ruleComponents.push(`Main subject: ${rules.subject}`);
      }
      
      // 품질 규칙
      if (rules.quality) {
        ruleComponents.push(`Quality requirements: ${rules.quality}`);
      }
      
      // 스타일 규칙
      if (rules.style) {
        ruleComponents.push(`Style guidelines: ${rules.style}`);
      }
      
      // 기술적 규칙
      if (rules.technical) {
        ruleComponents.push(`Technical specs: ${rules.technical}`);
      }
      
      // 추가 커스텀 규칙들
      Object.keys(rules).forEach(key => {
        if (!['ratio', 'subject', 'quality', 'style', 'technical'].includes(key)) {
          ruleComponents.push(`${key}: ${rules[key]}`);
        }
      });
      
      if (ruleComponents.length > 0) {
        globalRulesPrompt = `Global Rules:\n${ruleComponents.join('\n')}\n\n`;
      }
    }
    
    // 최종 프롬프트 조합 (작업지시서에 따라 전역 규칙을 가장 앞에)
    const finalPrompt = `${globalRulesPrompt}Style Instructions:
${stylePrompt}

Character Reference:
${characterPrompt}

Scene Description:
${scenePrompt}`;

    console.log('[INFO] 프롬프트 조합 완료', {
      globalRulesLength: globalRulesPrompt.length,
      styleLength: stylePrompt.length,
      characterLength: characterPrompt.length,
      sceneLength: scenePrompt.length,
      totalLength: finalPrompt.length
    });
    
    return finalPrompt;
    
  } catch (error) {
    console.error('[ERROR] 프롬프트 조합 실패:', error);
    
    // 오류 시 기본 조합 반환
    return `${stylePrompt}\n\n${characterPrompt}\n\n${scenePrompt}`;
  }
}

/**
 * 스타일별 특화 프롬프트 구성
 * @param basePrompt 기본 프롬프트
 * @param styleName 스타일 이름
 * @returns 스타일 특화 프롬프트
 */
export function enhancePromptForStyle(basePrompt: string, styleName: string): string {
  const styleEnhancements: Record<string, string> = {
    "디즈니풍": "Disney animation style with vibrant colors, expressive characters, and magical atmosphere.",
    "지브리풍": "Studio Ghibli style with soft colors, natural lighting, and gentle atmospheric perspective.",
    "픽사풍": "Pixar animation style with 3D rendering, warm lighting, and emotional storytelling.",
    "실사풍": "Photorealistic style with natural lighting, realistic textures, and authentic atmosphere."
  };
  
  const enhancement = styleEnhancements[styleName] || "";
  
  if (enhancement) {
    return `${enhancement}\n\n${basePrompt}`;
  }
  
  return basePrompt;
}

/**
 * 캐릭터 일관성을 위한 시드 생성 및 관리
 * @param jobId 작업 ID
 * @returns 생성된 시드 값
 */
export function generateConsistentSeed(jobId: string): number {
  // 작업지시서 7-4단계: seed 전략
  // scene0: 랜덤 seed 생성, Redis 캐시에 저장
  // scene1-4: 동일 seed 사용
  
  const seed = Math.floor(Math.random() * 1000000);
  
  console.log('[INFO] 일관성 시드 생성', { jobId, seed });
  
  // TODO: Redis 캐시 구현 시 여기에 저장 로직 추가
  // await redis.set(`dream:${jobId}:seed`, seed, 'EX', 3600);
  
  return seed;
}

/**
 * 저장된 시드 조회
 * @param jobId 작업 ID  
 * @returns 저장된 시드 값 또는 새 시드
 */
export async function getConsistentSeed(jobId: string): Promise<number> {
  try {
    // TODO: Redis 캐시 구현 시 여기에 조회 로직 추가
    // const cachedSeed = await redis.get(`dream:${jobId}:seed`);
    // if (cachedSeed) {
    //   return parseInt(cachedSeed);
    // }
    
    // 캐시된 시드가 없으면 새로 생성
    return generateConsistentSeed(jobId);
    
  } catch (error) {
    console.error('[ERROR] 시드 조회 실패:', error);
    return generateConsistentSeed(jobId);
  }
}

/**
 * 프롬프트 안전성 검증
 * @param prompt 검증할 프롬프트
 * @returns 안전한 프롬프트 여부
 */
export function validatePromptSafety(prompt: string): boolean {
  // 기본적인 안전성 검증 로직
  const unsafeKeywords = [
    'violence', 'harmful', 'explicit', 'inappropriate',
    '폭력', '유해', '부적절', '선정적'
  ];
  
  const lowerPrompt = prompt.toLowerCase();
  
  for (const keyword of unsafeKeywords) {
    if (lowerPrompt.includes(keyword.toLowerCase())) {
      console.warn('[WARN] 안전하지 않은 키워드 감지:', keyword);
      return false;
    }
  }
  
  return true;
}

/**
 * 프롬프트 길이 최적화
 * @param prompt 원본 프롬프트
 * @param maxLength 최대 길이
 * @returns 최적화된 프롬프트
 */
export function optimizePromptLength(prompt: string, maxLength: number = 2000): string {
  if (prompt.length <= maxLength) {
    return prompt;
  }
  
  console.log('[WARN] 프롬프트 길이 초과, 최적화 수행', {
    originalLength: prompt.length,
    maxLength
  });
  
  // 중요한 부분 우선 유지하면서 압축
  const lines = prompt.split('\n');
  let optimized = '';
  
  for (const line of lines) {
    if (optimized.length + line.length + 1 <= maxLength) {
      optimized += line + '\n';
    } else {
      break;
    }
  }
  
  return optimized.trim();
}