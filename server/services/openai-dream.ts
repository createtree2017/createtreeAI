import OpenAI from "openai";

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

// OpenAI 인스턴스 생성 (API 키 및 구성 로깅)
function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  // API 키 유효성 기본 검사
  if (!apiKey || !apiKey.startsWith('sk-')) {
    logError('OpenAI API 키가 유효하지 않습니다', { keyExists: !!apiKey, keyLength: apiKey?.length });
    throw new Error('유효한 OpenAI API 키가 필요합니다.');
  }

  // 키 정보 로깅 (키 자체는 로깅하지 않고 일부만 마스킹)
  const maskedKey = apiKey ? `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)}` : 'undefined';
  logInfo('OpenAI 클라이언트 생성', {
    apiKeyLength: apiKey?.length,
    apiKeyPrefix: maskedKey,
    hasMask: apiKey?.includes('****'),
  });

  return new OpenAI({ apiKey });
}

const openai = createOpenAIClient();

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
    
    const userPrompt = `꿈을 꾼 사람: ${dreamer}
    아기 이름: ${babyName}
    꿈 내용: ${dreamContent}`;

    logInfo('OpenAI 호출 준비됨', { 
      modelUsed: 'gpt-4o',
      promptLength: systemPrompt.length + userPrompt.length
    });

    // API 호출
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      // 응답 구조 로깅 (민감 정보 제외)
      logInfo('OpenAI 응답 수신됨', {
        status: 'success',
        hasChoices: !!response.choices?.length,
        choicesCount: response.choices?.length || 0,
        modelUsed: response.model,
        firstTokens: response.choices?.[0]?.message?.content?.substring(0, 30) + '...' || '(내용 없음)'
      });

      const summary = response.choices[0]?.message?.content?.trim() || '태몽 내용을 바탕으로 한 아름다운 이야기';
      
      logDebug('태몽 줄거리 생성 완료', { length: summary.length });
      return summary;
    } catch (error: any) {
      // OpenAI API 호출 오류 상세 로깅
      logError('OpenAI API 호출 실패', {
        errorMessage: error.message,
        errorType: error.type,
        errorCode: error.code,
        statusCode: error.status,
        requestId: error.request_id,
        errorDetail: error.error
      });
      
      // 오류 유형에 따른 메시지 생성
      let errorMessage = '태몽 줄거리를 생성하는 중 오류가 발생했습니다.';
      
      // 구체적인 오류 메시지 추가
      if (error.code === 'invalid_api_key') {
        errorMessage = 'OpenAI API 키가 유효하지 않습니다.';
      } else if (error.code === 'invalid_project') {
        errorMessage = 'OpenAI 프로젝트 설정이 잘못되었습니다. 조직 ID를 확인해주세요.';
      } else if (error.code === 'rate_limit_exceeded') {
        errorMessage = 'OpenAI API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.status === 401) {
        errorMessage = 'OpenAI API 인증에 실패했습니다. API 키를 확인해주세요.';
      }
      
      throw new Error(`${errorMessage} (${error.message})`);
    }
  } catch (error: any) {
    // 최상위 오류 캐치
    logError('태몽 줄거리 생성 처리 중 오류:', error);
    if (error.message) {
      throw error; // 이미 형식화된 오류 메시지
    } else {
      throw new Error('태몽 줄거리 생성 중 알 수 없는 오류가 발생했습니다.');
    }
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
    // 입력값 유효성 검사
    if (!prompt || prompt.length < 10) {
      logError('이미지 생성 프롬프트 무효', { 
        promptExists: !!prompt, 
        promptLength: prompt?.length || 0 
      });
      throw new Error('유효한 이미지 생성 프롬프트가 필요합니다.');
    }

    logDebug('태몽 이미지 생성 시작', { 
      promptLength: prompt.length,
      promptFirstChars: prompt.substring(0, 30) + '...',
    });

    try {
      // DALL-E API 호출
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "vivid",
      });

      // 응답 구조를 안전하게 로깅 (민감 정보 제외)
      try {
        const safeResponseInfo = {
          hasResponse: !!response,
          hasData: !!response?.data,
          dataLength: response?.data?.length || 0,
          created: response?.created ? new Date(response.created * 1000).toISOString() : null,
          hasUrl: !!response?.data?.[0]?.url
        };
        logInfo('DALL-E 응답 성공', safeResponseInfo);
      } catch (err) {
        logError('응답 로깅 처리 오류', err);
      }
      
      // 응답에서 이미지 URL 안전하게 추출
      if (!response || !response.data || !Array.isArray(response.data) || response.data.length === 0) {
        throw new Error('DALL-E 응답에 유효한 데이터가 없습니다.');
      }
      
      const imageData = response.data[0];
      if (!imageData || !imageData.url) {
        throw new Error('DALL-E 응답에 이미지 URL이 없습니다.');
      }
      
      const imageUrl = imageData.url;
      logInfo('이미지 URL 추출 성공', { urlLength: imageUrl.length });
      
      return imageUrl;
    } catch (error: any) {
      // DALL-E API 오류 처리 및 구체적 로깅
      logError('DALL-E API 호출 실패', {
        errorMessage: error.message,
        errorType: error.type,
        errorCode: error.code,
        statusCode: error.status,
        errorDetail: error.error
      });
      
      // 오류 유형별 적절한 메시지 생성
      let errorMessage = '이미지 생성 중 오류가 발생했습니다.';
      
      if (error.code === 'content_policy_violation') {
        errorMessage = '프롬프트가 OpenAI 콘텐츠 정책을 위반합니다. 다른 내용으로 시도해주세요.';
      } else if (error.code === 'rate_limit_exceeded') {
        errorMessage = 'DALL-E API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.status === 401) {
        errorMessage = 'DALL-E API 인증에 실패했습니다. API 키를 확인해주세요.';
      } else if (error.status === 429) {
        errorMessage = 'DALL-E API 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
      }
      
      // 더 상세한 정보를 위해 원본 오류 메시지 추가
      throw new Error(`${errorMessage} (${error.message || '알 수 없는 오류'})`);
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