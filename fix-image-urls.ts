/**
 * 태몽동화 이미지 URL 수정 및 로컬 저장 스크립트
 * 
 * 이 스크립트는 기존 태몽동화 이미지 URL 중 OpenAI URL(https://로 시작)을 
 * 로컬 파일(/static으로 시작)로 다운로드하여 저장합니다.
 */

import { db } from "./db";
import { dreamBookImages } from "./shared/dream-book";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { eq, like } from "drizzle-orm";

/**
 * 이미지 URL이 OpenAI URL인지 확인하는 함수
 */
function isOpenAIUrl(url: string): boolean {
  return url.startsWith('http') && !url.startsWith('/static');
}

/**
 * 이미지를 다운로드하여 저장하는 함수
 */
async function downloadAndSaveImage(imageUrl: string, bookId: number, sequence: number): Promise<string> {
  try {
    // 요청 타임아웃 설정 (10초)
    const timeout = 10000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // 이미지 다운로드
    const response = await fetch(imageUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`이미지 다운로드 실패 (${response.status}): ${imageUrl}`);
      return "/static/uploads/dream-books/error.png";
    }

    // 이미지 데이터 추출
    const imageBuffer = await response.buffer();

    // 저장 경로 설정
    const uploadDir = path.join(process.cwd(), 'static', 'uploads', 'dream-books');
    
    // 디렉토리가 없으면 생성
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 파일 이름 생성 (dreambook-{bookId}-{sequence}-{timestamp}.png)
    const timestamp = Date.now();
    const filename = `dreambook-${bookId}-${sequence}-${timestamp}.png`;
    const filePath = path.join(uploadDir, filename);

    // 파일로 저장
    fs.writeFileSync(filePath, imageBuffer);

    // 웹 접근 경로 반환
    return `/static/uploads/dream-books/${filename}`;
  } catch (error) {
    console.error(`이미지 다운로드 및 저장 중 오류:`, error);
    return "/static/uploads/dream-books/error.png";
  }
}

/**
 * 메인 함수 - 모든 OpenAI URL 이미지를 로컬로 다운로드하여 저장
 */
async function fixImageUrls() {
  try {
    console.log("태몽동화 이미지 URL 수정 및 로컬 저장 시작...");

    // OpenAI URL을 사용하는 이미지 조회 (http로 시작하는 URL)
    const images = await db.query.dreamBookImages.findMany({
      where: like(dreamBookImages.imageUrl, 'http%'),
      with: {
        dreamBook: true
      }
    });

    console.log(`총 ${images.length}개의 OpenAI URL 이미지를 발견했습니다.`);

    let successCount = 0;
    let errorCount = 0;

    // 각 이미지를 순차적으로 처리
    for (const image of images) {
      try {
        console.log(`이미지 처리 중: ID ${image.id}, URL: ${image.imageUrl}`);

        if (!isOpenAIUrl(image.imageUrl)) {
          console.log(`이미지 ID ${image.id}는 이미 로컬 URL을 사용하고 있습니다.`);
          continue;
        }

        // 이미지 다운로드 및 저장
        const localUrl = await downloadAndSaveImage(
          image.imageUrl,
          image.dreamBookId,
          image.sequence
        );

        // DB 업데이트
        await db
          .update(dreamBookImages)
          .set({ imageUrl: localUrl })
          .where(eq(dreamBookImages.id, image.id));

        console.log(`이미지 ID ${image.id}의 URL이 성공적으로 업데이트 되었습니다: ${localUrl}`);
        successCount++;
      } catch (imageError) {
        console.error(`이미지 ID ${image.id} 처리 중 오류:`, imageError);
        errorCount++;

        // 오류 발생 시 기본 이미지로 설정
        try {
          await db
            .update(dreamBookImages)
            .set({ imageUrl: "/static/uploads/dream-books/error.png" })
            .where(eq(dreamBookImages.id, image.id));
          
          console.log(`이미지 ID ${image.id}에 오류 이미지를 설정했습니다.`);
        } catch (updateError) {
          console.error(`이미지 ID ${image.id}의 오류 이미지 설정 중 오류:`, updateError);
        }
      }
    }

    console.log("태몽동화 이미지 URL 수정 및 로컬 저장 완료!");
    console.log(`성공: ${successCount}개, 오류: ${errorCount}개`);
  } catch (error) {
    console.error("태몽동화 이미지 URL 수정 및 로컬 저장 중 오류:", error);
  }
}

// 스크립트 실행
fixImageUrls()
  .then(() => {
    console.log("스크립트 실행이 완료되었습니다.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("스크립트 실행 중 오류가 발생했습니다:", error);
    process.exit(1);
  });