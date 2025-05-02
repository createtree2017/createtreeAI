import fs from 'fs';
import path from 'path';

// 개발 대화 히스토리 관리를 위한 클래스
export class DevHistoryManager {
  private historyDir: string;
  
  constructor() {
    // 히스토리 파일을 저장할 디렉토리 경로
    this.historyDir = path.join(process.cwd(), 'dev_history');
    
    // 디렉토리가 없으면 생성
    if (!fs.existsSync(this.historyDir)) {
      fs.mkdirSync(this.historyDir, { recursive: true });
    }
  }
  
  /**
   * 날짜 목록 가져오기
   * @returns 히스토리가 저장된 날짜 목록
   */
  getDateList(): string[] {
    try {
      // 현재 대화 기록 파일이 있는 경우 (chat_history.html)
      const mainHistoryPath = path.join(process.cwd(), 'chat_history.html');
      
      // 디렉토리의 모든 파일 목록
      const files = fs.readdirSync(this.historyDir);
      
      // .html 파일만 필터링하고 날짜 형식만 추출
      const dates = files
        .filter(file => file.endsWith('.html') && file.startsWith('dev_chat_'))
        .map(file => file.replace('dev_chat_', '').replace('.html', ''))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // 최신 날짜순 정렬
      
      // 메인 대화 기록 파일이 존재하면 "최신"(today)도 목록에 추가
      if (fs.existsSync(mainHistoryPath)) {
        return ['today', ...dates];
      }
      
      return dates;
    } catch (error) {
      console.error('날짜 목록 가져오기 오류:', error);
      return [];
    }
  }
  
  /**
   * 특정 날짜의 대화 히스토리 가져오기
   * @param date 날짜 (YYYY-MM-DD 형식) 또는 'today'
   * @returns HTML 형식의 대화 내용
   */
  getHistoryByDate(date: string): string {
    try {
      let filePath: string;
      
      if (date === 'today') {
        // 오늘(최신) 대화 기록
        filePath = path.join(process.cwd(), 'chat_history.html');
      } else {
        // 특정 날짜의 대화 기록
        filePath = path.join(this.historyDir, `dev_chat_${date}.html`);
      }
      
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
      }
      
      return this.getEmptyHistoryTemplate(date);
    } catch (error) {
      console.error(`${date} 날짜의 대화 히스토리 가져오기 오류:`, error);
      return this.getEmptyHistoryTemplate(date);
    }
  }
  
  /**
   * 현재 대화 히스토리를 날짜별로 저장
   * @param date 저장할 날짜 (YYYY-MM-DD 형식)
   * @returns 성공 여부
   */
  saveCurrentHistoryByDate(date: string): boolean {
    try {
      const currentHistoryPath = path.join(process.cwd(), 'chat_history.html');
      
      if (!fs.existsSync(currentHistoryPath)) {
        console.error('저장할 현재 대화 기록이 없습니다.');
        return false;
      }
      
      const targetPath = path.join(this.historyDir, `dev_chat_${date}.html`);
      fs.copyFileSync(currentHistoryPath, targetPath);
      
      return true;
    } catch (error) {
      console.error(`대화 히스토리 ${date}에 저장 오류:`, error);
      return false;
    }
  }
  
  /**
   * 히스토리 파일이 없을 때 반환할 빈 템플릿
   * @param date 날짜
   * @returns HTML 템플릿
   */
  private getEmptyHistoryTemplate(date: string): string {
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>개발 대화 기록 - ${date}</title>
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
        .empty-message {
            text-align: center;
            padding: 50px;
            background-color: #f5f5f5;
            border-radius: 10px;
            margin: 30px 0;
        }
    </style>
</head>
<body>
    <h1>개발 대화 기록 - ${date}</h1>
    <div class="empty-message">
        <h2>기록이 없습니다</h2>
        <p>${date} 날짜에 해당하는 개발 대화 기록을 찾을 수 없습니다.</p>
    </div>
</body>
</html>
    `;
  }
  
  /**
   * 오늘 날짜를 YYYY-MM-DD 형식으로 가져오기
   */
  static getTodayString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
}