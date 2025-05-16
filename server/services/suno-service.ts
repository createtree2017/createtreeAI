/**
 * Suno AI 자동화 서비스
 * 
 * Puppeteer를 사용하여 Suno 웹사이트를 자동화하고, AI 음악을 생성하는 서비스입니다.
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';

// 쿠키 타입 정의
interface SunoCookie {
  domain: string;
  expirationDate?: number;
  hostOnly: boolean;
  httpOnly: boolean;
  name: string;
  path: string;
  sameSite: string;
  secure: boolean;
  session: boolean;
  storeId: string;
  value: string;
  id: number;
}

// 음악 생성 옵션 인터페이스
export interface SunoMusicGenerationOptions {
  prompt: string;           // 음악 생성을 위한 프롬프트
  style?: string;           // 스타일 (예: pop, rock, lullaby 등)
  lyrics?: string;          // 가사 (지정 시 직접 사용, 아닐 경우 AI가 생성)
  vocalGender?: 'male' | 'female' | 'none'; // 보컬 성별
  duration?: '60' | '120' | '180' | '240';  // 음악 길이 (초)
  title?: string;           // 제목 (지정하지 않으면 프롬프트에서 자동 생성)
  language?: 'english' | 'korean' | 'japanese' | 'chinese' | 'spanish';  // 가사 언어
}

// 음악 생성 결과 인터페이스
export interface SunoMusicGenerationResult {
  success: boolean;
  audioUrl?: string;        // 생성된 오디오 파일 URL
  localPath?: string;       // 로컬 파일 경로
  lyrics?: string;          // 가사
  title?: string;           // 제목
  duration?: number;        // 길이 (초)
  coverImageUrl?: string;   // 커버 이미지 URL (있는 경우)
  error?: string;           // 오류 메시지 (실패 시)
}

// Suno 서비스 클래스
export class SunoService {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isInitialized = false;
  private cookies: SunoCookie[] = [];
  private uploadsDir: string;
  private tempDir: string;

  constructor() {
    // 업로드 디렉토리 설정
    this.uploadsDir = path.join(process.cwd(), 'uploads', 'suno');
    this.tempDir = path.join(process.cwd(), 'uploads', 'temp');
    
    // 디렉토리가 없으면 생성
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    
    // 쿠키 파일 읽기
    this.loadCookiesFromFile();
  }

  /**
   * 쿠키 파일에서 Suno 쿠키 정보 로드
   */
  private loadCookiesFromFile(): void {
    try {
      // 쿠키 파일 경로 (실제 환경에 맞게 조정 필요)
      const cookieFilePath = path.join(process.cwd(), 'config', 'suno-cookies.json');
      
      if (fs.existsSync(cookieFilePath)) {
        const cookieData = fs.readFileSync(cookieFilePath, 'utf-8');
        this.cookies = JSON.parse(cookieData);
        console.log(`[Suno Service] ${this.cookies.length}개의 쿠키를 로드했습니다.`);
      } else {
        console.warn('[Suno Service] 쿠키 파일이 존재하지 않습니다.');
      }
    } catch (error) {
      console.error('[Suno Service] 쿠키 로드 중 오류:', error);
    }
  }

  /**
   * 브라우저 초기화 및 쿠키 설정
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('[Suno Service] Puppeteer 브라우저 초기화 중...');
      this.browser = await puppeteer.launch({
        headless: true,  // 헤드리스 모드 사용
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080',
        ],
        defaultViewport: { width: 1920, height: 1080 }
      });

      this.page = await this.browser.newPage();
      
      // 탐지 방지를 위한 User-Agent 설정
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
      
      // 쿠키 설정
      if (this.cookies.length > 0) {
        // Puppeteer 형식에 맞게 쿠키 변환
        const puppeteerCookies = this.cookies.map(cookie => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain,
          path: cookie.path,
          expires: cookie.expirationDate ? Math.floor(cookie.expirationDate) : -1,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite.toLowerCase() === 'lax' ? 'Lax' : 
                   cookie.sameSite.toLowerCase() === 'strict' ? 'Strict' : 
                   'None' as puppeteer.CookieSameSite,
        }));
        
        await this.page.setCookie(...puppeteerCookies);
        console.log('[Suno Service] 쿠키가 성공적으로 설정되었습니다.');
      } else {
        console.warn('[Suno Service] 설정할 쿠키가 없습니다. 로그인이 필요할 수 있습니다.');
      }

      // Suno 메인 페이지 로드
      await this.page.goto('https://app.suno.ai', { waitUntil: 'networkidle2' });
      
      // 로그인 상태 확인
      const isLoggedIn = await this.checkLoginStatus();
      if (!isLoggedIn) {
        throw new Error('Suno에 로그인되어 있지 않습니다. 쿠키를 확인해주세요.');
      }
      
      console.log('[Suno Service] 초기화 완료 - Suno에 로그인되었습니다.');
      this.isInitialized = true;
    } catch (error) {
      console.error('[Suno Service] 초기화 중 오류:', error);
      await this.shutdown();
      throw error;
    }
  }

  /**
   * 로그인 상태 확인
   */
  private async checkLoginStatus(): Promise<boolean> {
    if (!this.page) {
      throw new Error('페이지가 초기화되지 않았습니다.');
    }
    
    try {
      // 로그인 상태 확인을 위한 요소 확인
      // 로그아웃 버튼이나 사용자 프로필 등의 요소가 있는지 확인
      return await this.page.evaluate(() => {
        // 로그인 시 표시되는 요소 확인 (실제 Suno 페이지에 맞게 조정 필요)
        return !!document.querySelector('.user-profile') || 
               !!document.querySelector('button[aria-label="Create"]') || 
               !document.querySelector('a[href="/auth/sign-in"]');
      });
    } catch (error) {
      console.error('[Suno Service] 로그인 상태 확인 중 오류:', error);
      return false;
    }
  }

  /**
   * Suno AI를 사용하여 음악 생성
   */
  public async generateMusic(options: SunoMusicGenerationOptions): Promise<SunoMusicGenerationResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.page) {
      throw new Error('페이지가 초기화되지 않았습니다.');
    }

    try {
      console.log(`[Suno Service] 음악 생성 시작: "${options.prompt}"`);
      
      // Create 페이지로 이동
      await this.page.goto('https://app.suno.ai/create', { waitUntil: 'networkidle2' });
      
      // 프롬프트 입력
      await this.page.waitForSelector('textarea[placeholder*="prompt"]', { visible: true });
      await this.page.type('textarea[placeholder*="prompt"]', options.prompt);
      
      // 스타일 선택 (있는 경우)
      if (options.style) {
        console.log(`[Suno Service] 스타일 선택: ${options.style}`);
        // 스타일 드롭다운 열기
        await this.page.click('button[aria-label*="Style"]');
        // 스타일 선택 (실제 선택자는 Suno 페이지에 맞게 조정 필요)
        await this.page.waitForSelector('.style-dropdown', { visible: true });
        await this.page.evaluate((style) => {
          const styleElements = Array.from(document.querySelectorAll('.style-item'));
          const targetElement = styleElements.find(el => el.textContent?.toLowerCase().includes(style.toLowerCase()));
          if (targetElement) {
            (targetElement as HTMLElement).click();
          }
        }, options.style);
      }
      
      // 가사 입력 (있는 경우)
      if (options.lyrics) {
        console.log(`[Suno Service] 가사 입력 (${options.lyrics.length} 자)`);
        // 가사 입력 모드 전환 (실제 선택자는 Suno 페이지에 맞게 조정 필요)
        await this.page.click('button[aria-label*="Lyrics"]');
        await this.page.waitForSelector('textarea[placeholder*="lyrics"]', { visible: true });
        await this.page.type('textarea[placeholder*="lyrics"]', options.lyrics);
      }
      
      // 보컬 성별 선택 (있는 경우)
      if (options.vocalGender) {
        console.log(`[Suno Service] 보컬 성별 선택: ${options.vocalGender}`);
        // 보컬 드롭다운 열기
        await this.page.click('button[aria-label*="Voice"]');
        // 성별 선택 (실제 선택자는 Suno 페이지에 맞게 조정 필요)
        await this.page.waitForSelector('.voice-dropdown', { visible: true });
        await this.page.evaluate((gender) => {
          const genderMap: {[key: string]: string} = {
            'male': 'Male',
            'female': 'Female',
            'none': 'Instrumental'
          };
          const genderElements = Array.from(document.querySelectorAll('.voice-item'));
          const targetElement = genderElements.find(el => 
            el.textContent?.includes(genderMap[gender])
          );
          if (targetElement) {
            (targetElement as HTMLElement).click();
          }
        }, options.vocalGender);
      }
      
      // 길이 선택 (있는 경우)
      if (options.duration) {
        console.log(`[Suno Service] 길이 선택: ${options.duration}초`);
        // 길이 드롭다운 열기
        await this.page.click('button[aria-label*="Duration"]');
        // 길이 선택 (실제 선택자는 Suno 페이지에 맞게 조정 필요)
        await this.page.waitForSelector('.duration-dropdown', { visible: true });
        await this.page.evaluate((duration) => {
          const durationText = `${parseInt(duration) / 60} min`;
          const durationElements = Array.from(document.querySelectorAll('.duration-item'));
          const targetElement = durationElements.find(el => 
            el.textContent?.includes(durationText)
          );
          if (targetElement) {
            (targetElement as HTMLElement).click();
          }
        }, options.duration);
      }
      
      // Create 버튼 클릭
      console.log('[Suno Service] Create 버튼 클릭');
      await this.page.click('button[aria-label="Create"]');
      
      // 음악 생성 대기
      console.log('[Suno Service] 음악 생성 중...');
      await this.page.waitForSelector('.generation-complete', { timeout: 300000 }); // 최대 5분 대기
      
      // 곡 정보 추출
      console.log('[Suno Service] 음악 생성 완료. 정보 추출 중...');
      const musicInfo = await this.extractMusicInfo();
      
      // MP3 다운로드
      console.log('[Suno Service] MP3 다운로드 중...');
      const downloadResult = await this.downloadMusic();
      
      // 결과 반환
      return {
        success: true,
        audioUrl: downloadResult.audioUrl,
        localPath: downloadResult.localPath,
        lyrics: musicInfo.lyrics,
        title: musicInfo.title || options.title || `Suno-${nanoid(6)}`,
        duration: musicInfo.duration,
        coverImageUrl: musicInfo.coverImageUrl
      };
    } catch (error) {
      console.error('[Suno Service] 음악 생성 중 오류:', error);
      return {
        success: false,
        error: `음악 생성 중 오류: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * 생성된 음악 정보 추출
   */
  private async extractMusicInfo(): Promise<{
    title?: string;
    lyrics?: string;
    duration?: number;
    coverImageUrl?: string;
  }> {
    if (!this.page) {
      throw new Error('페이지가 초기화되지 않았습니다.');
    }
    
    return await this.page.evaluate(() => {
      // 실제 Suno 페이지의 DOM 구조에 맞게 정보 추출 로직 조정 필요
      const title = document.querySelector('.song-title')?.textContent?.trim();
      
      // 가사 추출
      let lyrics = '';
      const lyricsElements = document.querySelectorAll('.lyrics-line');
      lyricsElements.forEach(el => {
        lyrics += el.textContent?.trim() + '\n';
      });
      
      // 길이 추출
      const durationText = document.querySelector('.duration-info')?.textContent?.trim();
      let duration: number | undefined;
      if (durationText) {
        const match = durationText.match(/(\d+):(\d+)/);
        if (match) {
          const minutes = parseInt(match[1]);
          const seconds = parseInt(match[2]);
          duration = minutes * 60 + seconds;
        }
      }
      
      // 커버 이미지 URL 추출 (있는 경우)
      const coverImageEl = document.querySelector('.cover-image') as HTMLImageElement;
      const coverImageUrl = coverImageEl?.src;
      
      return { title, lyrics, duration, coverImageUrl };
    });
  }

  /**
   * 생성된 음악 다운로드
   */
  private async downloadMusic(): Promise<{ audioUrl: string; localPath: string }> {
    if (!this.page) {
      throw new Error('페이지가 초기화되지 않았습니다.');
    }
    
    // 다운로드 버튼 클릭
    await this.page.click('button[aria-label="Download"]');
    
    // 다운로드 다이얼로그에서 MP3 선택
    await this.page.waitForSelector('.download-option[data-format="mp3"]', { visible: true });
    await this.page.click('.download-option[data-format="mp3"]');
    
    // 다운로드 URL 가져오기
    const mp3Url = await this.page.evaluate(() => {
      const downloadLink = document.querySelector('.download-link[data-format="mp3"]') as HTMLAnchorElement;
      return downloadLink?.href;
    });
    
    if (!mp3Url) {
      throw new Error('MP3 다운로드 URL을 찾을 수 없습니다.');
    }
    
    // 파일 다운로드
    const fileName = `suno-${Date.now()}.mp3`;
    const filePath = path.join(this.uploadsDir, fileName);
    
    // mp3Url에서 직접 파일 다운로드 (fetch 사용)
    const response = await fetch(mp3Url);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));
    
    // 서비스에서 접근 가능한 URL 반환
    const audioUrl = `/uploads/suno/${fileName}`;
    
    return { audioUrl, localPath: filePath };
  }

  /**
   * 서비스 종료 및 리소스 정리
   */
  public async shutdown(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      this.isInitialized = false;
      console.log('[Suno Service] 서비스가 종료되었습니다.');
    } catch (error) {
      console.error('[Suno Service] 종료 중 오류:', error);
    }
  }
}

// 싱글톤 인스턴스 생성
export const sunoService = new SunoService();