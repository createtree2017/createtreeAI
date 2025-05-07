import Replicate from 'replicate';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { promisify } from 'util';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

// Replicate API 클라이언트 초기화
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// PhotoMaker 모델 ID
const PHOTOMAKER_MODEL = "tencentarc/photomaker";
const PHOTOMAKER_VERSION = "ddfc2b08d209f9fa8c1eca692712918bd449f695dabb4a958da31802a9570fe4";

/**
 * 사용자 얼굴 이미지를 레퍼런스 이미지에 합성하는 함수
 * @param faceImagePath 사용자 얼굴 이미지 경로
 * @param referenceImagePath 레퍼런스 이미지 경로 (합성 대상)
 * @param style 적용할 스타일 (프롬프트에 사용)
 */
export async function mergeUserFaceWithReference(
  faceImagePath: string,
  referenceImagePath: string,
  style: string,
  customPrompt?: string,
  customNegativePrompt?: string,
  customStrength?: string
): Promise<string> {
  try {
    console.log(`[PhotoMaker] 얼굴 합성 시작`);
    console.log(`[PhotoMaker] 사용자 얼굴 이미지: ${faceImagePath}`);
    console.log(`[PhotoMaker] 레퍼런스 이미지: ${referenceImagePath}`);

    // 이미지 파일 존재 확인
    if (!fs.existsSync(faceImagePath)) {
      throw new Error(`사용자 얼굴 이미지 파일이 존재하지 않습니다: ${faceImagePath}`);
    }

    if (!fs.existsSync(referenceImagePath)) {
      throw new Error(`레퍼런스 이미지 파일이 존재하지 않습니다: ${referenceImagePath}`);
    }

    // 파일 크기 확인
    const faceStats = fs.statSync(faceImagePath);
    const refStats = fs.statSync(referenceImagePath);
    
    console.log(`[PhotoMaker] 얼굴 이미지 크기: ${faceStats.size} 바이트`);
    console.log(`[PhotoMaker] 레퍼런스 이미지 크기: ${refStats.size} 바이트`);
    
    if (faceStats.size === 0 || refStats.size === 0) {
      throw new Error("이미지 파일이 비어 있습니다");
    }

    // 임시 저장 경로 확인
    const tempDir = path.join(process.cwd(), 'uploads', 'temp');
    try {
      await mkdirAsync(tempDir, { recursive: true });
    } catch (err) {
      // 디렉토리가 이미 존재하는 경우 무시
    }

    // base64로 인코딩된 이미지 준비
    const faceImageBase64 = await readFileAsync(faceImagePath, { encoding: 'base64' });
    const refImageBase64 = await readFileAsync(referenceImagePath, { encoding: 'base64' });

    // 커스텀 프롬프트 또는 기본값 사용
    const prompt = customPrompt || 
      `A beautiful high-quality portrait in ${style} style, preserving facial features, detailed, artistic`;
    
    // 커스텀 네거티브 프롬프트 또는 기본값 사용
    const negativePrompt = customNegativePrompt || 
      "ugly, blurry, bad anatomy, bad hands, text, error, missing fingers, extra digit, cropped, low quality";
    
    // 커스텀 강도 또는 기본값 사용 (문자열 -> 숫자 변환)
    const strengthRatio = customStrength ? parseInt(customStrength) * 20 : 20; // 0.8 -> 16, 기본값은 20
    
    console.log(`[PhotoMaker] 사용 프롬프트: ${prompt}`);
    console.log(`[PhotoMaker] 네거티브 프롬프트: ${negativePrompt}`);
    console.log(`[PhotoMaker] 강도 설정: ${customStrength || '1.0'} (변환값: ${strengthRatio})`);
    
    // Replicate API 호출을 위한 입력 데이터 구성
    const input = {
      prompt: prompt,
      input_image: `data:image/jpeg;base64,${faceImageBase64}`,  // 사용자 얼굴 이미지
      reference_image: `data:image/jpeg;base64,${refImageBase64}`,  // 레퍼런스 이미지
      style_name: "Photographic (Default)",
      style_strength_ratio: strengthRatio,
      num_steps: 30,
      guidance_scale: 5,
      negative_prompt: negativePrompt
    };

    console.log(`[PhotoMaker] API 호출 준비 완료 - style: ${style}, input 데이터 준비 완료`);

    // PhotoMaker API 호출
    const output = await replicate.run(
      `${PHOTOMAKER_MODEL}:${PHOTOMAKER_VERSION}`,
      { input }
    );

    console.log(`[PhotoMaker] API 응답 수신: ${typeof output}`);
    
    if (!output || !Array.isArray(output) || output.length === 0) {
      throw new Error(`유효하지 않은 Replicate API 응답: ${JSON.stringify(output)}`);
    }

    // 결과 이미지 URL 가져오기
    const imageUrl = output[0];
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error(`유효하지 않은 이미지 URL: ${imageUrl}`);
    }

    console.log(`[PhotoMaker] 생성된 이미지 URL: ${imageUrl.substring(0, 50)}...`);

    // 이미지 다운로드 및 저장
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`이미지 다운로드 실패: ${response.status} ${response.statusText}`);
    }

    const imageData = await response.arrayBuffer();
    const randomId = crypto.randomBytes(16).toString('hex');
    const outputFilePath = path.join(tempDir, `temp_photomaker_${Date.now()}_${randomId}.jpg`);
    
    await writeFileAsync(outputFilePath, Buffer.from(imageData));
    console.log(`[PhotoMaker] 생성된 이미지 저장 경로: ${outputFilePath}`);
    
    return outputFilePath;
  } catch (error) {
    console.error("[PhotoMaker] 얼굴 합성 중 오류 발생:", error);
    throw error;
  }
}

