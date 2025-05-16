// 간단한 Replicate API 테스트
const Replicate = require('replicate');

// API 키 확인
if (!process.env.REPLICATE_API_TOKEN) {
  console.error('REPLICATE_API_TOKEN이 설정되지 않았습니다.');
  process.exit(1);
}

// 클라이언트 초기화
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

// 간단한 모델 테스트 (텍스트 생성)
async function testSimpleModel() {
  try {
    console.log('간단한 Replicate API 테스트 시작...');
    
    // 가장 간단한 모델 호출 (텍스트 생성)
    const output = await replicate.run(
      "meta/llama-2-70b-chat:02e509c789964a7ea8736978a43525956ef40397be9033abf9fd2badfe68c9e3",
      {
        input: {
          prompt: "Write a short lullaby poem for a baby",
          max_new_tokens: 100,
          temperature: 0.7,
        }
      }
    );
    
    console.log('API 응답 성공:', output);
    return output;
  } catch (error) {
    console.error('API 호출 실패:', error);
    return null;
  }
}

// 테스트 실행
testSimpleModel()
  .then(result => {
    if (result) {
      console.log('API 테스트 성공!');
    } else {
      console.log('API 테스트 실패. 다른 해결책이 필요합니다.');
    }
  })
  .catch(err => {
    console.error('테스트 실행 오류:', err);
  });