import fs from 'fs';
import path from 'path';

/**
 * 개발 대화 기록을 HTML 형식으로 내보내는 함수
 */
export async function exportDevChatAsHtml(): Promise<string> {
  try {
    // chat_history.html 파일이 존재하는지 확인
    const htmlFilePath = path.join(process.cwd(), 'chat_history.html');
    if (fs.existsSync(htmlFilePath)) {
      const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');
      return htmlContent;
    }
    
    // 파일이 없는 경우 기본 HTML 반환
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CreateTree Culture Center AI 개발 대화 기록</title>
    <style>
        body {
            font-family: 'Noto Sans KR', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        h1, h2 {
            color: #4a6da7;
            border-bottom: 2px solid #eaeaea;
            padding-bottom: 10px;
        }
        .message {
            margin-bottom: 20px;
            padding: 15px;
            border-radius: 8px;
        }
        .user {
            background-color: #e9f5ff;
            border-left: 5px solid #4a90e2;
        }
        .assistant {
            background-color: #f0f7ee;
            border-left: 5px solid #5bba6f;
        }
        .timestamp {
            font-size: 0.8em;
            color: #888;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <h1>CreateTree Culture Center AI 개발 대화 기록</h1>
    <p>개발 기록을 찾을 수 없습니다.</p>
</body>
</html>
    `;
  } catch (error) {
    console.error('개발 대화 기록 내보내기 오류:', error);
    throw new Error('개발 대화 기록을 내보내는 중 오류가 발생했습니다.');
  }
}

/**
 * 개발 대화 기록을 텍스트 형식으로 내보내는 함수
 */
export async function exportDevChatAsText(): Promise<string> {
  try {
    // 개발 대화 기록 파일을 HTML에서 텍스트로 변환
    const htmlContent = await exportDevChatAsHtml();
    
    // HTML에서 텍스트 콘텐츠만 추출 (간단한 방식)
    const textContent = htmlContent
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // 스타일 태그 제거
      .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, '') // head 태그 제거
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // 스크립트 태그 제거
      .replace(/<\/div>/gi, '\n') // div 종료 태그를 줄바꿈으로 변환
      .replace(/<\/p>/gi, '\n\n') // p 종료 태그를 두 줄바꿈으로 변환
      .replace(/<br\s*\/?>/gi, '\n') // br 태그를 줄바꿈으로 변환
      .replace(/<[^>]+>/gi, '') // 나머지 HTML 태그 제거
      .replace(/&nbsp;/gi, ' ') // 특수 HTML 엔티티 변환
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\n\s*\n\s*\n/gi, '\n\n') // 연속된 줄바꿈 정리
      .trim(); // 앞뒤 공백 제거
    
    return textContent;
  } catch (error) {
    console.error('개발 대화 기록 내보내기 오류:', error);
    throw new Error('개발 대화 기록을 내보내는 중 오류가 발생했습니다.');
  }
}