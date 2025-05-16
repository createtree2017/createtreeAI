/**
 * 가사 생성 서비스
 * OpenAI GPT를 활용하여 음악 가사를 자동 생성합니다.
 */
// @azure/openai 패키지 대신 공식 OpenAI 패키지만 사용
import { OpenAI } from 'openai';

// OpenAI 클라이언트 설정
let openaiClient: OpenAI | null = null;

// OpenAI 클라이언트 초기화 - 직접 설정 방식으로 해결
try {
  // API 키 확인
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY 환경 변수가 설정되지 않았습니다. 가사 생성 기능이 제한됩니다.');
    openaiClient = null;
  } else {
    console.log('OpenAI 클라이언트 새 방식으로 초기화 중...');
    
    // 📌 환경 변수 무시하고 직접 OpenAI 설정
    // 조직 ID 또는 프로젝트 ID 사용안함 - 단순히 API 키만 사용
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      // 모든 추가 설정은 제외 - 최소한의 설정만 사용
    });
    
    console.log('OpenAI 클라이언트 초기화 완료 (심플 모드)');
  }
} catch (error) {
  console.error('OpenAI 클라이언트 초기화 오류:', error);
  openaiClient = null;
}

// 가사 생성 옵션 인터페이스
export interface LyricsGenerationOptions {
  prompt: string;
  style?: string;
  length?: number;
  includeChorus?: boolean;
}

/**
 * 프롬프트 기반 가사 생성
 * @param options 가사 생성 옵션
 * @returns 생성된 가사 텍스트
 */
export async function generateLyrics(options: LyricsGenerationOptions): Promise<string> {
  // API 키가 없는 경우에만 샘플 가사 반환
  if (!openaiClient) {
    console.warn('OpenAI 클라이언트가 초기화되지 않았습니다. 샘플 가사를 반환합니다.');
    return getSampleLyricsBasedOnPrompt(options);
  }

  try {
    const { prompt, style = '', length = 200, includeChorus = true } = options;
    
    console.log(`프롬프트 "${prompt}"로 실제 가사 생성 시도 중...`);
    
    // GPT 프롬프트 작성 - 최적화된 프롬프트
    const systemPrompt = `
      당신은 전문 작사가입니다. 다음 지시사항에 따라 한국어 가사를 작성해주세요:
      
      1. 주제와 분위기: "${prompt}"
      2. 스타일: "${style || '자유롭게'}"
      3. 길이: 약 ${length}자 내외
      4. ${includeChorus ? '후렴구(chorus)를 포함해주세요.' : '후렴구 없이 작성해주세요.'}
      5. 가사는 [verse], [chorus], [bridge] 등의 구조 태그를 포함해야 합니다.
      6. 음악적 운율과 흐름을 고려하여 자연스러운 가사를 작성해주세요.
      7. 태교나 자장가에 적합한 따뜻하고 포근한 느낌의 가사를 작성해주세요.
      
      주의: 가사만 반환해주세요. 다른 설명은 필요하지 않습니다.
    `;

    // OpenAI API 호출
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    // 생성된 가사 반환
    const generatedLyrics = response.choices[0].message.content || '';
    const trimmedLyrics = generatedLyrics.trim();
    
    console.log(`가사 생성 성공! 길이: ${trimmedLyrics.length}자`);
    return trimmedLyrics;
  } catch (error) {
    // 오류 로깅 강화
    console.error('가사 생성 중 OpenAI API 오류 발생:', error);
    
    // 오류가 있어도 사용자 경험 유지를 위해 샘플 가사 반환
    return getSampleLyricsBasedOnPrompt(options);
  }
}

/**
 * 프롬프트에 따라 적절한 샘플 가사 선택
 * 프롬프트 키워드를 분석하여 가장 적합한 샘플 가사 선택
 */
