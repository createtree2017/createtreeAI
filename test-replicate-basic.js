// Replicate API 기본 테스트 스크립트
import Replicate from "replicate";

// Replicate API 클라이언트 초기화
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// 현재 API 토큰 확인
console.log("Replicate API 토큰:", process.env.REPLICATE_API_TOKEN ? "설정됨" : "설정되지 않음");
console.log("API 토큰 일부 확인:", process.env.REPLICATE_API_TOKEN ? 
  `${process.env.REPLICATE_API_TOKEN.substring(0, 5)}...${process.env.REPLICATE_API_TOKEN.substring(process.env.REPLICATE_API_TOKEN.length - 5)}` : 
  "없음");

// 가장 기본적인 Replicate 모델 테스트 - 텍스트 생성 모델
async function testBasicModel() {
  try {
    console.log("기본 Replicate 모델 테스트 시작...");
    // 기본 텍스트 모델 테스트
    const output = await replicate.run(
      "replicate/hello-world:5c7d5dc6dd8bf75c1acaa8565735e7986bc5b66206b55cca93cb72c9bf15ccaa",
      {
        input: {
          text: "Hello, Replicate!"
        }
      }
    );
    
    console.log("텍스트 모델 테스트 성공 ✅");
    console.log("출력:", output);
    return true;
  } catch (error) {
    console.error("테스트 실패 ❌:", error);
    if (error.response) {
      console.error("응답 상태:", error.response.status);
      console.error("응답 데이터:", error.response.data);
    }
    return false;
  }
}

// 모델 리스트 가져오기 테스트
async function testListModels() {
  try {
    console.log("\n모델 리스트 가져오기 테스트...");
    const models = await replicate.models.list();
    console.log(`모델 리스트 가져오기 성공 ✅ (${models.length}개 모델 발견)`);
    return true;
  } catch (error) {
    console.error("모델 리스트 가져오기 실패 ❌:", error);
    return false;
  }
}

// 모든 테스트 실행
async function runAllTests() {
  let testResults = {
    basicModel: await testBasicModel(),
    listModels: await testListModels()
  };
  
  console.log("\n테스트 결과 요약:");
  console.log("- 기본 모델 테스트:", testResults.basicModel ? "성공 ✅" : "실패 ❌");
  console.log("- 모델 리스트 테스트:", testResults.listModels ? "성공 ✅" : "실패 ❌");
  
  return testResults.basicModel && testResults.listModels;
}

// 테스트 실행
runAllTests()
  .then(success => {
    console.log("\n최종 결과:", success ? "모든 테스트 성공 ✅" : "일부 테스트 실패 ❌");
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("\n테스트 실행 중 오류 발생:", error);
    process.exit(1);
  });