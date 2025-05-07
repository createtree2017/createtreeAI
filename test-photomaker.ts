// 테스트용 스크립트
import { generateStylizedImage } from './server/services/photo-maker';
import path from 'path';
import fs from 'fs';

async function runTest() {
  console.log("PhotoMaker 테스트 시작...");
  
  try {
    // 테스트용 이미지 파일 찾기
    const uploadDir = path.join(process.cwd(), 'uploads');
    const files = fs.readdirSync(uploadDir).filter(file => 
      file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png')
    );
    
    if (files.length === 0) {
      console.log("테스트할 이미지 파일이 없습니다. uploads 폴더에 이미지가 없습니다.");
      return;
    }
    
    // 첫 번째 이미지 사용
    const testImagePath = path.join(uploadDir, files[0]);
    console.log(`테스트 이미지: ${testImagePath}`);
    
    // PhotoMaker 테스트
    const result = await generateStylizedImage(
      testImagePath,
      "test-style",
      "A beautiful portrait in artistic style, high quality"
    );
    
    console.log("테스트 결과:", result);
    console.log("생성된 이미지 존재 여부:", fs.existsSync(result));
  } catch (error) {
    console.error("테스트 실패:", error);
    if (error instanceof Error) {
      console.error("오류 메시지:", error.message);
      console.error("오류 스택:", error.stack);
    }
  }
}

runTest();