function getSampleLyricsBasedOnPrompt(options: LyricsGenerationOptions): string {
  const prompt = options.prompt.toLowerCase();
  
  // 자장가 관련 키워드
  if (prompt.includes('자장가') || prompt.includes('잠') || prompt.includes('아기') || 
      prompt.includes('달래') || prompt.includes('재우') || prompt.includes('수면') ||
      options.style?.includes('자장가')) {
    return `[verse]
자장자장 우리 아가
${prompt}의 이야기
별이 내린 작은 꿈을
꿈속에서 만나봐요

[chorus]
사랑하는 내 아기야
편안하게 잠들어요
엄마 품에 안겨서
행복한 꿈 꾸세요

[verse]
자장자장 우리 아가
구름 위를 걸어봐요
천사들이 부르는 노래
자장노래 들으며`;
  }
  
  // 태교 관련 키워드
  if (prompt.includes('태교') || prompt.includes('뱃속') || prompt.includes('태명') || 
      prompt.includes('임신') || prompt.includes('태아') || prompt.includes('예비맘') ||
      options.style?.includes('태교')) {
    return `[verse]
엄마 뱃속 작은 세상
${prompt}의 이야기
두근두근 심장소리
우리 함께 느껴봐요

[chorus]
사랑으로 자라나는
우리 아가 튼튼하게
엄마 아빠 목소리로
따스하게 안아줄게

[verse]
세상 모든 아름다움
너에게 들려주고파
엄마의 행복한 노래
너의 꿈이 되길 바라`;
  }
  
  // 사랑 관련 키워드
  if (prompt.includes('사랑') || prompt.includes('마음') || prompt.includes('감사') || 
      prompt.includes('고마움') || prompt.includes('행복') || prompt.includes('감동')) {
    return `[verse]
${prompt}의 마음을 담아
별빛처럼 반짝이는
우리 서로의 마음이
더 따뜻해지는 밤

[chorus]
사랑한단 말보다 더
소중한 이 마음을
노래에 담아 전해요
우리 함께 영원히

[verse]
꿈결같은 이 시간이
흘러가도 변치 않을
너와 나의 이야기가
계속되길 바랄게요`;
  }
  
  // 일반적인 경우 (프롬프트 첫 단어 포함)
  const promptWords = prompt.split(' ');
  const firstKeyword = promptWords[0] || '작은 별';
  
  return `[verse]
${firstKeyword}이 반짝이는
${prompt}의 이야기
너의 작은 손을 잡고
함께 걷는 이 순간

[chorus]
사랑한단 말보다 더
소중한 이 마음을
노래에 담아 전해요
우리 함께 영원히

[verse]
꿈결같은 이 시간이
흘러가도 변치 않을
너와 나의 이야기가
계속되길 바랄게요`;
}

/**
 * 가사를 음악 생성에 적합한 형식으로 포맷팅
 * @param lyrics 원본 가사
 * @returns 포맷팅된 가사
 */
export function formatLyrics(lyrics: string): string {
  // 이미 구조 태그가 있으면 그대로 반환
  if (lyrics.includes('[verse]') || lyrics.includes('[chorus]') || lyrics.includes('[bridge]')) {
    return lyrics;
  }

  // 기본 구조 태그 추가 (간단한 형식)
  const lines = lyrics.split('\n');
  const formattedLines: string[] = [];
  
  let inVerse = true;
  let lineCount = 0;
  
  for (const line of lines) {
    if (line.trim() === '') {
      formattedLines.push('');
      continue;
    }
    
    if (lineCount === 0) {
      formattedLines.push('[verse]');
      inVerse = true;
    } else if (lineCount === 8 && inVerse) {
      formattedLines.push('[chorus]');
      inVerse = false;
    } else if (lineCount === 16) {
      formattedLines.push('[verse]');
      inVerse = true;
    }
    
    formattedLines.push(line);
    lineCount++;
  }
  
  return formattedLines.join('\n');
}

/**
 * 샘플 가사 반환 (API 실패 시 폴백용)
 * @param options 가사 생성 옵션
 * @returns 샘플 가사
 */
function getSampleLyrics(options: LyricsGenerationOptions): string {
  // 옵션에 따라 다양한 샘플 가사 제공
  if (options.prompt.includes('자장가') || options.style?.includes('자장가')) {
    return `[verse]
자장자장 우리 아가
달빛 아래 잠들어요
별이 내린 작은 꿈을
꿈속에서 만나봐요

[chorus]
사랑하는 내 아기야
편안하게 잠들어요
엄마 품에 안겨서
행복한 꿈 꾸세요

[verse]
자장자장 우리 아가
구름 위를 걸어봐요
천사들이 부르는 노래
자장노래 들으며`;
  }
  
  if (options.prompt.includes('태교') || options.style?.includes('태교')) {
    return `[verse]
엄마 뱃속 작은 세상
너를 향한 첫 이야기
두근두근 심장소리
우리 함께 느껴봐요

[chorus]
사랑으로 자라나는
우리 아가 튼튼하게
엄마 아빠 목소리로
따스하게 안아줄게

[verse]
세상 모든 아름다움
너에게 들려주고파
엄마의 행복한 노래
너의 꿈이 되길 바라`;
  }
  
  // 기본 샘플 가사
  return `[verse]
작은 별이 반짝이는
밤하늘을 바라보며
너의 작은 손을 잡고
함께 걷는 이 순간

[chorus]
사랑한단 말보다 더
소중한 이 마음을
노래에 담아 전해요
우리 함께 영원히

[verse]
꿈결같은 이 시간이
흘러가도 변치 않을
너와 나의 이야기가
계속되길 바랄게요`;
}

// 모듈 초기화 시 로그
console.log(`가사 생성 서비스가 ${openaiClient ? '정상적으로' : '제한된 모드로'} 초기화되었습니다.`);