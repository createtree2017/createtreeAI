/**
 * 태몽동화 이미지 생성 서비스 (간소화된 버전)
 * DALL-E 3 모델을 활용한 간단한 이미지 생성 및 저장 구현
 */
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import FormData from 'form-data';

// OpenAI API 키 - 환경 변수에서 가져옴
const API_KEY = process.env.OPENAI_API_KEY;

// 서비스 불가능 상태 메시지
export const SERVICE_UNAVAILABLE = "/static/uploads/dream-books/error.png";

// API 키 유효성 검증
function isValidApiKey(apiKey: string | undefined): boolean {
  return !!apiKey && (apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-'));
}

// OpenAI API 엔드포인트
const OPENAI_IMAGE_CREATION_URL = "https://api.openai.com/v1/images/generations";

// API 응답 타입 정의
interface OpenAIImageGenerationResponse {
  created?: number;
  data?: Array<{
    url?: string;
    revised_prompt?: string;
    b64_json?: string;
  }>;
  error?: {
    message: string;
    type: string;
    code?: string;
  };
}

/**
 * 로그 함수들
 */
function logInfo(message: string, data?: any): void {
  console.info(`[INFO] ${message}`, data || '');
}

function logError(message: string, error?: any): void {
  console.error(`[ERROR] ${message}`, error || '');
}

/**
 * 태몽동화 캐릭터 이미지 생성 (사진 기반)
 * @param prompt 기본 프롬프트 (이름, 특징 등)
 * @param systemPrompt 스타일 시스템 프롬프트
 * @param uploadedImagePath 업로드된 이미지 파일 경로 (옵션)
 * @returns 생성된 캐릭터 이미지의 URL 경로
 */
// 타입 정의 추가
interface CharacterAnalysisResult {
  imageUrl: string;
  analysis: string;
}

export async function generateCharacterImage(
  prompt: string, 
  systemPrompt: string, 
  uploadedImagePath?: string
): Promise<string> {
  try {
    // 업로드된 이미지가 있는 경우 (사진 기반 캐릭터 생성)
    if (uploadedImagePath && fs.existsSync(uploadedImagePath)) {
      logInfo('사진 기반 캐릭터 생성 시작', { 
        prompt, 
        imagePath: uploadedImagePath 
      });
      
      // 업로드된 이미지를 Buffer로 읽기
      const imageBuffer = fs.readFileSync(uploadedImagePath);
      const base64Image = imageBuffer.toString('base64');
      
      // API 키 검증
      if (!isValidApiKey(API_KEY)) {
        logError('유효한 API 키가 없습니다');
        return SERVICE_UNAVAILABLE;
      }
      
      // 사진 기반 캐릭터 생성 프롬프트 - 캐릭터용 전용 프롬프트 사용
      // systemPrompt에는 characterPrompt가 전달됨 (server/routes/dream-book.ts에서 수정됨)
      const characterSystemPrompt = systemPrompt;
      
      // OpenAI Vision API 엔드포인트 (GPT-4-vision)
      const OPENAI_VISION_URL = "https://api.openai.com/v1/chat/completions";
      const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
      
      // 1단계: GPT-4o Vision으로 이미지 분석하여 사진 정보 추출
      logInfo('1단계: GPT-4o Vision으로 이미지 분석 시작');
      
      // 이미지 분석 메시지 구성
      const analysisMessages = [
        {
          role: "system",
          content: `당신은 업로드된 사진을 분석하여 인물의 모든 특성을 상세히 설명하는 비전 전문가입니다. 다음 정보를 추출해주세요:
1. 얼굴 특징: 얼굴형, 눈, 코, 입, 턱 등의 모양과 특징
2. 헤어스타일: 머리 길이, 색상, 스타일
3. 신체적 특성: 체형, 피부색, 나이대 등
4. 의상: 색상, 스타일, 특징
5. 표정 및 분위기
6. 기타 독특한 특징

사진을 정확하게 분석하여 이 사람의 특징이 유지되도록 하는 데 필요한 모든 정보를 제공해주세요.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `이 사진 속 인물을 ${systemPrompt}에 맞는 스타일로 변환하기 위해 필요한 모든 시각적 특성을 상세히 분석해주세요.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ];
      
      // API 헤더 설정
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      };
      
      // 분석 요청 본문 구성
      const analysisBody = {
        model: "gpt-4o",  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: analysisMessages,
        max_tokens: 1000
      };
      
      // GPT-4o Vision으로 이미지 분석 요청
      const analysisResponse = await fetch(OPENAI_VISION_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(analysisBody)
      });
      
      const analysisResponseText = await analysisResponse.text();
      let analysisData;
      
      try {
        analysisData = JSON.parse(analysisResponseText);
      } catch (e) {
        logError("이미지 분석 응답 파싱 오류:", e);
        return SERVICE_UNAVAILABLE;
      }
      
      if (!analysisResponse.ok || analysisData.error) {
        logError("이미지 분석 API 오류:", analysisData.error?.message || `HTTP 오류: ${analysisResponse.status}`);
        return SERVICE_UNAVAILABLE;
      }
      
      // 이미지 분석 결과
      const imageDescription = analysisData.choices?.[0]?.message?.content || "";
      if (!imageDescription) {
        logError("이미지 분석 결과가 없습니다");
        return SERVICE_UNAVAILABLE;
      }
      
      // 2단계: GPT-4o로 원본 특성 유지 프롬프트 생성
      logInfo('2단계: GPT-4o로 프롬프트 지침 생성 중...');
      
      const promptGenerationBody = {
        model: "gpt-4o",  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `당신은 이미지 생성 모델을 위한 프롬프트 작성 전문가입니다. GPT-Image-1 모델이 원본 사진 특성을 유지하면서 스타일 변환을 할 수 있도록 프롬프트를 작성해야 합니다.

1. 이미지 분석 정보를 바탕으로 인물의 모든 주요 특성을 포함하세요.
2. 스타일과 관련된 구체적인 지시사항을 포함하세요: ${systemPrompt}
3. 머리 스타일, 얼굴 특징, 눈, 입, 자세, 전체적인 모양을 명확하게 설명하세요.
4. "이미지를 생성하세요"와 같은 지시문은 피하고 대신 시각적 특성만 설명하세요.
5. 전신이 보이는 캐릭터를 정면에서 바라본 모습으로 설명하세요.
6. 배경은 단순하게 하고 캐릭터에 집중하도록 지시하세요.
7. 배경과 인물의 구도에 대한 명확한 지침을 포함하세요.

프롬프트는 명확하고 상세해야 하며, GPT-Image-1 모델이 원본 사진의 특성을 유지하면서 요청된 스타일로 변환할 수 있도록 해야 합니다.`
          },
          {
            role: "user",
            content: `원본 이미지 분석 정보:
${imageDescription}

사용자 요청: ${prompt}

위 정보를 바탕으로 GPT-Image-1 모델이 원본 이미지의 특성(인물 외모, 의상, 배경, 구도 등)을 완벽하게 보존하면서 ${systemPrompt} 스타일로 변환할 수 있는 프롬프트를 작성해 주세요. 인물의 특징과 외모를 유지하며, 전신이 보이게 생성하도록 하세요. 배경은 단순하게 하고 캐릭터에만 집중하도록 지시하세요.`
          }
        ],
        max_tokens: 1000
      };
      
      // GPT-4o로 프롬프트 생성 요청
      const promptResponse = await fetch(OPENAI_CHAT_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(promptGenerationBody)
      });
      
      const promptResponseText = await promptResponse.text();
      let promptData;
      
      try {
        promptData = JSON.parse(promptResponseText);
      } catch (e) {
        logError("프롬프트 생성 응답 파싱 오류:", e);
        return SERVICE_UNAVAILABLE;
      }
      
      if (!promptResponse.ok || promptData.error) {
        logError("프롬프트 생성 API 오류:", promptData.error?.message || `HTTP 오류: ${promptResponse.status}`);
        return SERVICE_UNAVAILABLE;
      }
      
      // 생성된 프롬프트
      const generatedPrompt = promptData.choices?.[0]?.message?.content || "";
      if (!generatedPrompt) {
        logError("프롬프트 생성 결과가 없습니다");
        return SERVICE_UNAVAILABLE;
      }
      
      // 3단계: GPT-Image-1로 이미지 생성 (원본 이미지 참조)
      logInfo('3단계: GPT-Image-1로 캐릭터 이미지 생성 중...');
      
      try {
        // OpenAI GPT-Image-1 Edit API를 호출하기 위한 준비
        const OPENAI_IMAGE_EDITING_URL = "https://api.openai.com/v1/images/edits";
        
        // 임시 파일 경로 설정 (Buffer를 파일로 저장)
        const tempFilePath = path.join(process.cwd(), 'temp_image.jpg');
        
        // 이미지 Buffer를 임시 파일로 저장
        fs.writeFileSync(tempFilePath, imageBuffer);
        
        // FormData 객체 생성
        const formData = new FormData();
        formData.append('model', 'gpt-image-1');
        formData.append('prompt', generatedPrompt);
        formData.append('image', fs.createReadStream(tempFilePath));
        formData.append('size', '1024x1024');
        formData.append('quality', 'high');
        formData.append('n', '1');
        
        // multipart/form-data를 사용하므로 Content-Type 헤더는 자동 설정됨
        const authHeader = {
          'Authorization': `Bearer ${API_KEY}`
        };
        
        // API 호출
        const apiResponse = await fetch(OPENAI_IMAGE_EDITING_URL, {
          method: 'POST',
          headers: authHeader,
          body: formData
        });
        
        // 응답 텍스트로 가져오기
        const responseText = await apiResponse.text();
        
        // JSON 파싱 시도
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          logError("GPT-Image-1 Edit API 응답 파싱 오류:", e);
          // 이 경우 DALL-E 3로 폴백하지 않고 오류를 반환
          return SERVICE_UNAVAILABLE;
        }
        
        // 오류 응답 확인
        if (!apiResponse.ok || responseData.error) {
          const errorMessage = responseData.error?.message || `HTTP 오류: ${apiResponse.status}`;
          logError("GPT-Image-1 Edit API 오류:", errorMessage);
          
          // GPT-Image-1 실패 시 DALL-E 3로 폴백 (캐릭터 프롬프트 유지)
          logInfo("GPT-Image-1 실패, DALL-E 3로 캐릭터 생성 폴백합니다");
          // 캐릭터 생성에 사용된 것과 동일한 프롬프트 전달 (캐릭터 프롬프트)
          return generateDreamImage(generatedPrompt, characterSystemPrompt);
        }
        
        // 응답 데이터 검증
        if (!responseData.data || responseData.data.length === 0) {
          logError("이미지 데이터가 없습니다");
          // DALL-E 3로 폴백 (캐릭터 프롬프트 유지)
          return generateDreamImage(generatedPrompt, characterSystemPrompt);
        }
        
        // 이미지 URL 또는 base64 데이터 가져오기
        let imageUrl = responseData.data[0]?.url;
        const base64Data = responseData.data[0]?.b64_json;
        
        // 이미지 URL 또는 base64가 있는지 확인
        if (!imageUrl && !base64Data) {
          logError("이미지 URL과 base64 데이터가 모두 없습니다");
          return SERVICE_UNAVAILABLE;
        }
        
        // base64 데이터가 있는 경우
        if (base64Data) {
          // 파일 이름 및 경로 설정
          const timestamp = Date.now();
          const randomId = Math.floor(Math.random() * 10000);
          const filename = `dreambook-${timestamp}-${randomId}.png`;
          
          // 저장 경로 설정
          const uploadPath = path.join(process.cwd(), 'static', 'uploads', 'dream-books');
          
          try {
            // 디렉토리가 없으면 생성
            if (!fs.existsSync(uploadPath)) {
              fs.mkdirSync(uploadPath, { recursive: true });
            }
            
            const filePath = path.join(uploadPath, filename);
            
            // Base64 데이터를 파일로 저장
            fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
            
            // 웹에서 접근 가능한 URL 경로 반환
            imageUrl = `/static/uploads/dream-books/${filename}`;
            
            logInfo('이미지 파일 저장 완료', {
              filePath,
              accessUrl: imageUrl
            });
            
            return imageUrl;
          } catch (err) {
            logError('이미지 파일 저장 실패', err);
            return SERVICE_UNAVAILABLE;
          }
        }
        
        // URL이 있는 경우 (원격 파일 다운로드 후 저장)
        if (imageUrl) {
          try {
            // 파일 이름 및 경로 설정
            const timestamp = Date.now();
            const randomId = Math.floor(Math.random() * 10000);
            const filename = `dreambook-${timestamp}-${randomId}.png`;
            
            // 저장 경로 설정
            const uploadPath = path.join(process.cwd(), 'static', 'uploads', 'dream-books');
            
            // 디렉토리가 없으면 생성
            if (!fs.existsSync(uploadPath)) {
              fs.mkdirSync(uploadPath, { recursive: true });
            }
            
            const filePath = path.join(uploadPath, filename);
            
            // 원격 이미지 다운로드 및 저장
            const imageResponse = await fetch(imageUrl);
            const imageBuffer = await imageResponse.buffer();
            fs.writeFileSync(filePath, imageBuffer);
            
            // 웹에서 접근 가능한 URL 경로 반환
            const localImageUrl = `/static/uploads/dream-books/${filename}`;
            
            logInfo('원격 이미지 다운로드 및 저장 완료', {
              filePath,
              accessUrl: localImageUrl
            });
            
            return localImageUrl;
          } catch (downloadErr) {
            logError('원격 이미지 다운로드 실패', downloadErr);
            // 원격 URL을 그대로 반환 (임시 방편, 향후 만료될 수 있음)
            return imageUrl;
          }
        }
        
        // 여기까지 왔는데 URL이 없다면 오류
        return SERVICE_UNAVAILABLE;
      } catch (gptImageError) {
        // GPT-Image-1 호출 오류 발생 시 DALL-E 3로 폴백
        logError('GPT-Image-1 처리 오류, DALL-E 3로 폴백합니다', gptImageError);
        return generateDreamImage(generatedPrompt, systemPrompt);
      }
    } 
    // 사진이 없는 경우 (기존 방식)
    else {
      const characterSystemPrompt = `${systemPrompt}\n\n전신이 보이는 캐릭터 한 명만 정면에서 바라본 모습으로 생성하세요. 배경은 단순하게 하고 캐릭터에 집중하세요.`;
      return generateDreamImage(prompt, characterSystemPrompt);
    }
  } catch (error) {
    logError('캐릭터 이미지 생성 중 오류 발생', error);
    return SERVICE_UNAVAILABLE;
  }
}

