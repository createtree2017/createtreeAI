/**
 * ACE-Step 모델 테스트 (Replicate API)
 * 
 * 이 파일은 lucataco/ace-step 모델을 사용하여 음악 생성 기능을 테스트합니다.
 * 모델 URL: https://replicate.com/lucataco/ace-step
 * 
 * 다음 기능을 테스트합니다:
 * 1. 다양한 길이의 음악 생성 (60초, 120초, 180초, 240초)
 * 2. 한국어 가사 입력 및 보컬 품질 테스트
 * 3. 태그 기반 스타일 제어 테스트
 * 4. 가사 구조 태그 테스트 ([verse], [chorus] 등)
 */

import Replicate from 'replicate';
import * as fs from 'fs';
import { promisify } from 'util';
import * as path from 'path';

// Replicate API 클라이언트 초기화
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

interface AceStepInput {
  tags: string;
  lyrics: string;
  duration: number;
  scheduler?: string;
  guidance_type?: string;
  guidance_scale?: number;
  number_of_steps?: number;
  granularity_scale?: number;
  guidance_interval?: number;
  cfg_guidance_scale?: number;
  tag_guidance_scale?: number;
  lyric_guidance_scale?: number;
  guidance_interval_decay?: number;
}

/**
 * ACE-Step 모델을 사용하여 음악 생성
 * @param input 입력 매개변수
 * @returns 생성된 음악 URL
 */
async function generateMusicWithAceStep(input: AceStepInput): Promise<string | null> {
  try {
    console.log("=== ACE-Step 음악 생성 시작 ===");
    console.log("입력 매개변수:", JSON.stringify(input, null, 2));
    
    const startTime = Date.now();
    
    // 현재 최신 모델 버전 사용 (280fc4f9ed757f980a167f9539d0262d22df8fcfc92d45b32b322377bd68f9)
    const output = await replicate.run(
      "lucataco/ace-step:280fc4f9ed757f980a167f9539d0262d22df8fcfc92d45b32b322377bd68f9",
      { input }
    );
    
    const endTime = Date.now();
    const generationTime = (endTime - startTime) / 1000;
    
    console.log(`음악 생성 완료: ${generationTime.toFixed(2)}초 소요`);
    console.log("출력 URL:", output);
    
    // Replicate API는 객체 또는 문자열을 반환할 수 있음
    if (typeof output === 'string') {
      return output;
    } else if (output && typeof output === 'object') {
      // 객체인 경우 URL 또는 관련 필드 추출
      if ('url' in output) {
        return (output as any).url as string;
      }
      // 출력 형식에 따라 다르게 처리 (문자열로 변환)
      return String(output);
    }
    
    return null;
  } catch (error) {
    console.error("ACE-Step 음악 생성 중 오류 발생:", error);
    return null;
  }
}

/**
 * 한국어 가사를 영어로 번역 (실제 번역 API 연동이 필요)
 * @param koreanText 한국어 텍스트
 * @returns 번역된 영어 텍스트
 */
async function translateToEnglish(koreanText: string): Promise<string> {
  // 이 부분은 실제 번역 API를 사용하여 구현해야 합니다
  // 테스트 목적으로는 간단한 샘플 번역을 반환합니다
  return `[verse]\nLullaby for my baby\nSweet dreams and gentle night\n[chorus]\nSleep now, rest your eyes\nTomorrow brings a new sunrise`;
}

/**
 * 다양한 테스트 시나리오 실행
 */
async function runTests() {
  // API 키 확인
  if (!process.env.REPLICATE_API_TOKEN) {
    console.error("REPLICATE_API_TOKEN이 설정되지 않았습니다. .env 파일을 확인하세요.");
    return;
  }

  interface TestResult {
    name: string;
    url: string | null;
    description: string;
  }
  
  const results: TestResult[] = [];
  
  try {
    // 테스트 케이스 1: 기본 60초 음악 생성 (영어 가사)
    const basicTest = await generateMusicWithAceStep({
      tags: "lullaby, gentle, piano, strings, dreamy, soft vocals, children's music",
      lyrics: "[verse]\nLullaby for my baby\nSweet dreams and gentle night\n[chorus]\nSleep now, rest your eyes\nTomorrow brings a new sunrise",
      duration: 60, // 60초 길이
    });
    
    results.push({
      name: "기본 60초 영어 자장가",
      url: basicTest,
      description: "60초 길이의 기본 자장가, 영어 가사 사용"
    });

    // 테스트 케이스 2: 한국어 가사 입력 테스트 (120초)
    const koreanLyrics = `[verse]
자장가 불러줄게 우리 아가
달빛 아래 잠들어요
[chorus]
눈을 감고 꿈나라로
엄마 품에 포근하게`;

    // 한국어 가사 영어로 번역
    const translatedLyrics = await translateToEnglish(koreanLyrics);
    
    const koreanTest = await generateMusicWithAceStep({
      tags: "korean lullaby, traditional, gentle, piano, strings, female vocal, children's music",
      lyrics: translatedLyrics, // 번역된 가사 사용
      duration: 120, // 120초 길이
    });
    
    results.push({
      name: "한국어 자장가 (번역됨)",
      url: koreanTest,
      description: "120초 길이의 한국어 자장가, 번역된 가사 사용"
    });

    // 테스트 케이스 3: 다양한 스타일 태그 테스트 (180초)
    const styleTest = await generateMusicWithAceStep({
      tags: "K-pop, energetic, electronic, dance, female vocal, synthesizer, modern beat",
      lyrics: "[verse]\nDancing in the moonlight\nFeeling the rhythm tonight\n[chorus]\nLet's celebrate life\nUnder the stars so bright",
      duration: 180, // 180초 길이
    });
    
    results.push({
      name: "K-Pop 스타일 음악",
      url: styleTest,
      description: "180초 길이의 K-Pop 스타일 음악, 댄스 리듬과 현대적 사운드"
    });

    // 테스트 케이스 4: 최대 길이 테스트 (240초)
    const longTest = await generateMusicWithAceStep({
      tags: "ballad, emotional, piano, strings, dramatic, Korean, female vocal",
      lyrics: "[verse]\nMemories of yesterday\nEchoes of your smile\n[chorus]\nTime may pass us by\nBut my heart remembers\n[verse]\nSeason's changing fast\nYet love remains the same\n[chorus]\nTime may pass us by\nBut my heart remembers\n[bridge]\nThrough the years and tears\nOur story continues",
      duration: 240, // 240초 길이
      guidance_scale: 8, // 가이던스 스케일 조정
      lyric_guidance_scale: 12, // 가사 가이던스 스케일 조정
    });
    
    results.push({
      name: "장시간 발라드 음악",
      url: longTest,
      description: "240초 길이의 발라드 음악, 감정적인 피아노와 스트링 사운드"
    });

  } catch (error) {
    console.error("테스트 실행 중 오류 발생:", error);
  }

  // 테스트 결과 출력
  console.log("\n=== 테스트 결과 요약 ===");
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.name}`);
    console.log(`URL: ${result.url || '생성 실패'}`);
    console.log(`설명: ${result.description}`);
  });
}

// 테스트 실행
if (require.main === module) {
  runTests().catch(err => {
    console.error("테스트 실행 중 예외 발생:", err);
    process.exit(1);
  });
}

export { generateMusicWithAceStep };