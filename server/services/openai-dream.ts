import fetch from 'node-fetch';

// 로깅 유틸리티 함수 직접 구현
function logDebug(message: string, ...args: any[]): void {
  console.debug(`[DEBUG] ${message}`, ...args);
}

function logError(message: string, ...args: any[]): void {
  console.error(`[ERROR] ${message}`, ...args);
}

function logInfo(message: string, ...args: any[]): void {
  console.info(`[INFO] ${message}`, ...args);
}

// OpenAI API 키 설정
const API_KEY = process.env.OPENAI_API_KEY;

// API 키 유효성 검증 - 프로젝트 API 키 지원 추가 (sk-proj- 시작)
function isValidApiKey(apiKey: string | undefined): boolean {
  return !!apiKey && (apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-'));
}

// OpenAI API 엔드포인트
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_IMAGE_CREATION_URL = "https://api.openai.com/v1/images/generations";

// 스타일 이름을 표준화된 키워드로 변환하는 함수
async function getStyleKeyword(style: string): Promise<string> {
  const styleLower = style.toLowerCase().trim();
  
  // 스타일 매핑 테이블
  const styleMap: {[key: string]: string} = {
    'ghibli': 'Studio Ghibli style',
    '지브리풍': 'Studio Ghibli style',
    '지브리': 'Studio Ghibli style',
    
    'disney': 'Disney animation style',
    '디즈니풍': 'Disney animation style',
    '디즈니': 'Disney animation style',
    
    'watercolor': 'Watercolor painting style',
    '수채화풍': 'Watercolor painting style',
    '수채화': 'Watercolor painting style',
    
    'realistic': 'Realistic detailed style',
    '사실적': 'Realistic detailed style',
    
    'korean': 'Traditional Korean painting style',
    '전통 한국화': 'Traditional Korean painting style',
    '한국화': 'Traditional Korean painting style'
  };
  
  // 스타일 매핑 테이블에 있는 경우
  for (const [key, value] of Object.entries(styleMap)) {
    if (styleLower.includes(key)) {
      return value;
    }
  }
  
  // 찾지 못한 경우 원래 스타일 이름 그대로 반환
  return style;
}

// API 응답 타입 정의
interface OpenAIChatResponse {
  id?: string;
  choices?: Array<{
    message: {
      role: string;
      content: string;
    };
    index?: number;
  }>;
  error?: {
    message: string;
    type: string;
    code?: string;
  };
}

interface OpenAIImageGenerationResponse {
  created?: number;
  data?: Array<{
    url?: string;
    revised_prompt?: string;
  }>;
  error?: {
    message: string;
    type: string;
    code?: string;
  };
}

// 중복 함수 제거

/**
 * 태몽 내용을 바탕으로 동화 줄거리 생성
 */
// 안전한 문자열 처리를 위한 유틸리티 함수
function safeStringForJSON(input: string): string {
  if (!input) return '';
  // 특수 문자들을 이스케이프 처리
  return input
    .replace(/\\/g, '\\\\')    // 백슬래시
    .replace(/"/g, '\\"')      // 큰따옴표
    .replace(/\n/g, '\\n')     // 줄바꿈
    .replace(/\r/g, '\\r')     // 캐리지 리턴
    .replace(/\t/g, '\\t')     // 탭
    .replace(/\f/g, '\\f');    // 폼 피드
}

export async function generateDreamStorySummary(
  dreamer: string,
  babyName: string,
  dreamContent: string
): Promise<string> {
  // 입력 문자열 안전하게 처리
  const safeDreamer = safeStringForJSON(dreamer);
  const safeBabyName = safeStringForJSON(babyName);
  const safeDreamContent = safeStringForJSON(dreamContent);
  try {
    // 입력값 유효성 검사 및 로깅
    if (!dreamer || !babyName || !dreamContent) {
      logError('태몽 줄거리 생성 입력값 누락', { 
        hasDreamer: !!dreamer, 
        hasBabyName: !!babyName, 
        hasDreamContent: !!dreamContent,
        dreamContentLength: dreamContent?.length || 0
      });
      throw new Error('모든 입력값(꿈꾼이, 아기 이름, 태몽 내용)이 필요합니다.');
    }

    // API 키 유효성 검증
    if (!isValidApiKey(API_KEY)) {
      logError('유효한 API 키가 없습니다');
      throw new Error('유효한 OpenAI API 키가 필요합니다.');
    }

    logDebug('태몽 줄거리 생성 시작', { 
      dreamer, 
      babyName, 
      dreamContentLength: dreamContent.length 
    });

    // OpenAI API 요청 준비
    const systemPrompt = `당신은 태몽을 기반으로 아기를 위한 짧은 동화 줄거리를 만드는 전문가입니다. 
    태몽은 한국 문화에서 임신 중에 꾸는 특별한 꿈으로, 아기의 미래나 특성을 예견한다고 믿어집니다.
    아래 내용을 바탕으로 긍정적이고 희망적인 동화 줄거리를 3-4문단으로 작성해주세요.
    문체는 따뜻하고 아이에게 읽어주기 좋은 스타일로 작성하세요.
    '옛날 옛적에'로 시작하는 전통적인 동화 형식을 사용하세요.
    꿈 내용에 부정적인 요소가 있더라도 이를 긍정적으로 재해석하여 아름다운 이야기로 만들어주세요.`;
    
    const userPrompt = `꿈을 꾼 사람: ${safeDreamer}
    아기 이름: ${safeBabyName}
    꿈 내용: ${safeDreamContent}`;

    // API 요청 준비
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    };
    
    const requestBody = {
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    };

    logInfo('OpenAI 호출 준비됨', { 
      modelUsed: 'gpt-4o',
      promptLength: systemPrompt.length + userPrompt.length,
      apiKeyPrefix: API_KEY ? API_KEY.substring(0, 10) + '...' : 'undefined'
    });

    // API 직접 호출 (fetch 사용)
    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });
    
    // 응답 텍스트로 가져오기
    const responseText = await response.text();
    
    // JSON 파싱 시도
    let openaiResponse: OpenAIChatResponse;
    try {
      openaiResponse = JSON.parse(responseText);
      
      // 오류 응답 확인
      if (openaiResponse.error) {
        logError('OpenAI API 오류 응답', {
          message: openaiResponse.error.message,
          type: openaiResponse.error.type,
          code: openaiResponse.error.code
        });
        throw new Error(`OpenAI API 오류: ${openaiResponse.error.message}`);
      }
      
      // 응답 구조 로깅 (민감 정보 제외)
      logInfo('OpenAI 응답 수신됨', {
        status: response.status,
        hasChoices: !!openaiResponse.choices?.length,
        choicesCount: openaiResponse.choices?.length || 0
      });
      
      // 응답 내용 추출
      if (!openaiResponse.choices || openaiResponse.choices.length === 0) {
        throw new Error('OpenAI 응답에 유효한 내용이 없습니다.');
      }
      
      const summary = openaiResponse.choices[0]?.message?.content?.trim() || '태몽 내용을 바탕으로 한 아름다운 이야기';
      
      logDebug('태몽 줄거리 생성 완료', { length: summary.length });
      return summary;
      
    } catch (parseError) {
      logError('OpenAI 응답 파싱 오류', { 
        error: parseError, 
        responseStatus: response.status,
        responseText: responseText.substring(0, 200) + '...' // 응답 일부만 로깅
      });
      throw new Error('OpenAI 응답을 파싱할 수 없습니다.');
    }
    
  } catch (error: any) {
    // 최상위 오류 캐치
    logError('태몽 줄거리 생성 처리 중 오류:', error);
    
    // 구체적인 오류 메시지 생성
    let errorMessage = '태몽 줄거리를 생성하는 중 오류가 발생했습니다.';
    
    // 오류 타입에 따른 메시지
    if (error.message?.includes('invalid_api_key')) {
      errorMessage = 'OpenAI API 키가 유효하지 않습니다.';
    } else if (error.message?.includes('invalid_project')) {
      errorMessage = 'OpenAI 프로젝트 설정이 잘못되었습니다. 조직 ID를 확인해주세요.';
    } else if (error.message?.includes('rate_limit_exceeded')) {
      errorMessage = 'OpenAI API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
    } else if (error.message?.includes('401')) {
      errorMessage = 'OpenAI API 인증에 실패했습니다. API 키를 확인해주세요.';
    }
    
    throw new Error(`${errorMessage} (${error.message || '알 수 없는 오류'})`);
  }
}