/**
 * 기존 프롬프트 기반 이미지 생성 함수
 * 단일 이미지만 입력으로 받아 스타일 변환
 */
export async function generateStylizedImage(
  imageFilePath: string,
  style: string,
  customPrompt?: string,
  customNegativePrompt?: string,
  customStrength?: string
): Promise<string> {
  try {
    console.log(`[PhotoMaker] 이미지 스타일 변환 시작: ${style}`);
    console.log(`[PhotoMaker] 입력 이미지 경로: ${imageFilePath}`);

    // 이미지 파일 존재 확인
    if (!fs.existsSync(imageFilePath)) {
      throw new Error(`이미지 파일이 존재하지 않습니다: ${imageFilePath}`);
    }
    
    // 파일 크기 확인
    const stats = fs.statSync(imageFilePath);
    console.log(`[PhotoMaker] 이미지 파일 크기: ${stats.size} 바이트`);
    
    if (stats.size === 0) {
      throw new Error("이미지 파일이 비어 있습니다");
    }
    
    // 임시 저장 경로 확인
    const tempDir = path.join(process.cwd(), 'uploads', 'temp');
    try {
      await mkdirAsync(tempDir, { recursive: true });
    } catch (err) {
      // 디렉토리가 이미 존재하는 경우 무시
    }

    // 기본 프롬프트 또는 커스텀 프롬프트 사용
    const prompt = customPrompt || 
      `A beautiful pregnant woman photo in ${style} style, preserving facial features, high quality, professional portrait`;
    
    // 커스텀 네거티브 프롬프트 또는 기본값 사용
    const negativePrompt = customNegativePrompt || 
      "ugly, blurry, bad anatomy, bad hands, text, error, missing fingers, extra digit, cropped, low quality";
    
    // 커스텀 강도 또는 기본값 사용 (문자열 -> 숫자 변환)
    const strengthRatio = customStrength ? parseInt(customStrength) * 20 : 20; // 0.8 -> 16, 기본값은 20
    
    console.log(`[PhotoMaker] 사용 프롬프트: ${prompt}`);
    console.log(`[PhotoMaker] 네거티브 프롬프트: ${negativePrompt}`);
    console.log(`[PhotoMaker] 강도 설정: ${customStrength || '1.0'} (변환값: ${strengthRatio})`);
    
    // 모델 실행을 위한 파라미터 설정
    const input = {
      prompt: prompt,
      input_image: fs.createReadStream(imageFilePath),
      style_name: "Photographic (Default)",
      style_strength_ratio: strengthRatio,
      num_steps: 30,
      guidance_scale: 5,
      negative_prompt: negativePrompt
    };
    
    console.log(`[PhotoMaker] API 호출 시작: ${prompt.substring(0, 50)}...`);
    
    // 모델 실행
    const output = await replicate.run(
      `${PHOTOMAKER_MODEL}:${PHOTOMAKER_VERSION}`,
      { input }
    );
    
    console.log(`[PhotoMaker] 응답 수신: ${typeof output}`);
    
    if (!output || !Array.isArray(output) || output.length === 0) {
      throw new Error(`유효하지 않은 Replicate API 응답: ${JSON.stringify(output)}`);
    }

    // 결과 이미지 URL
    const imageUrl = output[0];
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error(`유효하지 않은 이미지 URL: ${imageUrl}`);
    }

    console.log(`[PhotoMaker] 생성된 이미지 URL: ${imageUrl.substring(0, 50)}...`);
    
    // 이미지 다운로드 및 저장
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`이미지 다운로드 실패: ${response.status} ${response.statusText}`);
    }

    const imageData = await response.arrayBuffer();
    const randomId = crypto.randomBytes(16).toString('hex');
    const outputFilePath = path.join(tempDir, `temp_photomaker_${Date.now()}_${randomId}.jpg`);
    
    await writeFileAsync(outputFilePath, Buffer.from(imageData));
    console.log(`[PhotoMaker] 생성된 이미지 저장 경로: ${outputFilePath}`);
    
    return outputFilePath;
  } catch (error) {
    console.error("[PhotoMaker] 이미지 변환 중 오류 발생:", error);
    throw error;
  }
}