/**
 * GPT-4o Vision으로 캐릭터 이미지 분석하여 상세 설명 생성
 * @param characterImageUrl 캐릭터 이미지 URL
 * @returns 분석된 캐릭터 상세 설명
 */
export async function analyzeCharacterImage(characterImageUrl: string): Promise<string> {
  try {
    // 이미지 URL이 로컬 경로인 경우 전체 URL 구성
    let fullImageUrl = characterImageUrl;
    if (characterImageUrl.startsWith('/static')) {
      // 로컬 파일 시스템 경로로 변환
      const localPath = path.join(process.cwd(), 'static', characterImageUrl.substring(8));
      if (!fs.existsSync(localPath)) {
        logError('캐릭터 이미지 파일을 찾을 수 없습니다', { path: localPath });
        return '';
      }
      
      // 이미지를 Buffer로 읽고 base64로 인코딩
      const imageBuffer = fs.readFileSync(localPath);
      const base64Image = imageBuffer.toString('base64');
      
      // API 요청 헤더 및 바디 구성
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      };
      
      // GPT-4o Vision API 엔드포인트
      const OPENAI_VISION_URL = "https://api.openai.com/v1/chat/completions";
      
      // 이미지 분석 요청 본문
      const requestBody = {
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [
          {
            role: "system",
            content: `당신은 이미지 속 캐릭터의 모든 시각적 특성을 상세히 관찰하고 설명하는 전문가입니다. 
다음 사항을 정확하게 설명해주세요:
1. 얼굴 특징: 얼굴형, 눈 모양과 색, 코와 입의 형태, 턱선 등을 구체적으로
2. 헤어스타일: 머리카락 길이, 색상, 스타일, 머리 모양의 특징적 요소
3. 신체 특성: 체형, 피부색, 나이대, 신체 비율 등
4. 의상: 옷의 색상, 스타일, 독특한 특징이나 액세서리
5. 캐릭터의 전반적인 인상과 분위기

아주 상세하게 묘사해 주세요. 이 정보는 다른 장면에서 이 캐릭터를 일관되게 표현하는 데 사용됩니다.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "이 캐릭터 이미지를 상세히 분석해주세요. 다른 장면에서 동일한 캐릭터를 일관되게 표현하기 위한 참조로 사용됩니다."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      };
      
      // API 호출
      logInfo('GPT-4o Vision으로 캐릭터 분석 요청 시작');
      const response = await fetch(OPENAI_VISION_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        logError('GPT-4o Vision API 호출 오류', { status: response.status });
        return '';
      }
      
      const data = await response.json();
      const analysisText = data.choices?.[0]?.message?.content || '';
      
      if (analysisText) {
        logInfo('캐릭터 분석 완료', { analysisLength: analysisText.length });
        return analysisText;
      } else {
        logError('캐릭터 분석 결과가 없습니다');
        return '';
      }
    } else {
      // 원격 URL인 경우 처리하지 않음
      logError('원격 URL 분석은 지원하지 않습니다', { url: characterImageUrl });
      return '';
    }
  } catch (error) {
    logError('캐릭터 이미지 분석 중 오류 발생', error);
    return '';
  }
}

/**
 * 태몽동화 장면 이미지 생성 (캐릭터 참조 포함)
 * @param scenePrompt 장면 프롬프트
 * @param characterPrompt 캐릭터 참조 프롬프트
 * @param stylePrompt 스타일 지시 프롬프트
 * @returns 생성된 장면 이미지의 URL 경로
 */
export async function generateDreamSceneImage(
  scenePrompt: string, 
  characterPrompt: string, 
  stylePrompt: string, 
  peoplePrompt: string,
  backgroundPrompt: string,
  characterAnalysis?: string, // 추가: GPT-4o Vision으로 분석한 캐릭터 설명
  previousSceneImageUrl?: string // 추가: 이전 장면 이미지 URL
): Promise<string> {
  // 캐릭터 분석 결과가 있으면 함께 사용
  const characterDescription = characterAnalysis && characterAnalysis.trim() 
    ? `\n\n자세한 캐릭터 분석:\n${characterAnalysis}\n` 
    : '';
  
  // 이전 장면 이미지 참조 지시사항 추가
  const previousSceneReference = previousSceneImageUrl 
    ? `\n\n이 장면은 이전 장면 이미지와 연결된 이야기입니다.
아래 이미지를 참고하여 동일한 캐릭터, 배경 스타일, 분위기로 그려주세요.
이전 장면 이미지: ${previousSceneImageUrl}\n` 
    : '';
    
  const fullPrompt = `
System: ${stylePrompt}${previousSceneReference}

캐릭터 참조: ${characterPrompt}${characterDescription}

인물 표현: ${peoplePrompt}

배경 표현: ${backgroundPrompt}

User: ${scenePrompt}
`;
  return generateDreamImage(fullPrompt);
}

/**
 * DALL-E 3를 사용하여 태몽동화 이미지 생성
 * @param prompt 이미지 생성에 사용할 프롬프트
 * @param systemPrompt 시스템 프롬프트 (스타일 지시사항)
 * @returns 생성된 이미지의 URL 경로
 */
export async function generateDreamImage(prompt: string, systemPrompt?: string): Promise<string> {
  try {
    // API 키 검증
    if (!isValidApiKey(API_KEY)) {
      logError('유효한 API 키가 없습니다');
      return SERVICE_UNAVAILABLE;
    }

    // 최종 프롬프트 생성 (시스템 프롬프트가 있는 경우 결합)
    let finalPrompt = prompt;
    if (systemPrompt && systemPrompt.trim()) {
      finalPrompt = `${systemPrompt}\n\n${prompt}`;
    }

    // 프롬프트 로깅
    logInfo('태몽동화 이미지 생성 프롬프트', {
      prompt: finalPrompt.substring(0, 100) + (finalPrompt.length > 100 ? '...' : '')
    });

    // DALL-E 3 API 요청 본문
    const requestBody = {
      model: "dall-e-3",
      prompt: finalPrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "b64_json"
    };

    // API 헤더 설정
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    };

    // API 호출
    const response = await fetch(OPENAI_IMAGE_CREATION_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    // 응답 검증
    if (!response.ok) {
      const errorData = await response.json();
      logError('DALL-E 3 API 오류', errorData);
      return SERVICE_UNAVAILABLE;
    }

    // 응답 파싱
    const responseData = await response.json() as OpenAIImageGenerationResponse;

    // 데이터 검증
    if (!responseData.data || responseData.data.length === 0) {
      logError('응답에 이미지 데이터가 없습니다');
      return SERVICE_UNAVAILABLE;
    }

    // 이미지 URL 또는 base64 데이터 추출
    const imageData = responseData.data[0];
    let imageUrl = imageData.url;
    const base64Data = imageData.b64_json;

    // base64 데이터가 있는 경우 파일로 저장
    if (base64Data) {
      // 파일 이름 및 경로 설정
      const timestamp = Date.now();
      const randomId = Math.floor(Math.random() * 10000);
      const filename = `dreambook-${timestamp}-${randomId}.png`;
      
      // 저장 경로 설정
      const uploadPath = path.join(process.cwd(), 'static', 'uploads', 'dream-books');
      
      try {
        // 디렉토리가 없으면 생성
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        const filePath = path.join(uploadPath, filename);
        
        // Base64 데이터를 파일로 저장
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        
        // 웹에서 접근 가능한 URL 경로 반환
        imageUrl = `/static/uploads/dream-books/${filename}`;
        
        logInfo('이미지 파일 저장 완료', {
          filePath,
          accessUrl: imageUrl
        });
      } catch (err) {
        logError('이미지 파일 저장 실패', err);
        return SERVICE_UNAVAILABLE;
      }
    } else if (imageUrl) {
      // OpenAI에서 URL만 받은 경우 - URL 그대로 반환 (단, 파일로 저장 안됨)
      logInfo('OpenAI에서 이미지 URL 받음', { url: imageUrl });
      // 참고: OpenAI URL은 시간 제한이 있어 만료될 수 있음
    } else {
      // URL도 base64도 없는 경우
      logError('이미지 URL과 base64 데이터 모두 없음');
      return SERVICE_UNAVAILABLE;
    }

    return imageUrl || SERVICE_UNAVAILABLE;
  } catch (error) {
    logError('태몽동화 이미지 생성 중 오류 발생', error);
    return SERVICE_UNAVAILABLE;
  }
}

/**
 * 스타일 키워드를 프롬프트에 추가 (기존 코드 간소화)
 */
export function getStylePrompt(style: string): string {
  const stylePrompts: Record<string, string> = {
    realistic: "사실적인 스타일로 이미지를 생성해주세요. 세부 디테일과 사실적인 질감을 포함해야 합니다.",
    ghibli: "지브리 스튜디오 스타일과 비슷하게 이미지를 생성해주세요. 한장에 한장면만 연출되도록 생성해주세요. 일본 애니메이션 특유의 섬세한 선과 느낌을 충분히 살려주세요.",
    disney: "디즈니 애니메이션 스타일로 이미지를 생성해주세요. 부드러운 색감과 생동감 있는 캐릭터 표현을 포함해주세요.",
    fairytale: "동화책 일러스트레이션 스타일로 이미지를 생성해주세요. 환상적이고 아름다운 분위기를 담아주세요.",
    webtoon: "한국 웹툰 스타일로 이미지를 생성해주세요. 깔끔한 선과 선명한 색상을 사용해주세요."
  };

  return stylePrompts[style] || stylePrompts.realistic;
}