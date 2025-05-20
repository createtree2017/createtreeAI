import OpenAI from "openai";
import { logDebug, logError } from '../utils/logger';

// OpenAI 인스턴스 생성
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * OpenAI API 키가 유효한지 확인
 */
function isValidApiKey(apiKey?: string): boolean {
  return !!apiKey && apiKey.startsWith('sk-') && apiKey.length > 20;
}

/**
 * 태몽 내용을 바탕으로 동화 줄거리 생성
 */
export async function generateDreamStorySummary(
  dreamer: string,
  babyName: string,
  dreamContent: string
): Promise<string> {
  try {
    // API 키 확인
    if (!isValidApiKey(process.env.OPENAI_API_KEY)) {
      throw new Error('유효한 OpenAI API 키가 필요합니다.');
    }

    logDebug('태몽 줄거리 생성 시작', { dreamer, babyName });

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `당신은 태몽을 기반으로 아기를 위한 짧은 동화 줄거리를 만드는 전문가입니다. 
          태몽은 한국 문화에서 임신 중에 꾸는 특별한 꿈으로, 아기의 미래나 특성을 예견한다고 믿어집니다.
          아래 내용을 바탕으로 긍정적이고 희망적인 동화 줄거리를 3-4문단으로 작성해주세요.
          문체는 따뜻하고 아이에게 읽어주기 좋은 스타일로 작성하세요.
          '옛날 옛적에'로 시작하는 전통적인 동화 형식을 사용하세요.
          꿈 내용에 부정적인 요소가 있더라도 이를 긍정적으로 재해석하여 아름다운 이야기로 만들어주세요.`
        },
        {
          role: "user",
          content: `꿈을 꾼 사람: ${dreamer}
          아기 이름: ${babyName}
          꿈 내용: ${dreamContent}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const summary = response.choices[0].message.content?.trim() || '태몽 내용을 바탕으로 한 아름다운 이야기';
    
    logDebug('태몽 줄거리 생성 완료', { length: summary.length });
    return summary;

  } catch (error) {
    logError('태몽 줄거리 생성 오류:', error);
    throw new Error('태몽 줄거리를 생성하는 중 오류가 발생했습니다.');
  }
}

/**
 * 태몽 내용을 바탕으로 4개의 장면 생성
 */
export async function generateDreamScenes(
  dreamContent: string,
  style: string
): Promise<string[]> {
  try {
    // API 키 확인
    if (!isValidApiKey(process.env.OPENAI_API_KEY)) {
      throw new Error('유효한 OpenAI API 키가 필요합니다.');
    }

    logDebug('태몽 장면 생성 시작', { style });

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `당신은 태몽을 기반으로 DALL-E로 생성할 4개의 이미지 프롬프트를 작성하는 전문가입니다.
          태몽은 한국 문화에서 임신 중에 꾸는 특별한 꿈으로, 아기의 미래나 특성을 예견한다고 믿어집니다.
          아래 내용을 바탕으로 동화책의 각 장면에 해당하는 4개의 이미지 프롬프트를 작성해주세요.
          각 프롬프트는 DALL-E가 시각적으로 아름답고 디테일한 이미지를 생성할 수 있도록 충분히 상세해야 합니다.
          
          프롬프트 앞에는 반드시 스타일 설명을 포함해야 합니다: "${style}, high quality, detailed, soft lighting"
          
          각 장면은 스토리의 논리적 흐름을 따라야 합니다:
          장면 1: 이야기의 시작과 주인공 소개
          장면 2: 이야기의 전개와 도전/어려움의 등장
          장면 3: 문제 해결을 위한 노력이나 결정적 순간
          장면 4: 행복한 결말
          
          결과는 JSON 형식이 아닌 각 프롬프트를 별도 줄에 작성해 주세요.
          각 프롬프트는 한국어와 영어를 혼합하여 작성하되, 영어 비중을 더 높게 해주세요.
          각 프롬프트는 최대 400자를 넘지 않도록 해주세요.`
        },
        {
          role: "user",
          content: `태몽 내용: ${dreamContent}
          원하는 스타일: ${style}`
        }
      ],
      max_tokens: 1500,
      temperature: 0.7,
    });

    const content = response.choices[0].message.content?.trim() || '';
    const prompts = content
      .split('\n')
      .filter(line => line.trim().length > 0)
      .slice(0, 4);
      
    // 프롬프트가 4개 미만인 경우 기본 프롬프트로 채우기
    while (prompts.length < 4) {
      prompts.push(`${style}, fairy tale scene, dreamy atmosphere, soft colors, high quality, detailed, soft lighting`);
    }
    
    logDebug('태몽 장면 생성 완료', { count: prompts.length });
    return prompts;

  } catch (error) {
    logError('태몽 장면 생성 오류:', error);
    throw new Error('태몽 장면을 생성하는 중 오류가 발생했습니다.');
  }
}

/**
 * 프롬프트를 기반으로 이미지 생성
 */
export async function generateDreamImage(prompt: string): Promise<string> {
  try {
    // API 키 확인
    if (!isValidApiKey(process.env.OPENAI_API_KEY)) {
      throw new Error('유효한 OpenAI API 키가 필요합니다.');
    }

    logDebug('태몽 이미지 생성 시작', { promptLength: prompt.length });

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "vivid",
    });

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) {
      throw new Error('이미지 URL을 받지 못했습니다.');
    }
    
    logDebug('태몽 이미지 생성 완료', { imageUrl });
    return imageUrl;

  } catch (error) {
    logError('태몽 이미지 생성 오류:', error);
    throw new Error('태몽 이미지를 생성하는 중 오류가 발생했습니다.');
  }
}