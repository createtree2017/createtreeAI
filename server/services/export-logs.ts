import { pool } from '@db';
import { chatMessages } from '@shared/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { db } from '@db';

/**
 * 채팅 기록을 HTML 형식으로 내보내는 함수
 * 모든 채팅 메시지를 가져와 HTML 파일로 저장
 */
export async function exportChatHistoryAsHtml(): Promise<string> {
  try {
    // DB에서 모든 채팅 메시지 가져오기 (최신순)
    const messages = await db.query.chatMessages.findMany({
      orderBy: desc(chatMessages.createdAt)
    });

    // HTML 형식으로 채팅 기록 포맷팅
    let htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CreateTree AI 채팅 기록</title>
  <style>
    body {
      font-family: 'Pretendard', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9f9f9;
    }
    h1 {
      color: #663399;
      text-align: center;
      margin-bottom: 30px;
    }
    .chat-container {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    .message {
      padding: 15px;
      border-radius: 12px;
      max-width: 80%;
    }
    .user {
      align-self: flex-end;
      background-color: #e8d5f9;
      border: 1px solid #d8b5f9;
    }
    .assistant {
      align-self: flex-start;
      background-color: #f0f0f0;
      border: 1px solid #e0e0e0;
    }
    .timestamp {
      font-size: 0.8em;
      color: #888;
      margin-top: 5px;
    }
    .divider {
      text-align: center;
      color: #888;
      margin: 20px 0;
      position: relative;
    }
    .divider::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 0;
      width: 100%;
      height: 1px;
      background-color: #ddd;
      z-index: -1;
    }
    .divider span {
      background-color: #f9f9f9;
      padding: 0 15px;
    }
  </style>
</head>
<body>
  <h1>CreateTree AI 채팅 기록</h1>
  <p style="text-align: center; margin-bottom: 30px;">내보내기 날짜: ${new Date().toLocaleString('ko-KR')}</p>
  <div class="chat-container">
`;

    // 날짜별 그룹핑을 위한 변수
    let currentDate = '';

    // 메시지를 시간순으로 정렬 (오래된 것부터)
    const sortedMessages = [...messages].sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // 각 메시지를 HTML로 변환
    for (const message of sortedMessages) {
      // 날짜가 바뀌면 구분선 추가
      const messageDate = new Date(message.createdAt).toLocaleDateString('ko-KR');
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        htmlContent += `
    <div class="divider">
      <span>${currentDate}</span>
    </div>
`;
      }

      // 메시지 타입에 따라 클래스 추가
      const messageClass = message.role === 'user' ? 'user' : 'assistant';
      const timestamp = new Date(message.createdAt).toLocaleTimeString('ko-KR');
      
      htmlContent += `
    <div class="message ${messageClass}">
      <div>${message.content}</div>
      <div class="timestamp">${timestamp}</div>
    </div>
`;
    }

    // HTML 닫기
    htmlContent += `
  </div>
</body>
</html>
`;

    return htmlContent;
  } catch (error) {
    console.error('채팅 기록 내보내기 오류:', error);
    throw new Error('채팅 기록을 내보내는 중 오류가 발생했습니다.');
  }
}

/**
 * 채팅 기록을 일반 텍스트 형식으로 내보내는 함수
 */
export async function exportChatHistoryAsText(): Promise<string> {
  try {
    // DB에서 모든 채팅 메시지 가져오기 (최신순)
    const messages = await db.query.chatMessages.findMany({
      orderBy: desc(chatMessages.createdAt)
    });

    // 텍스트 형식으로 채팅 기록 포맷팅
    let textContent = `CreateTree AI 채팅 기록\n`;
    textContent += `내보내기 날짜: ${new Date().toLocaleString('ko-KR')}\n\n`;

    // 날짜별 그룹핑을 위한 변수
    let currentDate = '';

    // 메시지를 시간순으로 정렬 (오래된 것부터)
    const sortedMessages = [...messages].sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // 각 메시지를 텍스트로 변환
    for (const message of sortedMessages) {
      // 날짜가 바뀌면 구분선 추가
      const messageDate = new Date(message.createdAt).toLocaleDateString('ko-KR');
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        textContent += `\n=== ${currentDate} ===\n\n`;
      }

      // 메시지 역할에 따라 접두사 추가
      const role = message.role === 'user' ? '사용자' : 'AI';
      const timestamp = new Date(message.createdAt).toLocaleTimeString('ko-KR');
      
      textContent += `[${timestamp}] ${role}: ${message.content}\n\n`;
    }

    return textContent;
  } catch (error) {
    console.error('채팅 기록 내보내기 오류:', error);
    throw new Error('채팅 기록을 내보내는 중 오류가 발생했습니다.');
  }
}

/**
 * 시스템 로그 내보내기 함수 (서버 로그, 애플리케이션 로그 등)
 * 실제 로그 파일이 있는 경우 추가 구현 필요
 */
export function getSystemLogs(): string {
  // 시스템에 저장된 로그 파일이 있다면 여기서 읽어올 수 있음
  // 이 예제에서는 간단히 현재 시간과 메시지만 반환
  return `[시스템 로그] ${new Date().toLocaleString('ko-KR')}\n` +
    `서버가 정상적으로 실행 중입니다.\n` +
    `CreateTree AI 유틸리티 플랫폼 로그\n`;
}