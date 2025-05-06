/**
 * OpenAI GPT-4o Vision 및 gpt-image-1 모델을 활용한 이미지 합성 서비스
 * 두 이미지를 자연스럽게 합성하는 기능
 */
import fetch from 'node-fetch';
import fs from 'fs';
import FormData from 'form-data';
import path from 'path';
import { Buffer } from 'buffer';

// OpenAI API 키 - 환경 변수에서 가져옴
const API_KEY = process.env.OPENAI_API_KEY;

// 서비스 불가능 상태 메시지
const SERVICE_UNAVAILABLE = "https://placehold.co/1024x1024/A7C1E2/FFF?text=현재+이미지합성+서비스가+금일+종료+되었습니다";

// API 키 유효성 검증 - 프로젝트 API 키 지원 추가 (sk-proj- 시작)
function isValidApiKey(apiKey: string | undefined): boolean {
  return !!apiKey && (apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-'));
}

// OpenAI API 엔드포인트
const OPENAI_IMAGE_EDITING_URL = "https://api.openai.com/v1/images/edits"; // 이미지 편집용 (gpt-image-1)
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

// API 응답 타입 정의
interface OpenAIImageGenerationResponse {
  created?: number;
  data?: Array<{
    url?: string;
    revised_prompt?: string;
    b64_json?: string;  // GPT-Image-1 API는 base64 인코딩된 이미지 데이터도 제공
  }>;
  error?: {
    message: string;
    type: string;
    code?: string;
  };
}

// GPT 응답 타입
interface OpenAIChatResponse {
  id?: string;
  choices?: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
  error?: {
    message: string;
    type: string;
    code?: string;
  };
}

/**
 * 두 이미지를 compositing하는 함수
 * 사용자 이미지와 템플릿 이미지를 합성
 */
async function compositeImagesWithAI(
  userImageBuffer: Buffer, 
  templateImageBuffer: Buffer, 
  templateType: string, 
  prompt: string,
  maskArea: any = null
): Promise<string> {
  if (!isValidApiKey(API_KEY)) {
    console.log("유효한 API 키가 없습니다");
    return SERVICE_UNAVAILABLE;
  }

  try {
    console.log(`이미지 합성 시작 - 템플릿 타입: ${templateType}`);
    
    // 두 이미지를 base64로 인코딩
    const userImageBase64 = userImageBuffer.toString('base64');
    const templateImageBase64 = templateImageBuffer.toString('base64');
    
    // 합성 방법에 따른 프롬프트 구성
    let finalPrompt = "";
    
    if (templateType === "background" || templateType === "배경") {
      finalPrompt = `${prompt || "이 사진의 배경을 합성해 주세요"}. 
템플릿 이미지는 배경으로 사용됩니다. 원본 사진의 인물을 정확히 유지하면서 이 배경에 자연스럽게 배치해주세요.
중요: 인물의 얼굴, 포즈, 옷차림, 크기 비율을 절대 변경하지 마세요. 인물의 나이를 변경하지 마세요.`;
    } 
    else if (templateType === "frame" || templateType === "프레임") {
      finalPrompt = `${prompt || "이 사진을 프레임에 맞게 합성해 주세요"}. 
템플릿 이미지는 프레임으로 사용됩니다. 원본 사진이 프레임 안에 자연스럽게 들어가도록 합성해주세요.
중요: 프레임 안의 인물은 원본 그대로 유지하고, 프레임만 추가해주세요.`;
    } 
    else if (templateType === "overlay" || templateType === "오버레이") {
      finalPrompt = `${prompt || "이 사진에 템플릿 이미지를 오버레이해 주세요"}. 
템플릿 이미지의 요소들(이모티콘, 스티커 등)을 원본 사진 위에 자연스럽게 배치해주세요.
중요: 원본 사진은 그대로 유지하고 템플릿의 요소들만 추가해주세요.`;
    } 
    else if (templateType === "blend" || templateType === "혼합") {
      finalPrompt = `${prompt || "두 이미지를 자연스럽게 혼합해 주세요"}. 
사용자 이미지와 템플릿 이미지의 특성을 혼합하여 하나의 조화로운 이미지를 만들어주세요.
중요: 사용자 이미지의 주요 인물/대상은 반드시 인식 가능하도록 유지해주세요.`;
    }
    else if (templateType === "face" || templateType === "얼굴") {
      // 얼굴 합성 특화 프롬프트
      finalPrompt = `${prompt || "사용자 이미지의 얼굴을 템플릿 스타일로 변환해 주세요"}. 
사용자 이미지의 얼굴만 템플릿 이미지 스타일로 변환하고, 나머지 부분(헤어스타일, 의상, 배경 등)은 원본을 유지해주세요.
중요: 얼굴의 기본 비율과 특징은 유지하면서 스타일만 변경해주세요.`;
    }
    else {
      // 기본 합성 프롬프트
      finalPrompt = `${prompt || "이 두 이미지를 자연스럽게 합성해 주세요"}. 
사용자 이미지와 템플릿 이미지를 가장 자연스럽고 아름답게 합성해주세요.
중요: 사용자 이미지의 핵심 요소는 보존하면서 템플릿의 스타일을 적용해주세요.`;
    }
    
    // 마스크 영역 정보가 있는 경우 추가 지시사항
    if (maskArea) {
      let maskInfo = "";
      if (typeof maskArea === 'string') {
        try {
          const parsedMask = JSON.parse(maskArea);
          if (parsedMask.x !== undefined && parsedMask.y !== undefined && 
              parsedMask.width !== undefined && parsedMask.height !== undefined) {
            maskInfo = `마스크 영역: x=${parsedMask.x}, y=${parsedMask.y}, 너비=${parsedMask.width}, 높이=${parsedMask.height}. `;
          }
        } catch (e) {
          maskInfo = `마스크 정보: ${maskArea}. `;
        }
      } else if (typeof maskArea === 'object') {
        if (maskArea.x !== undefined && maskArea.y !== undefined && 
            maskArea.width !== undefined && maskArea.height !== undefined) {
          maskInfo = `마스크 영역: x=${maskArea.x}, y=${maskArea.y}, 너비=${maskArea.width}, 높이=${maskArea.height}. `;
        }
      }
      
      if (maskInfo) {
        finalPrompt += ` ${maskInfo}이 영역을 중심으로 합성해주세요.`;
      }
    }
    
    // GPT-4o Vision에 이미지 분석 요청
    console.log("1단계: GPT-4o Vision으로 합성 지침 생성 중...");
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    };
    
    // 분석 요청 메시지 구성
    const analysisMessages = [
      {
        role: "system",
        content: `당신은 이미지 합성 전문가입니다. 사용자가 제공한 두 이미지를 어떻게 합성해야 하는지 정확한 지침을 제공해주세요.
합성 타입: ${templateType}
결과물은 자연스럽고 아름다워야 하며, 원본 이미지의 중요한 특성(특히 인물의 나이, 표정, 외형)을 정확히 보존해야 합니다.`
      },
      {
        role: "user",
        content: [
          { type: "text", text: "첫 번째는 사용자 이미지입니다. 주요 대상을 상세히 분석해주세요:" },
          { 
            type: "image_url", 
            image_url: { url: `data:image/jpeg;base64,${userImageBase64}` }
          },
          { type: "text", text: "두 번째는 템플릿 이미지입니다. 이 이미지의 스타일과 특성을 분석해주세요:" },
          { 
            type: "image_url", 
            image_url: { url: `data:image/jpeg;base64,${templateImageBase64}` }
          },
          { type: "text", text: `이 두 이미지를 '${templateType}' 타입으로 합성하는 방법을 자세히 설명해주세요.` }
        ]
      }
    ];
    
    // 분석 요청 본문 구성
    const analysisBody = {
      model: "gpt-4o",  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: analysisMessages,
      max_tokens: 1000
    };
    
    // GPT-4o Vision으로 이미지 분석 및 합성 지침 생성 요청
    const analysisResponse = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(analysisBody)
    });
    
    const analysisResponseText = await analysisResponse.text();
    let analysisData: OpenAIChatResponse;
    
    try {
      analysisData = JSON.parse(analysisResponseText);
    } catch (e) {
      console.error("합성 분석 응답 파싱 오류:", e);
      return SERVICE_UNAVAILABLE;
    }
    
    if (!analysisResponse.ok || analysisData.error) {
      console.error("합성 분석 API 오류:", analysisData.error?.message || `HTTP 오류: ${analysisResponse.status}`);
      return SERVICE_UNAVAILABLE;
    }
    
    // 합성 지침 결과
    const compositionGuidelines = analysisData.choices?.[0]?.message?.content || "";
    if (!compositionGuidelines) {
      console.error("합성 지침 생성 결과가 없습니다");
      return SERVICE_UNAVAILABLE;
    }
    
    console.log("2단계: 합성 지침 생성 완료, 이미지 합성 시작...");
    
    // 합성 지침을 프롬프트에 추가
    finalPrompt += `\n\n합성 지침: ${compositionGuidelines.substring(0, 300)}...`;
    
    // 두 이미지를 모두 포함하는 합성 프롬프트 생성
    console.log("최종 합성 프롬프트 구성 완료");
    
    // gpt-image-1 API에 요청을 보내기 위한 프롬프트 최종 조정
    const enhancedPrompt = `두 이미지를 합성해주세요.
1. 첫 번째 이미지는 사용자 이미지로, 주요 대상입니다.
2. 두 번째 이미지는 템플릿으로, ${templateType} 타입의 합성에 사용됩니다.
3. 합성 타입: ${templateType}

${finalPrompt.substring(0, 300)}`; // 글자 수 제한
    
    // 임시 파일로 저장
    const userTempPath = path.join(process.cwd(), 'temp_user_image.jpg');
    const templateTempPath = path.join(process.cwd(), 'temp_template_image.jpg');
    
    // 두 이미지를 임시 파일로 저장
    fs.writeFileSync(userTempPath, userImageBuffer);
    fs.writeFileSync(templateTempPath, templateImageBuffer);
    
    // FormData 생성
    const formData = new FormData();
    formData.append('model', 'gpt-image-1');
    formData.append('prompt', enhancedPrompt);
    formData.append('image', fs.createReadStream(userTempPath));
    formData.append('n', '1');
    formData.append('size', '1024x1024');
    formData.append('quality', 'high');
    
    // API 호출 (gpt-image-1 이미지 편집 API 사용)
    const authHeader = {
      'Authorization': `Bearer ${API_KEY}`
    };
    
    const apiResponse = await fetch(OPENAI_IMAGE_EDITING_URL, {
      method: 'POST',
      headers: authHeader,
      body: formData
    });
    
    // 응답 파싱
    const responseText = await apiResponse.text();
    let responseData: OpenAIImageGenerationResponse;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error("이미지 합성 응답 파싱 오류:", e);
      return SERVICE_UNAVAILABLE;
    }
    
    // 응답 확인
    if (!apiResponse.ok || responseData.error) {
      const errorMessage = responseData.error?.message || `HTTP 오류: ${apiResponse.status}`;
      console.error("이미지 합성 API 오류:", errorMessage);
      return SERVICE_UNAVAILABLE;
    }
    
    // 결과 이미지 URL 추출
    let imageUrl = responseData.data?.[0]?.url;
    const base64Data = responseData.data?.[0]?.b64_json;
    
    // base64 데이터가 있는 경우 URL로 변환
    if (!imageUrl && base64Data) {
      imageUrl = `data:image/png;base64,${base64Data}`;
    }
    
    if (!imageUrl) {
      console.error("합성 이미지 URL 또는 base64 데이터가 없습니다");
      return SERVICE_UNAVAILABLE;
    }
    
    console.log("이미지 합성 완료");
    return imageUrl;
  } catch (error) {
    console.error("이미지 합성 중 오류 발생:", error);
    return SERVICE_UNAVAILABLE;
  }
}

// 이미지 합성 함수 내보내기 
export async function compositeImages(
  userImageBuffer: Buffer, 
  templateImageBuffer: Buffer, 
  templateType: string, 
  prompt: string,
  maskArea: any = null
): Promise<string> {
  return compositeImagesWithAI(userImageBuffer, templateImageBuffer, templateType, prompt, maskArea);
}