/**
 * 태몽 내용을 바탕으로 4개의 장면 생성
 * @param dreamContent 태몽 내용
 * @param style 스타일 이름
 * @param customSystemPrompt 스타일 별 커스텀 시스템 프롬프트 (DB에서 가져온 값)
 */
export async function generateDreamScenes(
  dreamContent: string,
  style: string,
  customSystemPrompt?: string
): Promise<string[]> {
  // 입력 문자열 안전하게 처리
  const safeDreamContent = safeStringForJSON(dreamContent);
  const safeStyle = safeStringForJSON(style);
  const safeCustomSystemPrompt = customSystemPrompt ? safeStringForJSON(customSystemPrompt) : '';
  try {
    // API 키 유효성 검증
    if (!isValidApiKey(API_KEY)) {
      logError('유효한 API 키가 없습니다');
      throw new Error('유효한 OpenAI API 키가 필요합니다.');
    }

    logDebug('태몽 장면 생성 시작', { style });

    // API 요청 준비
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    };
    
    // 데이터베이스에서 가져온 스타일 이름에서 적절한 키워드 추출
    const styleLower = style.toLowerCase().trim();
    let styleKeyword = style;
    
    // 스타일 매핑 테이블
    const styleMap: {[key: string]: string} = {
      'ghibli': 'Studio Ghibli style',
      '지브리풍': 'Studio Ghibli style',
      '지브리': 'Studio Ghibli style',
      
      'disney': 'Disney animation style',
      '디즈니풍': 'Disney animation style',
      '디즈니': 'Disney animation style',
      
      'watercolor': 'Watercolor painting style',
      '수채화풍': 'Watercolor painting style',
      '수채화': 'Watercolor painting style',
      
      'realistic': 'Realistic detailed style',
      '사실적': 'Realistic detailed style',
      
      'korean': 'Traditional Korean painting style',
      '전통 한국화': 'Traditional Korean painting style',
      '한국화': 'Traditional Korean painting style'
    };
    
    // 스타일 매핑 테이블에서 키워드 찾기
    for (const [key, value] of Object.entries(styleMap)) {
      if (styleLower.includes(key)) {
        styleKeyword = value;
        break;
      }
    }
    
    logInfo('스타일 변환', { 원래스타일: style, 변환스타일: styleKeyword });
    
    // 커스텀 프롬프트 사용 또는 기본 프롬프트 생성
    let systemContent = '';
    
    if (customSystemPrompt) {
      // 데이터베이스에서 가져온 시스템 프롬프트 사용
      logInfo('커스텀 시스템 프롬프트 사용', { length: customSystemPrompt.length });
      systemContent = safeCustomSystemPrompt;
    } else {
      // 기본 프롬프트 생성
      systemContent = "당신은 태몽을 기반으로 DALL-E로 생성할 4개의 이미지 프롬프트를 작성하는 전문가입니다. "
        + "태몽은 한국 문화에서 임신 중에 꾸는 특별한 꿈으로, 아기의 미래나 특성을 예견한다고 믿어집니다. "
        + "아래 내용을 바탕으로 동화책의 각 장면에 해당하는 4개의 이미지 프롬프트를 작성해주세요. "
        + "각 프롬프트는 DALL-E가 시각적으로 아름답고 디테일한 이미지를 생성할 수 있도록 충분히 상세해야 합니다. "
        + "\n\n프롬프트 앞에는 반드시 스타일 설명을 포함해야 합니다: \"" + styleKeyword + ", high quality, detailed, soft lighting\" "
        + "\n\n각 장면은 스토리의 논리적 흐름을 따라야 합니다: "
        + "\n장면 1: 이야기의 시작과 주인공 소개 "
        + "\n장면 2: 이야기의 전개와 도전/어려움의 등장 "
        + "\n장면 3: 문제 해결을 위한 노력이나 결정적 순간 "
        + "\n장면 4: 행복한 결말 "
        + "\n\n결과는 JSON 형식이 아닌 각 프롬프트를 별도 줄에 작성해 주세요. "
        + "\n각 프롬프트는 한국어와 영어를 혼합하여 작성하되, 영어 비중을 더 높게 해주세요. "
        + "\n각 프롬프트는 최대 400자를 넘지 않도록 해주세요.";
    }

    const userContent = `태몽 내용: ${safeDreamContent}
    원하는 스타일: ${safeStyle}`;

    const requestBody = {
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: userContent }
      ],
      max_tokens: 1500,
      temperature: 0.7,
    };

    logInfo('OpenAI 장면 생성 호출 준비됨', { 
      modelUsed: 'gpt-4o',
      promptLength: systemContent.length + userContent.length
    });

    // API 직접 호출 (fetch 사용)
    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });
    
    // 응답 텍스트로 가져오기
    const responseText = await response.text();
    
    // JSON 파싱 시도
    let openaiResponse: OpenAIChatResponse;
    try {
      openaiResponse = JSON.parse(responseText);
      
      // 오류 응답 확인
      if (openaiResponse.error) {
        logError('OpenAI API 오류 응답', {
          message: openaiResponse.error.message,
          type: openaiResponse.error.type,
          code: openaiResponse.error.code
        });
        throw new Error(`OpenAI API 오류: ${openaiResponse.error.message}`);
      }
      
      // 응답 구조 로깅 (민감 정보 제외)
      logInfo('OpenAI 장면 응답 수신됨', {
        status: response.status,
        hasChoices: !!openaiResponse.choices?.length,
        choicesCount: openaiResponse.choices?.length || 0
      });
      
      // 응답 내용 추출
      if (!openaiResponse.choices || openaiResponse.choices.length === 0) {
        throw new Error('OpenAI 응답에 유효한 내용이 없습니다.');
      }
      
      const content = openaiResponse.choices[0]?.message?.content?.trim() || '';
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
      
    } catch (parseError) {
      logError('OpenAI 응답 파싱 오류', { 
        error: parseError, 
        responseStatus: response.status,
        responseText: responseText.substring(0, 200) + '...' // 응답 일부만 로깅
      });
      throw new Error('OpenAI 응답을 파싱할 수 없습니다.');
    }
    
  } catch (error: any) {
    // 최상위 오류 캐치
    logError('태몽 장면 생성 오류:', error);
    throw new Error(`태몽 장면을 생성하는 중 오류가 발생했습니다. (${error.message || '알 수 없는 오류'})`);
  }
}

