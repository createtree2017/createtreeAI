/**
 * Service for Stability AI image generation
 */

import fetch from 'node-fetch';

const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
const STABILITY_API_HOST = 'https://api.stability.ai';

/**
 * Stability AI 사용을 위한 기본 설정 확인
 */
function checkStabilityApiConfiguration() {
  if (!STABILITY_API_KEY) {
    throw new Error("Missing Stability API key");
  }
  
  console.log("Stability AI API 설정 완료");
}

/**
 * Stability AI 엔진 목록 가져오기
 */
export async function getEngines() {
  try {
    checkStabilityApiConfiguration();
    
    const response = await fetch(`${STABILITY_API_HOST}/v1/engines/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${STABILITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Non-200 response from Stability API: ${await response.text()}`);
    }
    
    const engines = await response.json();
    return engines;
  } catch (error) {
    console.error("Error fetching Stability engines:", error);
    throw error;
  }
}

/**
 * Stability AI를 사용하여 이미지 생성
 */
export async function generateImageWithStability(
  prompt: string,
  options: {
    engineId?: string;
    width?: number;
    height?: number;
    samples?: number;
    cfgScale?: number;
    style?: string;
  } = {}
): Promise<string> {
  try {
    const {
      engineId = 'stable-diffusion-v1-6',
      width = 1024,
      height = 1024,
      samples = 1,
      cfgScale = 7,
      style = 'photographic'  // photographic, digital-art, enhance, anime, etc.
    } = options;
    
    console.log(`Generating image with Stability AI [Engine: ${engineId}]`);
    console.log(`Prompt: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`);
    
    const response = await fetch(
      `${STABILITY_API_HOST}/v1/generation/${engineId}/text-to-image`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
        },
        body: JSON.stringify({
          text_prompts: [
            {
              text: prompt,
              weight: 1.0,
            },
          ],
          cfg_scale: cfgScale,
          width,
          height,
          samples,
          style_preset: style,
        }),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Stability API error: ${errorText}`);
      throw new Error(`Stability API returned error: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json() as any;
    
    // 생성된 이미지 중 첫 번째 이미지의 base64 데이터 추출
    if (responseData && responseData.artifacts && responseData.artifacts.length > 0) {
      const base64Image = responseData.artifacts[0].base64;
      // 이미지 URL 생성
      const imageUrl = `data:image/png;base64,${base64Image}`;
      return imageUrl;
    }
    
    throw new Error('No image generated');
  } catch (error) {
    console.error("Error generating image with Stability AI:", error);
    throw error;
  }
}

/**
 * Stability AI를 사용하여 이미지 변환 (스타일 변경)
 */
export async function transformImageWithStability(
  imageBase64: string,
  prompt: string,
  style?: string
): Promise<string> {
  try {
    // 스타일에 따라 적절한 엔진 ID 선택
    let engineId = 'stable-diffusion-xl-1024-v1-0';
    let stylePreset = style || 'photographic';
    
    // 스타일에 따른 엔진 및 스타일 프리셋 맵핑
    switch (style) {
      case 'watercolor':
        stylePreset = 'watercolor';
        break;
      case 'sketch':
        stylePreset = 'line-art';
        break;
      case 'cartoon':
        stylePreset = 'comic-book';
        break;
      case 'oil':
        stylePreset = 'oil-painting';
        break;
      case 'fantasy':
        stylePreset = 'fantasy-art';
        break;
      case 'storybook':
        stylePreset = 'cinematic';
        break;
      case 'ghibli':
        stylePreset = 'anime';
        break;
      case 'disney':
        stylePreset = 'digital-art';
        break;
      case 'korean_webtoon':
        stylePreset = 'comic-book';
        break;
      case 'fairytale':
        stylePreset = 'fantasy-art';
        break;
      default:
        stylePreset = 'photographic';
    }
    
    console.log(`이미지 변환 중... [Style: ${stylePreset}]`);
    
    // 텍스트 프롬프트를 통한 이미지 생성 (이미지 입력은 현재 지원되지 않음)
    return await generateImageWithStability(prompt, {
      engineId,
      style: stylePreset
    });
  } catch (error) {
    console.error("Error transforming image with Stability AI:", error);
    throw error;
  }
}

// 서비스 초기화 시 설정 확인
try {
  checkStabilityApiConfiguration();
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  console.warn("Stability AI 서비스 초기화 실패:", errorMessage);
}