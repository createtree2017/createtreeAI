// OpenAI API 직접 테스트 파일
const { OpenAI } = require('openai');

async function testOpenAI() {
  try {
    console.log('환경 변수 확인:');
    console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '설정됨' : '없음');
    console.log('OPENAI_PROJECT_ID:', process.env.OPENAI_PROJECT_ID ? '설정됨' : '없음');
    console.log('OPENAI_ORGANIZATION_ID:', process.env.OPENAI_ORGANIZATION_ID ? '설정됨' : '없음');
    
    // OpenAI 클라이언트 직접 생성
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      // 다른 설정 없음
    });
    
    console.log('OpenAI 클라이언트 생성 성공');
    
    // 간단한 요청 테스트
    console.log('API 호출 테스트 시작...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "한 줄 가사 예시를 주세요." }
      ],
      max_tokens: 50
    });
    
    console.log('API 응답 성공!');
    console.log('응답 내용:', response.choices[0].message.content);
    return true;
  } catch (error) {
    console.error('OpenAI API 테스트 실패:', error);
    return false;
  }
}

// 스크립트 실행
testOpenAI().then(success => {
  console.log('테스트 결과:', success ? '성공' : '실패');
});