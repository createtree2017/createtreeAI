// 단일 음악 생성 모델 테스트
import Replicate from "replicate";

// Replicate API 클라이언트 초기화
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// 테스트할 모델 - riffusion/riffusion 모델
const model = {
  id: "riffusion/riffusion",
  version: "8cf61ea6c56afd61d8f5b9ffd14d7c216c0a93276872bc0c2244abc00715c8ae",
  input: {
    prompt: "아기를 위한 편안한 자장가, 단순한 멜로디와 부드러운 보컬",
    negative_prompt: "",
    seed: 42,
    denoising: 0.75
  }
};

async function testSingleModel() {
  console.log("Replicate API 모델 테스트 시작");
  console.log("API 토큰:", process.env.REPLICATE_API_TOKEN ? "설정됨" : "설정되지 않음");
  
  try {
    console.log(`테스트 중: ${model.id} (버전: ${model.version})`);
    console.log("입력:", JSON.stringify(model.input, null, 2));
    
    const output = await replicate.run(
      `${model.id}:${model.version}`,
      { input: model.input }
    );
    
    console.log("출력:", JSON.stringify(output, null, 2));
    console.log(`${model.id} 테스트 성공 ✅`);
    return output;
  } catch (error) {
    console.error(`${model.id} 테스트 실패 ❌:`, error.message);
    if (error.response) {
      console.error("응답 상태:", error.response.status);
      console.error("응답 데이터:", error.response.data);
    }
    throw error;
  }
}

// 테스트 실행
testSingleModel()
  .then(result => {
    console.log("테스트 완료:", result);
    process.exit(0);
  })
  .catch(error => {
    console.error("테스트 중 오류 발생:", error);
    process.exit(1);
  });