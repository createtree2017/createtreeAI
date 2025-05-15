// 직접 fetch를 사용한 Replicate API 테스트
import fetch from 'node-fetch';

async function testReplicate() {
  try {
    // API 키 가져오기
    const apiKey = process.env.REPLICATE_API_TOKEN;
    if (!apiKey) {
      throw new Error('REPLICATE_API_TOKEN 환경변수가 설정되지 않았습니다.');
    }

    console.log('===== API 직접 호출 시작 =====');
    
    // 1. 공식 API 형식으로 요청
    const url = 'https://api.replicate.com/v1/predictions';
    
    // 헤더 설정
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Token ${apiKey}`
    };
    
    // 가장 기본적인 요청 본문
    const requestData = {
      version: "280fc4f9ee507577f880a167f639c02622421d8fecf492454320311217b688f1",
      input: {
        // 가장 기본적인 입력만 테스트
        tags: "electronic, test",
        lyrics: "[verse]\nTest test\n[chorus]\nTest",
        duration: 10
      }
    };

    console.log('요청 데이터:', JSON.stringify(requestData, null, 2));
    
    // API 요청
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestData)
    });
    
    // 응답 처리
    const responseData = await response.json();
    console.log('응답 상태:', response.status, response.statusText);
    console.log('응답 데이터:', JSON.stringify(responseData, null, 2));
    
    if (response.ok) {
      console.log('API 호출 성공!');
      
      // 비동기 작업 완료 확인하기
      if (responseData.status === 'succeeded') {
        console.log('생성된 음악 URL:', responseData.output);
      } else if (responseData.status === 'processing') {
        console.log('음악 생성 중... 나중에 결과 확인 필요');
        console.log('상태 확인 URL:', responseData.urls?.get);
      }
    } else {
      console.error('API 호출 실패:', responseData);
      
      // 오류 상세 정보 확인
      if (responseData.detail) {
        console.error('오류 상세:', responseData.detail);
      }
    }
  } catch (error) {
    console.error('테스트 실행 중 오류 발생:', error);
  }
}

// 실행
testReplicate().then(() => {
  console.log('테스트 완료');
});