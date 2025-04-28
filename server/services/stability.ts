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
      engineId = 'stable-diffusion-xl-1024-v1-0',  // SDXL 사용
      width = 1024,
      height = 1024,
      samples = 1,
      cfgScale = 7,
      style = 'photographic'  // photographic, digital-art, enhance, anime, etc.
    } = options;
    
    console.log(`Generating image with Stability AI [Engine: ${engineId}]`);
    console.log(`Prompt: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`);
    
    // API 키가 없으면 오류 메시지 반환
    if (!STABILITY_API_KEY) {
      console.error("Missing Stability API key");
      return "https://placehold.co/1024x1024/A7C1E2/FFF?text=현재+이미지생성+서비스가+금일+종료+되었습니다";
    }
    
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
      return "https://placehold.co/1024x1024/A7C1E2/FFF?text=현재+이미지생성+서비스가+금일+종료+되었습니다";
    }
    
    const responseData = await response.json() as any;
    
    // 생성된 이미지 중 첫 번째 이미지의 base64 데이터 추출
    if (responseData && responseData.artifacts && responseData.artifacts.length > 0) {
      const base64Image = responseData.artifacts[0].base64;
      // 이미지 URL 생성
      const imageUrl = `data:image/png;base64,${base64Image}`;
      return imageUrl;
    }
    
    // 이미지가 없으면 오류 메시지 반환
    return "https://placehold.co/1024x1024/A7C1E2/FFF?text=현재+이미지생성+서비스가+금일+종료+되었습니다";
  } catch (error) {
    console.error("Error generating image with Stability AI:", error);
    return "https://placehold.co/1024x1024/A7C1E2/FFF?text=현재+이미지생성+서비스가+금일+종료+되었습니다";
  }
}

/**
 * Stability AI를 사용하여 이미지 변환 (스타일 변경)
 */
export async function transformImageWithStability(
  imageBuffer: Buffer,
  style: string,
  prompt: string
): Promise<string> {
  try {
    checkStabilityApiConfiguration();
    
    // 스타일에 따라 적절한 엔진 ID 선택
    let engineId = 'stable-diffusion-xl-1024-v1-0';
    let stylePreset = 'photographic';
    
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
      case 'oil-painting':
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
      case 'korean-webtoon':
        stylePreset = 'comic-book';
        break;
      case 'fairytale':
        stylePreset = 'fantasy-art';
        break;
      case 'baby-dog-sd-style':
        stylePreset = 'comic-book';
        break;
      default:
        stylePreset = 'photographic';
    }
    
    console.log(`이미지 변환 중... [Style: ${stylePreset}]`);
    
    // 한국어 프롬프트를 영어로 변환
    let englishPrompt = prompt;
    
    // 한국어가 포함된 경우, 영어로 대체 프롬프트 작성
    if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(prompt)) {
      console.log("한국어 프롬프트 감지, 영어로 변환합니다.");
      
      // 스타일별 영어 프롬프트 생성
      if (style === 'baby-dog-sd-style') {
        englishPrompt = "Create a cute Super Deformed (SD) style illustration of this pet dog. Make it a chibi character with a big head and small body. Use a warm and lovely atmosphere. Transform the image into an SD style without creating a completely new image.";
      } else if (style === 'watercolor') {
        englishPrompt = "Transform this image into a beautiful watercolor painting with soft edges and gentle color blending. Maintain the original composition and subject.";
      } else if (style === 'sketch') {
        englishPrompt = "Create a detailed sketch version of this image with fine line art. Focus on contours and essential details.";
      } else if (style === 'cartoon') {
        englishPrompt = "Convert this image into a cartoon style with bold lines, simplified features, and vibrant colors.";
      } else if (style === 'oil-painting') {
        englishPrompt = "Transform this image into a classical oil painting with rich textures, detailed brushwork, and depth.";
      } else if (style === 'fantasy') {
        englishPrompt = "Convert this into a fantasy art style with magical elements, ethereal lighting, and surreal qualities.";
      } else if (style === 'ghibli') {
        englishPrompt = "Transform this image in the style of Studio Ghibli animation with soft colors, detailed backgrounds, and whimsical character design.";
      } else if (style === 'disney') {
        englishPrompt = "Convert this image into a Disney animation style with expressive features, smooth lines, and vibrant colors.";
      } else {
        englishPrompt = "Transform this image into a professional artistic style. Preserve the main subject and composition while enhancing its artistic quality.";
      }
    }
    
    console.log(`영어 프롬프트: "${englishPrompt.substring(0, 200)}${englishPrompt.length > 200 ? '...' : ''}"`);
    
    // 텍스트 프롬프트를 통한 이미지 생성 (이미지 입력은 현재 지원되지 않음)
    // Stability API에서는 이미지 입력 기반 변환보다는 텍스트 프롬프트 기반 생성이 주요 기능
    try {
      return await generateImageWithStability(englishPrompt, {
        engineId,
        style: stylePreset
      });
    } catch (error) {
      console.error("Error in Stability AI image generation:", error);
      return "https://placehold.co/1024x1024/A7C1E2/FFF?text=현재+이미지생성+서비스가+금일+종료+되었습니다";
    }
  } catch (error) {
    console.error("Error transforming image with Stability AI:", error);
    return "https://placehold.co/1024x1024/A7C1E2/FFF?text=현재+이미지생성+서비스가+금일+종료+되었습니다";
  }
}

// 서비스 초기화 시 설정 확인
try {
  checkStabilityApiConfiguration();
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  console.warn("Stability AI 서비스 초기화 실패:", errorMessage);
}