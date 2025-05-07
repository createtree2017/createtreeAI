// 테스트용 스크립트

const { testReplicateAPI } = require('./server/test-replicate');

async function runTest() {
  console.log("Replicate API 테스트 시작...");
  
  try {
    const result = await testReplicateAPI();
    console.log("테스트 결과:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("테스트 실패:", error);
  }
}

runTest();