/**
 * 프롬프트를 기반으로 이미지 생성
 */
export async function generateDreamImage(prompt: string): Promise<string> {
  // 입력 문자열 안전하게 처리
  const safePrompt = safeStringForJSON(prompt);
  try {
    // 입력값 유효성 검사
    if (!prompt || prompt.length < 10) {
      logError('이미지 생성 프롬프트 무효', { 
        promptExists: !!prompt, 
        promptLength: prompt?.length || 0 
      });
      throw new Error('유효한 이미지 생성 프롬프트가 필요합니다.');
    }

    // API 키 유효성 검증
    if (!isValidApiKey(API_KEY)) {
      logError('유효한 API 키가 없습니다');
      throw new Error('유효한 OpenAI API 키가 필요합니다.');
    }

    logDebug('태몽 이미지 생성 시작', { 
      promptLength: prompt.length,
      promptFirstChars: prompt.substring(0, 30) + '...',
    });

    // API 요청 준비
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    };
    
    // 프롬프트 길이 제한 및 안전한 내용으로 필터링
    let processedPrompt = safePrompt;
    
    // 프롬프트가 너무 길면 자르기 (DALL-E는 약 4000자 제한)
    if (processedPrompt.length > 3800) {
      processedPrompt = processedPrompt.substring(0, 3800);
      logInfo('프롬프트 길이 제한', { original: prompt.length, truncated: processedPrompt.length });
    }
    
    // 안전한 이미지 생성 요청 구성
    const requestBody = {
      model: "dall-e-3",
      prompt: processedPrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "vivid" // "natural"로 변경하면 더 사실적인 스타일
    };
    
    // 디버깅을 위해 프롬프트 출력 (로그 축소를 위해 앞부분만)
    logInfo('🧠 이미지 생성 프롬프트 미리보기', { 
      promptStart: processedPrompt.substring(0, 100) + '...',
      promptEnd: '...' + processedPrompt.substring(processedPrompt.length - 100),
      totalLength: processedPrompt.length
    });
    
    logInfo('DALL-E API 호출 준비됨', {
      model: 'dall-e-3',
      promptLength: prompt.length
    });

    // API 직접 호출 (fetch 사용)
    const response = await fetch(OPENAI_IMAGE_CREATION_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });
    
    // 응답 텍스트로 가져오기
    const responseText = await response.text();
    
    // JSON 파싱 시도
    let openaiResponse: OpenAIImageGenerationResponse;
    try {
      openaiResponse = JSON.parse(responseText);
      
      // 오류 응답 확인
      if (openaiResponse.error) {
        logError('DALL-E API 오류 응답', {
          message: openaiResponse.error.message,
          type: openaiResponse.error.type,
          code: openaiResponse.error.code
        });
        
        // 오류 유형별 적절한 메시지 생성
        let errorMessage = '이미지 생성 중 오류가 발생했습니다.';
        
        if (openaiResponse.error.code === 'content_policy_violation') {
          errorMessage = '프롬프트가 OpenAI 콘텐츠 정책을 위반합니다. 다른 내용으로 시도해주세요.';
        } else if (openaiResponse.error.code === 'rate_limit_exceeded') {
          errorMessage = 'DALL-E API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
        } else if (response.status === 401) {
          errorMessage = 'DALL-E API 인증에 실패했습니다. API 키를 확인해주세요.';
        } else if (response.status === 429) {
          errorMessage = 'DALL-E API 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
        }
        
        throw new Error(`${errorMessage} (${openaiResponse.error.message})`);
      }
      
      // 응답 구조 로깅 (민감 정보 제외)
      logInfo('DALL-E 응답 성공', {
        status: response.status,
        hasData: !!openaiResponse.data,
        dataLength: openaiResponse.data?.length || 0,
        created: openaiResponse.created
      });
      
      // 응답에서 이미지 URL 안전하게 추출
      if (!openaiResponse.data || !Array.isArray(openaiResponse.data) || openaiResponse.data.length === 0) {
        throw new Error('DALL-E 응답에 유효한 데이터가 없습니다.');
      }
      
      const imageData = openaiResponse.data[0];
      if (!imageData || !imageData.url) {
        throw new Error('DALL-E 응답에 이미지 URL이 없습니다.');
      }
      
      const imageUrl = imageData.url;
      logInfo('이미지 URL 추출 성공', { urlLength: imageUrl.length });
      
      return imageUrl;
      
    } catch (parseError: any) {
      logError('DALL-E 응답 파싱 오류', { 
        error: parseError, 
        responseStatus: response.status,
        responseText: responseText.substring(0, 200) + '...' // 응답 일부만 로깅
      });
      throw new Error(`DALL-E 응답을 파싱할 수 없습니다. (${parseError.message || '알 수 없는 오류'})`);
    }
  } catch (error: any) {
    // 최상위 오류 처리
    logError('태몽 이미지 생성 처리 중 오류:', error);
    if (error.message) {
      throw error; // 이미 형식화된 오류 메시지는 그대로 전달
    } else {
      throw new Error('태몽 이미지 생성 중 알 수 없는 오류가 발생했습니다.');
    }
  }
}