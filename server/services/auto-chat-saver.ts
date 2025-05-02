import fs from 'fs';
import path from 'path';
import { DevHistoryManager } from './dev-history-manager';

/**
 * 개발 대화 내용을 자동으로 저장하는 클래스
 */
export class AutoChatSaver {
  private historyManager: DevHistoryManager;
  private saveInterval: NodeJS.Timeout | null = null;
  private lastSaveTime: Date;
  private static instance: AutoChatSaver;
  
  // 싱글톤 패턴으로 구현
  public static getInstance(): AutoChatSaver {
    if (!AutoChatSaver.instance) {
      AutoChatSaver.instance = new AutoChatSaver();
    }
    return AutoChatSaver.instance;
  }
  
  private constructor() {
    this.historyManager = new DevHistoryManager();
    this.lastSaveTime = new Date();
    
    // 애플리케이션 종료 시 저장하도록 이벤트 등록
    process.on('SIGINT', () => this.saveBeforeExit());
    process.on('SIGTERM', () => this.saveBeforeExit());
  }
  
  /**
   * 주기적 자동 저장 시작
   * @param intervalMinutes 저장 간격 (분)
   */
  public startAutoSave(intervalMinutes: number = 30): void {
    // 이미 실행 중인 경우 중지 후 재시작
    if (this.saveInterval) {
      this.stopAutoSave();
    }
    
    const intervalMs = intervalMinutes * 60 * 1000;
    
    console.log(`자동 저장 시스템 시작됨: ${intervalMinutes}분 간격으로 저장`);
    
    this.saveInterval = setInterval(() => {
      this.saveCurrentChat();
    }, intervalMs);
  }
  
  /**
   * 주기적 자동 저장 중지
   */
  public stopAutoSave(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
      console.log('자동 저장 시스템 중지됨');
    }
  }
  
  /**
   * 현재 대화 내용 저장
   * @param forceSave 강제 저장 여부 (마지막 저장 이후 변경이 없어도 저장)
   * @returns 성공 여부
   */
  public saveCurrentChat(forceSave: boolean = false): boolean {
    try {
      // 오늘 날짜 구하기
      const today = new Date();
      const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD 형식
      
      // 파일 경로
      const chatFilePath = path.join(process.cwd(), 'chat_history.html');
      
      // 파일이 존재하지 않는 경우
      if (!fs.existsSync(chatFilePath)) {
        console.log('저장할 대화 내용이 없습니다.');
        return false;
      }
      
      // 파일의 마지막 수정 시간 확인
      const stats = fs.statSync(chatFilePath);
      const lastModified = stats.mtime;
      
      // 마지막 저장 이후 변경이 없고, 강제 저장이 아닌 경우 건너뛰기
      if (!forceSave && lastModified <= this.lastSaveTime) {
        console.log('마지막 저장 이후 변경된 내용이 없습니다.');
        return false;
      }
      
      // 대화 내용 저장
      const success = this.historyManager.saveCurrentHistoryByDate(dateString);
      
      if (success) {
        console.log(`대화 내용이 ${dateString} 날짜로 성공적으로 저장되었습니다.`);
        this.lastSaveTime = new Date();
        return true;
      } else {
        console.log('대화 내용 저장에 실패했습니다.');
        return false;
      }
    } catch (error) {
      console.error('대화 저장 중 오류 발생:', error);
      return false;
    }
  }
  
  /**
   * 프로그램 종료 전 저장
   */
  private saveBeforeExit(): void {
    console.log('프로그램 종료 전 대화 내용 저장 중...');
    this.saveCurrentChat(true); // 강제 저장
    process.exit(0);
  }
  
  /**
   * 명령어로 대화 저장 (사용자가 "채팅저장" 이라고 입력한 경우)
   * @returns 성공 여부
   */
  public saveByCommand(): boolean {
    console.log('사용자 명령으로 대화 내용 저장 중...');
    return this.saveCurrentChat(true); // 강제 저장
  }
}

// 기본 30분 간격으로 자동 저장 기능을 시작하는 함수
export function startAutoChatSaver(intervalMinutes: number = 30): AutoChatSaver {
  const saver = AutoChatSaver.getInstance();
  saver.startAutoSave(intervalMinutes);
  return saver;
}