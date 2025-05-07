import Replicate from 'replicate';
import fs from 'fs';
import { promisify } from 'util';
import path from 'path';
import crypto from 'crypto';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

// Replicate 인스턴스 생성
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// 이미지를 base64로 인코딩
async function encodeImageToBase64(filePath: string): Promise<string> {
  const fileData = await readFileAsync(filePath);
  return fileData.toString('base64');
}

/**
 * Photomaker 모델을 사용하여 이미지 변환
 * @param imageFilePath 원본 이미지 파일 경로
 * @param styleName 스타일 이름 (모델 프롬프트에 사용)
 * @returns 변환된 이미지 파일 경로
 */
export async function transformImageWithPhotomaker(
  imageFilePath: string,
  styleName: string
): Promise<string> {
  try {
    console.log(`[Replicate] PhotoMaker 변환 시작: ${styleName}`);
    console.log(`[Replicate] 원본 이미지 경로: ${imageFilePath}`);

    // 이미지를 base64로 변환
    const base64Image = await encodeImageToBase64(imageFilePath);
    
    // 임시 저장 경로 확인
    const tempDir = path.join(process.cwd(), 'uploads', 'temp');
    try {
      await mkdirAsync(tempDir, { recursive: true });
    } catch (err) {
      // 디렉토리가 이미 존재하는 경우 무시
    }

    // 모델 실행을 위한 파라미터 설정
    // 모델 ID: tencentarc/photomaker:ddfc2b08d209f9fa8c1eca692712918bd449f695dabb4a958da31802a9570fe4
    const output = await replicate.run(
      "tencentarc/photomaker:ddfc2b08d209f9fa8c1eca692712918bd449f695dabb4a958da31802a9570fe4",
      {
        input: {
          prompt: `A beautiful pregnant woman photo in ${styleName} style`,
          image: `data:image/jpeg;base64,${base64Image}`,
          num_steps: 20, // 기본값
          style_name: "Photographic (Default)", // 스타일 이름
          negative_prompt: "ugly, blurry, bad anatomy, bad hands, text, error, missing fingers, extra digit, cropped", // 부정적 프롬프트
          style_strength_ratio: 20 // 스타일 강도
        }
      }
    );

    // 결과 확인
    console.log("[Replicate] PhotoMaker 변환 결과:", output);
    
    if (!output || !Array.isArray(output) || output.length === 0) {
      throw new Error("PhotoMaker 모델 응답 형식이 예상과 다릅니다.");
    }

    // 결과 이미지 다운로드 (첫번째 결과 사용)
    const imageUrl = output[0];
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error("유효하지 않은 이미지 URL입니다.");
    }

    // 이미지 다운로드 및 저장
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`이미지 다운로드 실패: ${response.status} ${response.statusText}`);
    }

    const imageData = await response.arrayBuffer();
    const randomId = crypto.randomBytes(16).toString('hex');
    const outputFilePath = path.join(tempDir, `temp_${Date.now()}______${randomId}.jpg`);
    
    await writeFileAsync(outputFilePath, Buffer.from(imageData));
    console.log(`[Replicate] 변환된 이미지 저장 경로: ${outputFilePath}`);
    
    return outputFilePath;
  } catch (error) {
    console.error("[Replicate] PhotoMaker 이미지 변환 중 오류 발생:", error);
    throw error;
  }
}