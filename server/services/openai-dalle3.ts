/**
 * OpenAI GPT-4o Vision 및 gpt-image-1 모델을 활용한 이미지 생성 및 변환 서비스
 * 원본 이미지 특성을 더 정확하게 유지하는 이미지 변환 구현
 * 파일명은 backward compatibility를 위해 유지
 */
import fetch from 'node-fetch';
import fs from 'fs';
import FormData from 'form-data';
import path from 'path';

// OpenAI API 키 - 환경 변수에서 가져옴
const API_KEY = process.env.OPENAI_API_KEY;

// 서비스 불가능 상태 메시지
const SERVICE_UNAVAILABLE = "https://placehold.co/1024x1024/A7C1E2/FFF?text=현재+이미지생성+서비스가+금일+종료+되었습니다";

// API 키 유효성 검증 - 프로젝트 API 키 지원 추가 (sk-proj- 시작)
function isValidApiKey(apiKey: string | undefined): boolean {
  return !!apiKey && (apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-'));
}

// OpenAI API 엔드포인트
const OPENAI_IMAGE_CREATION_URL = "https://api.openai.com/v1/images/generations"; // 이미지 생성용 (DALL-E 3 또는 gpt-image-1)
const OPENAI_IMAGE_EDITING_URL = "https://api.openai.com/v1/images/edits"; // 이미지 편집용 (gpt-image-1) - 복수형으로 수정
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
 * GPT-Image-1 모델로 이미지 편집 요청
 * 원본 이미지와 프롬프트를 함께 전송하여 원본 특성을 유지하는 변환 지원
 */
async function callGptImage1Api(prompt: string, imageBuffer: Buffer): Promise<string> {
  if (!isValidApiKey(API_KEY)) {
    console.log("유효한 API 키가 없습니다");
    return SERVICE_UNAVAILABLE;
  }

  try {
    // 프롬프트 검증
    if (!prompt || prompt.trim() === '') {
      console.error("API 호출 오류: 프롬프트가 비어 있습니다!");
      return SERVICE_UNAVAILABLE;
    }
    
    console.log("=== GPT-Image-1 API에 전송되는 최종 프롬프트 ===");
    console.log(prompt);
    console.log("=== GPT-Image-1 API 프롬프트 종료 ===");
    console.log("프롬프트 길이:", prompt.length);
    
    // 이미지를 Base64로 인코딩
    const base64Image = imageBuffer.toString('base64');
    
    // API 요청 헤더 (JSON 형식)
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    };
    
    try {
      // GPT-Image-1 Edit API 요청 (원본 이미지 참조)
      console.log("GPT-Image-1 Edit API 호출 (원본 이미지 참조 가능)");
      
      // 임시 파일 경로 설정 (Buffer를 파일로 저장)
      const tempFilePath = path.join(process.cwd(), 'temp_image.jpg');
      
      // 이미지 Buffer를 임시 파일로 저장
      fs.writeFileSync(tempFilePath, imageBuffer);
      
      // FormData 객체 생성
      const formData = new FormData();
      formData.append('model', 'gpt-image-1');
      formData.append('prompt', prompt);
      formData.append('image', fs.createReadStream(tempFilePath));
      formData.append('size', '1024x1024');
      formData.append('quality', 'high');  // GPT-Image-1에서는 'hd' 대신 'high' 사용
      formData.append('n', '1');  // 이미지 1개 생성
      // 'response_format' 파라미터 제거 - gpt-image-1에서는 지원하지 않음
      
      // multipart/form-data를 사용하므로 Content-Type 헤더는 자동 설정됨
      const authHeader = {
        'Authorization': `Bearer ${API_KEY}`
      };
      
      console.log("multipart/form-data 형식으로 GPT-Image-1 Edit API 호출");
      
      // API 호출
      const apiResponse = await fetch(OPENAI_IMAGE_EDITING_URL, {
        method: 'POST',
        headers: authHeader,
        body: formData
      });
      
      // 응답 텍스트로 가져오기
      const responseText = await apiResponse.text();
      
      // 전체 응답 내용 상세 로깅 (디버깅 목적)
      console.log("GPT-Image-1 API 응답 완료 (응답 상세 내용 로그 생략)");
      
      // JSON 파싱 시도
      let responseData: OpenAIImageGenerationResponse;
      try {
        responseData = JSON.parse(responseText);
        
        // 응답 데이터 구조 상세 로깅
        console.log("GPT-Image-1 응답 구조:", JSON.stringify({
          created: responseData.created,
          dataLength: responseData.data ? responseData.data.length : 0,
          firstDataItem: responseData.data && responseData.data.length > 0 ? {
            hasUrl: !!responseData.data[0].url,
            urlPrefix: responseData.data[0].url ? responseData.data[0].url.substring(0, 30) : "없음"
          } : "데이터 없음",
          errorInfo: responseData.error ? {
            message: responseData.error.message,
            type: responseData.error.type,
            code: responseData.error.code
          } : "오류 없음"
        }, null, 2));
        
      } catch (e) {
        console.error("GPT-Image-1 Edit API 응답 파싱 오류:", e);
        console.error("원본 응답:", responseText);
        // 오류 발생 시 실패 처리 (폴백 없음)
        console.log("GPT-Image-1 Edit API 응답 파싱 실패");
        throw new Error("GPT-Image-1 Edit API 응답 파싱 실패");
      }
      
      // 오류 응답 확인
      if (!apiResponse.ok || responseData.error) {
        const errorMessage = responseData.error?.message || `HTTP 오류: ${apiResponse.status}`;
        console.error("GPT-Image-1 Edit API 오류:", errorMessage);
        throw new Error("GPT-Image-1 Edit API 오류");
      }
      
      // 응답 데이터 검증
      if (!responseData.data || responseData.data.length === 0) {
        console.error("이미지 데이터가 없습니다");
        throw new Error("GPT-Image-1 응답에 이미지 데이터 없음");
      }
      
      // 세부 로깅으로 데이터 구조 파악
      console.log("이미지 데이터 첫 번째 항목 구조:", JSON.stringify({
        hasData: !!responseData.data[0],
        hasUrl: !!responseData.data[0]?.url,
        hasBase64: !!responseData.data[0]?.b64_json,
        hasRevisedPrompt: !!responseData.data[0]?.revised_prompt,
        allKeys: Object.keys(responseData.data[0] || {})
      }, null, 2));
      
      // 이미지 URL 또는 base64 데이터 가져오기
      let imageUrl = responseData.data[0]?.url;
      const base64Data = responseData.data[0]?.b64_json;
      
      // base64 데이터가 있고 URL이 없는 경우, base64 데이터를 URL로 변환
      if (!imageUrl && base64Data) {
        console.log("이미지 URL이 없고 base64 데이터가 있습니다. base64 데이터를 사용합니다.");
        // base64 데이터를 데이터 URL로 변환
        imageUrl = `data:image/png;base64,${base64Data}`;
        console.log("base64 데이터 URL 생성 완료 [base64 데이터 로그 생략]");
      }
      
      if (!imageUrl) {
        console.error("이미지 URL과 base64 데이터가 모두 없습니다");
        throw new Error("GPT-Image-1 응답에 이미지 데이터 없음");
      }
      
      return imageUrl;
    } catch (editError: any) {
      // GPT-Image-1 Edit API 오류 처리 - DALL-E 3 폴백 제거
      const errorMessage = editError instanceof Error ? editError.message : 'Unknown error';
      console.log("GPT-Image-1 API 오류:", errorMessage);
      
      // 오류 발생 시 서비스 불가 메시지 반환
      console.error("GPT-Image-1 API 호출 실패");
      return SERVICE_UNAVAILABLE;
    }
  } catch (error) {
    console.error("API 호출 중 오류:", error);
    return SERVICE_UNAVAILABLE;
  }
}

