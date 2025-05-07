import Replicate from 'replicate';

// Replicate API 클라이언트 초기화
export async function testReplicateAPI() {
  try {
    console.log("[테스트] Replicate API 테스트 시작");
    
    // API 토큰 확인
    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
      console.error("[테스트] REPLICATE_API_TOKEN이 설정되지 않았습니다.");
      return {
        success: false,
        error: "API 토큰이 설정되지 않았습니다.",
        token: "없음"
      };
    }
    
    console.log(`[테스트] REPLICATE_API_TOKEN 확인: ${apiToken.substring(0, 5)}...${apiToken.substring(apiToken.length - 5)} (길이: ${apiToken.length})`);
    
    // Replicate 클라이언트 초기화
    const replicate = new Replicate({
      auth: apiToken,
    });
    
    // 간단한 모델 호출로 API 작동 여부 테스트
    // "stability-ai/stable-diffusion"는 가장 기본적인 텍스트-이미지 생성 모델
    const output = await replicate.run(
      "stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
      {
        input: {
          prompt: "a photo of a cat",
          width: 512,
          height: 512,
          num_outputs: 1,
          guidance_scale: 7.5
        }
      }
    );
    
    console.log("[테스트] Replicate API 응답:", output);
    
    return {
      success: true,
      output: output
    };
  } catch (error) {
    console.error("[테스트] Replicate API 테스트 오류:", error);
    return {
      success: false,
      error: error.message || "알 수 없는 오류",
      errorObj: JSON.stringify(error)
    };
  }
}