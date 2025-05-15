/**
 * ACE-Step 모델 직접 호출 서비스
 * Replicate API를 직접 호출하는 방식으로 구현
 */

// 성공적인 테스트 결과를 기반으로 최적화된 Replicate API 호출 구현
export interface AceStepInput {
  tags: string;
  lyrics: string;
  duration: number;
}

/**
 * ACE-Step 모델을 사용하여 음악 생성 (직접 fetch API 사용)
 * 이 구현은 테스트를 통해 정확한 API 호출 방식으로 확인됨
 * 
 * @param input 음악 생성 입력 파라미터
 * @returns 생성된 음악 URL
 */
export async function generateMusicWithAceStep(input: AceStepInput): Promise<string> {
  try {
    console.log('===== ACE-Step 음악 생성 시작 =====');
    const startTime = Date.now();
    
    // 1. API 요청 준비
    const url = 'https://api.replicate.com/v1/predictions';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`  // Token 접두사 필요
    };
    
    // 2. 요청 데이터 준비 - 직접 테스트에서 성공한 형식 그대로 사용
    const requestData = {
      version: "280fc4f9ee507577f880a167f639c02622421d8fecf492454320311217b688f1",
      input: {
        tags: input.tags,
        lyrics: input.lyrics,
        duration: input.duration
      }
    };
    
    console.log("Replicate API 요청 데이터:", JSON.stringify(requestData, null, 2));
    
    // 3. API 호출
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestData)
    });
    
    // 4. 응답 확인
    const responseData = await response.json();
    console.log("API 응답 상태:", response.status, response.statusText);
    console.log("API 응답 데이터:", JSON.stringify(responseData, null, 2));
    
    if (!response.ok) {
      throw new Error(`API 오류: ${response.status} ${response.statusText} - ${JSON.stringify(responseData)}`);
    }
    
    // 5. 결과를 얻기 위한 폴링 (Replicate API는 비동기식 작업 생성)
    console.log("음악 생성 작업 시작됨, ID:", responseData.id);
    
    // 최대 10번, 3초 간격으로 확인
    const getUrl = responseData.urls.get;
    
    for (let i = 0; i < 10; i++) {
      console.log(`결과 확인 시도 ${i+1}/10...`);
      
      // 3초 대기
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 상태 확인
      const statusResponse = await fetch(getUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`
        }
      });
      
      if (!statusResponse.ok) {
        console.error(`상태 확인 실패: ${statusResponse.status} ${statusResponse.statusText}`);
        continue;
      }
      
      const statusData = await statusResponse.json();
      console.log("현재 상태:", statusData.status);
      
      // 성공했으면 결과 반환
      if (statusData.status === 'succeeded' && statusData.output) {
        console.log("음악 생성 완료:", ((Date.now() - startTime) / 1000).toFixed(2) + "초 소요");
        return statusData.output;
      }
      
      // 오류가 발생했으면 예외 발생
      if (statusData.status === 'failed') {
        throw new Error(`음악 생성 실패: ${statusData.error || '알 수 없는 오류'}`);
      }
      
      // 아직 처리 중이면 계속 대기
      console.log("처리 중... 상태:", statusData.status);
    }
    
    // 최대 시도 횟수를 초과하면 타임아웃으로 간주
    throw new Error("음악 생성 타임아웃: 처리 시간이 너무 깁니다.");
  }
  catch (error: any) {
    console.error("ACE-Step 음악 생성 중 오류 발생:", error);
    throw error;
  }
}