/**
 * GPT-4o Vision으로 이미지를 분석하여 향상된 프롬프트 생성 후 gpt-image-1로 이미지 생성 요청
 * 멀티모달 분석을 통한 향상된 이미지 변환 기능
 */
async function callGPT4oVisionAndImage1(imageBuffer: Buffer, prompt: string, systemPrompt: string | null = null, style: string = "artistic"): Promise<string> {
  if (!isValidApiKey(API_KEY)) {
    console.log("유효한 API 키가 없습니다");
    return SERVICE_UNAVAILABLE;
  }

  try {
    // 이미지를 Base64로 인코딩
    const base64Image = imageBuffer.toString('base64');
    
    // API 요청 헤더 및 바디 구성
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    };
    
    // 1단계: GPT-4o Vision으로 이미지 분석 및 설명 생성 (시스템 프롬프트 제공 여부에 따라 달라짐) 
    console.log("1단계: GPT-4o Vision으로 이미지 분석 중...");
    
    // 이미지 분석을 위한 API 요청 준비
    let analysisMessages = [];

    // systemPrompt가 제공된 경우 system 역할로 추가
    if (systemPrompt) {
      console.log("제공된 시스템 프롬프트 사용:", systemPrompt.substring(0, 100) + "...");
      analysisMessages.push({
        role: "system",
        content: systemPrompt
      });
    }

    // 기본 또는 커스텀 지침으로 사용자 메시지 추가
    analysisMessages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: systemPrompt ? 
            `이 이미지를 분석해주세요.` : 
            `이 이미지에 대한 정확한 설명을 작성해 주세요:

인물 특성에 초점을 맞춰 자세하고 명확하게 설명해주세요:
1. 인물 수: 이미지에 있는 모든 사람의 수
2. 각 인물의 정확한 특징 (특히 나이와 외형 정보가 중요합니다):
   - 성별: 남성/여성인지 명확히 구분
   - 나이: 구체적인 나이대 표기 (예: 유아 0-3세, 어린이 4-7세, 아동 8-12세, 청소년 13-18세, 성인)
   - 얼굴 특징: 눈 크기와 모양, 볼 풍부함, 코와 입 모양 정확히 서술
   - 헤어스타일: 길이, 색상, 스타일 세부적으로 설명
   - 피부 톤: 정확한 색조와 질감
   - 특이점: 안경, 귀걸이, 주근깨, 기타 특징적 요소
3. 의상: 각 인물의 옷 색상, 스타일, 재질, 특징적 요소 (무늬, 장식 등)
4. 표정: 정확한 감정 상태와 표정 묘사
5. 포즈와 자세: 팔, 다리, 몸통의 정확한 위치와 움직임
6. 배경 환경: 장소, 물체, 조명 조건
7. 이미지의 전체적인 분위기와 톤

주의: AI가 이미지를 변환할 때 원본 인물의 특징, 특히 나이와 외형을 정확히 유지하는 것이 매우 중요합니다. 최대한 상세하고 명확하게 작성해 주세요.`
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${base64Image}`
          }
        }
      ]
    });

    // 분석 요청 본문 구성
    const analysisBody = {
      model: "gpt-4o",  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: analysisMessages,
      max_tokens: 1000
    };
    
    // GPT-4o Vision으로 이미지 분석 요청
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
      console.error("이미지 분석 응답 파싱 오류:", e);
      return SERVICE_UNAVAILABLE;
    }
    
    if (!analysisResponse.ok || analysisData.error) {
      console.error("이미지 분석 API 오류:", analysisData.error?.message || `HTTP 오류: ${analysisResponse.status}`);
      return SERVICE_UNAVAILABLE;
    }
    
    // 이미지 분석 결과
    const imageDescription = analysisData.choices?.[0]?.message?.content || "";
    if (!imageDescription) {
      console.error("이미지 분석 결과가 없습니다");
      return SERVICE_UNAVAILABLE;
    }
    
    // 2단계: GPT-4o로 원본 특성 유지 프롬프트 생성
    console.log("2단계: GPT-4o로 프롬프트 지침 생성 중...");
    const promptGenerationBody = {
      model: "gpt-4o",  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `당신은 이미지 스타일 변환을 위한 프롬프트 전문가입니다. 사용자가 제공하는 이미지 분석 정보를 바탕으로 DALL-E 3가 원본 이미지의 특성을 최대한 정확하게 유지하면서 스타일 변환할 수 있는 프롬프트를 작성해야 합니다.

다음 사항을 반드시 프롬프트에 포함시키세요:
1. 가장 중요: 인물의 정확한 연령대 유지 (어린이는 반드시 어린이로, 성인은 성인으로)
   - 연령을 명확하게 지시: 유아(0-3세), 어린이(4-7세), 아동(8-12세), 청소년(13-18세), 성인 등
   - "DO NOT AGE UP THE SUBJECT"와 같은 명확한 지시문 포함
   - 어린이의 경우 "Keep child-like proportions"와 같은 명령 추가
2. 모든 인물의 정확한 특징 유지 지시
   - 얼굴 생김새 (눈 크기/모양, 볼살, 코, 입 모양)
   - 헤어스타일 (길이, 색상, 스타일)
   - 피부톤
   - 특징적 요소 (안경, 모자, 악세서리 등)
3. 정확한 구도와 배경 유지 명령
4. 동일한 인물 수와 위치 관계 보존 
5. 의상의 색상과 스타일 보존
6. 표정, 감정, 자세 동일하게 유지

프롬프트는 DALL-E 3에게 지시하는 형식으로 영어로 작성하세요. 
중요: 스타일 관련 내용은 직접 지정하지 말고, 원본 요청의 스타일 지시를 따르도록 하세요. 스타일은 사용자의 요청에서 가져오고, 당신은 오직 원본 이미지 특성 보존에만 집중하세요.`
        },
        {
          role: "user",
          content: `원본 이미지 분석 정보:
${imageDescription}

사용자 요청: ${prompt ? prompt : "(프롬프트 없음)"}

${prompt ? `위 정보를 바탕으로 DALL-E 3가 원본 이미지의 특성(인물 외모, 의상, 배경, 구도 등)을 완벽하게 보존하면서 요청된 스타일로 변환할 수 있는 프롬프트를 작성해 주세요. 스타일은 사용자 요청에서 언급된 스타일을 따르세요.` : 
`사용자가 프롬프트를 지정하지 않았습니다. 이미지의 특성(인물 외모, 의상, 배경, 구도 등)을 그대로 유지하는 간단한 변환 프롬프트를 생성해주세요. 다른 추가적인 스타일이나 요소를 추가하지 마세요.`}`
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
    let promptData: OpenAIChatResponse;
    
    try {
      promptData = JSON.parse(promptResponseText);
    } catch (e) {
      console.error("프롬프트 생성 응답 파싱 오류:", e);
      return SERVICE_UNAVAILABLE;
    }
    
    if (!promptResponse.ok || promptData.error) {
      console.error("프롬프트 생성 API 오류:", promptData.error?.message || `HTTP 오류: ${promptResponse.status}`);
      return SERVICE_UNAVAILABLE;
    }
    
    // 생성된 프롬프트
    const generatedPrompt = promptData.choices?.[0]?.message?.content || "";
    if (!generatedPrompt) {
      console.error("프롬프트 생성 결과가 없습니다");
      return SERVICE_UNAVAILABLE;
    }
    
    // 3단계: gpt-image-1로 이미지 생성 (원본 이미지를 함께 전송)
    console.log("3단계: GPT-Image-1로 이미지 생성 중...");
    console.log("생성된 프롬프트:", generatedPrompt.substring(0, 150) + "...");
    
    // 이미지 설명에서 연령 정보 추출 시도
    const ageMatch = imageDescription.match(/나이.*?(\d+)세|유아|어린이|아동|청소년|성인|infant|toddler|child|teenager|(\d+)\s*years?\s*old/i);
    const isChild = ageMatch || imageDescription.toLowerCase().includes('child') || imageDescription.toLowerCase().includes('어린이') || imageDescription.toLowerCase().includes('아이');
    
    // 사용자 요청 스타일 추출 또는 기본 스타일 정보 제공
    let userStylePrompt = "";
    if (prompt && prompt.trim() !== "") {
      userStylePrompt = prompt.split('\n')[0];
    } else {
      // 빈 프롬프트인 경우: 시스템 프롬프트가 있다면 계속 진행, 없다면 중단
      if (systemPrompt && systemPrompt.trim() !== "") {
        console.log("빈 프롬프트가 입력되었지만 시스템 프롬프트가 있으므로 계속 진행합니다.");
        // 스타일 기본 설명을 제공
        userStylePrompt = `Transform this image into a ${style} style`;
      } else {
        // 프롬프트와 시스템 프롬프트 모두 없는 경우 중단
        console.log("빈 프롬프트와 빈 시스템 프롬프트. 이미지 변환을 중단합니다.");
        return SERVICE_UNAVAILABLE;
      }
    }
    
    // 시스템 프롬프트 로직 변경 - 명시적으로 제공된 경우에만 사용
    // 기본 프롬프트 없음 - 사용자나 관리자가 명시적으로 제공한 프롬프트만 사용
    let systemInstructions = "";
    if (systemPrompt && systemPrompt.trim() !== "") {
      systemInstructions = `Additional instructions: ${systemPrompt}`;
      console.log("제공된 시스템 프롬프트를 사용합니다:", systemPrompt.substring(0, 50) + "...");
    } else {
      console.log("시스템 프롬프트가 없습니다. 기본 시스템 프롬프트도 적용하지 않습니다.");
    }
    
    // GPT-Image-1용 간결한 프롬프트 구조
    // 분석된 이미지 정보와 스타일 요청을 결합하여 명확한 지시문 생성
    const finalPrompt = `${userStylePrompt}. 
${systemInstructions}
Key characteristics to preserve: ${isChild ? "This is a CHILD - DO NOT AGE UP. " : ""}Maintain exact facial features, expression, pose, clothing, and background composition.`;
    
    console.log("GPT-Image-1 프롬프트 구조:", 
      "1. 스타일 요청", 
      "2. 시스템 지침 (있는 경우)",
      "3. 특성 보존 지침");
    
    // 새로운 GPT-Image-1 API 호출 (원본 이미지와 프롬프트 함께 전송)
    return await callGptImage1Api(finalPrompt, imageBuffer);
  } catch (error) {
    console.error("멀티모달 이미지 변환 중 오류:", error);
    return SERVICE_UNAVAILABLE;
  }
}

/**
 * GPT-Image-1으로 직접 이미지 생성 요청 보내기
 * (새 이미지 생성용 - 원본 이미지 없이 프롬프트만으로 생성)
 */
async function callGptImage1ForNewImage(prompt: string): Promise<string> {
  if (!isValidApiKey(API_KEY)) {
    console.log("유효한 API 키가 없습니다");
    return SERVICE_UNAVAILABLE;
  }

  try {
    // API 요청 헤더 및 바디 구성
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    };
    
    // 프롬프트 검증: 빈 프롬프트 또는 undefined인 경우 로그 출력
    if (!prompt || prompt.trim() === '') {
      console.error("GPT-Image-1 API 호출 오류: 프롬프트가 비어 있습니다!");
      return SERVICE_UNAVAILABLE;
    }
    
    console.log("=== GPT-Image-1 API에 전송되는 최종 프롬프트 ===");
    console.log(prompt);
    console.log("=== GPT-Image-1 API 프롬프트 종료 ===");
    console.log("프롬프트 길이:", prompt.length);
    
    const body = {
      model: "gpt-image-1",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "high"
    };
    
    // 디버깅용 로그 추가
    console.log("🔥 이미지 생성 요청 모델:", body.model);
    console.log("🔥 사용된 프롬프트:", prompt);
    
    // API 호출
    const response = await fetch(OPENAI_IMAGE_CREATION_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });
    
    // 응답 텍스트로 가져오기
    const responseText = await response.text();
    
    // JSON 파싱 시도
    let responseData: OpenAIImageGenerationResponse;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error("응답 JSON 파싱 오류:", e);
      console.error("원본 응답:", responseText);
      return SERVICE_UNAVAILABLE;
    }
    
    // 오류 응답 확인
    if (!response.ok || responseData.error) {
      const errorMessage = responseData.error?.message || `HTTP 오류: ${response.status}`;
      console.error("DALL-E 3 API 오류:", errorMessage);
      return SERVICE_UNAVAILABLE;
    }
    
    // 응답 데이터 검증
    if (!responseData.data || responseData.data.length === 0) {
      console.error("이미지 데이터가 없습니다");
      return SERVICE_UNAVAILABLE;
    }
    
    // 세부 로깅으로 데이터 구조 파악
    console.log("이미지 데이터 첫 번째 항목 구조:", JSON.stringify({
      hasData: !!responseData.data[0],
      hasUrl: !!responseData.data[0]?.url,
      hasBase64: !!responseData.data[0]?.b64_json,
      hasRevisedPrompt: !!responseData.data[0]?.revised_prompt,
      allKeys: Object.keys(responseData.data[0] || {})
    }, null, 2));
    
    // 이미지 URL 또는 base64 데이터 가져오기
    let imageUrl = responseData.data[0]?.url;
    const base64Data = responseData.data[0]?.b64_json;
    
    // base64 데이터가 있고 URL이 없는 경우, base64 데이터를 URL로 변환
    if (!imageUrl && base64Data) {
      console.log("이미지 URL이 없고 base64 데이터가 있습니다. base64 데이터를 사용합니다.");
      // base64 데이터를 데이터 URL로 변환
      imageUrl = `data:image/png;base64,${base64Data}`;
      console.log("base64 데이터 URL 생성 완료:", imageUrl.substring(0, 50) + "...");
    }
    
    if (!imageUrl) {
      console.error("이미지 URL과 base64 데이터가 모두 없습니다");
      return SERVICE_UNAVAILABLE;
    }
    
    return imageUrl;
  } catch (error) {
    console.error("API 호출 중 오류:", error);
    return SERVICE_UNAVAILABLE;
  }
}

/**
 * 새로운 이미지 생성 (GPT-Image-1)
 */
export async function generateImage(promptText: string): Promise<string> {
  console.log("GPT-Image-1로 이미지 생성 시도 (직접 API 호출)");
  
  try {
    // 새 이미지 생성용 GPT-Image-1 API 호출
    const imageUrl = await callGptImage1ForNewImage(promptText);
    
    if (imageUrl !== SERVICE_UNAVAILABLE) {
      console.log("GPT-Image-1 이미지 생성 성공");
    }
    
    return imageUrl;
  } catch (error) {
    console.error("이미지 생성 중 오류 발생:", error);
    return SERVICE_UNAVAILABLE;
  }
}

/**
 * 이미지 변환/스타일 변경 (GPT-4o Vision + gpt-image-1)
 * 원본 이미지를 참조하여 이미지 변환 수행
 */
export async function transformImage(
  imageBuffer: Buffer,
  style: string,
  customPromptTemplate?: string | null,
  systemPrompt?: string | null
): Promise<string> {
  // 실패 시 재시도 카운터
  let retryCount = 0;
  const maxRetries = 2;
  try {
    // 기본 스타일별 프롬프트 템플릿 (관리자 페이지에서 오버라이드되므로 실제로는 사용되지 않음)
    // 해당 기능은 관리자 페이지의 '컨셉' 설정으로 대체되었습니다
    const stylePrompts: Record<string, string> = {
      watercolor: "Transform this image into a beautiful watercolor painting with soft colors",
      sketch: "Convert this image into a detailed pencil sketch with elegant lines",
      cartoon: "Transform this image into a charming cartoon style with bold outlines",
      oil: "Convert this image into a classic oil painting style with rich textures",
      fantasy: "Transform this image into a magical fantasy art style with dreamlike qualities",
      storybook: "Convert this image into a sweet children's storybook illustration style",
      ghibli: "Transform this image into a drawing with gentle colors and warm textures",
      gibli: "Transform this image into a drawing with gentle colors and warm textures",
      disney: "Transform this image into a cheerful illustration with expressive details",
      korean_webtoon: "Transform this image into a Korean webtoon style with clean lines",
      fairytale: "Transform this image into a fairytale illustration with magical elements"
    };

    // 저작권 주의가 필요한 콘텐츠 감지를 위한 프롬프트 수정
    // 프롬프트 선택 (커스텀 또는 빈 프롬프트 유지)
    let promptText: string = "";
    
    // 커스텀 프롬프트가 있고 빈 문자열이 아닌 경우에만 사용
    if (customPromptTemplate && customPromptTemplate.trim() !== "") {
      console.log("커스텀 프롬프트 템플릿 사용");
      promptText = customPromptTemplate;
      
      // 저작권 관련 키워드가 있는지 검사
      const copyrightTerms = ["ghibli", "disney", "pixar", "marvel", "studio", "anime", "character"];
      for (const term of copyrightTerms) {
        if (promptText.toLowerCase().includes(term)) {
          // 저작권 관련 용어를 일반적인 표현으로 대체
          console.log(`저작권 관련 용어 '${term}' 감지, 일반 표현으로 대체`);
          promptText = promptText.replace(/\b(ghibli|disney|pixar|marvel|studio|anime|character)\b/gi, "artistic illustration");
        }
      }
    } else if (style && stylePrompts[style]) {
      console.log(`스타일 템플릿 사용: ${style}`);
      promptText = stylePrompts[style];
    } else {
      console.log("빈 프롬프트 사용: 프롬프트 없이 GPT-4o Vision 분석만 진행");
    }

    // 안전 필터 문제를 방지하기 위한 추가 지침
    promptText += "\nAvoid copyright concerns. Create a generic illustration that captures the essence without infringing on any intellectual property.";
    
    console.log("GPT-4o Vision + gpt-image-1로 이미지 변환 시도 (원본 이미지 참조)");
    
    // 이미지 변환 시도 (최대 재시도 횟수까지)
    let imageUrl = "";
    let safetyError = false;
    
    while (retryCount <= maxRetries) {
      try {
        // 원본 이미지를 참조하여 변환 (GPT-4o의 Vision 기능으로 분석 후 gpt-image-1로 변환)
        imageUrl = await callGPT4oVisionAndImage1(imageBuffer, promptText, systemPrompt, style);
        
        // 안전 시스템 오류 확인
        if (imageUrl.includes("safety_system")) {
          console.log(`안전 시스템 오류 발생 (시도 ${retryCount + 1}/${maxRetries + 1})`);
          safetyError = true;
          
          // 프롬프트 수정 및 재시도
          promptText = "Create a simple artistic illustration inspired by this image. Focus on colors and shapes only, avoiding specific details.";
          retryCount++;
          
          // 마지막 시도인 경우 다른 스타일로 시도
          if (retryCount === maxRetries) {
            console.log("마지막 시도: 완전히 중립적인 스타일로 변경");
            promptText = "Transform this image into a simple watercolor painting with abstract elements. Keep it generic and avoid any recognizable characters or copyrighted elements.";
          }
        } else {
          // 성공했거나 안전 시스템 이외의 오류인 경우 루프 종료
          break;
        }
      } catch (retryError) {
        console.error(`재시도 중 오류 (시도 ${retryCount + 1}/${maxRetries + 1}):`, retryError);
        retryCount++;
        
        if (retryCount > maxRetries) {
          break;
        }
      }
    }
    
    if (imageUrl !== SERVICE_UNAVAILABLE && !imageUrl.includes("safety_system")) {
      console.log("이미지 변환 성공 (GPT-4o Vision + gpt-image-1)");
    }
    
    return imageUrl;
  } catch (error) {
    console.error("이미지 변환 중 오류 발생:", error);
    return SERVICE_UNAVAILABLE;
  }
}