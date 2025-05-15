// 음악 생성 모델 테스트 스크립트
import Replicate from "replicate";

// Replicate API 클라이언트 초기화
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function testMusicModels() {
  console.log("Replicate 음악 생성 모델 테스트 시작");
  console.log("API 토큰:", process.env.REPLICATE_API_TOKEN ? "설정됨" : "설정되지 않음");

  // 테스트할 모델 목록
  const models = [
    {
      id: "meta/musicgen",
      version: "b05b1dff1d8c6dc63d14b0cdb42135378dcb87f6373b0d3d341ede46e59e2b38", // 최신 버전
      input: {
        model_version: "stereo-melody-large", // 수정된 버전 (오류 메시지에서 발견한 유효한 값)
        prompt: "아기를 위한 편안한 자장가, 단순한 멜로디와 부드러운 보컬",
        duration: 30
      }
    },
    {
      id: "minimax/music-01",
      version: "e9b88e40b59e08aa800daaa9a8d2af3a2aec23de6fed1a66fa48ba67ca3a0bbf",
      input: {
        prompt: "아기를 위한 편안한 자장가, 단순한 멜로디와 부드러운 보컬",
        duration: 30
      }
    },
    {
      id: "riffusion/riffusion",
      version: "8cf61ea6c56afd61d8f5b9ffd14d7c216c0a93276872bc0c2244abc00715c8ae",
      input: {
        prompt: "아기를 위한 편안한 자장가, 단순한 멜로디와 부드러운 보컬",
        negative_prompt: "",
        seed: 42,
        denoising: 0.75
      }
    }
  ];

  // 각 모델 테스트
  for (const model of models) {
    try {
      console.log(`\n테스트 중: ${model.id} (버전: ${model.version})`);
      console.log("입력:", JSON.stringify(model.input, null, 2));
      
      const output = await replicate.run(
        `${model.id}:${model.version}`,
        { input: model.input }
      );
      
      console.log("출력:", JSON.stringify(output, null, 2));
      console.log(`${model.id} 테스트 성공 ✅`);
    } catch (error) {
      console.error(`${model.id} 테스트 실패 ❌:`, error);
      if (error.response) {
        console.error("응답 데이터:", error.response.data);
      }
    }
  }
}

// 테스트 실행
testMusicModels().catch(console.error);