// src/lib/api.ts
// API 호출을 위한 유틸리티 함수 및 객체

// 기본 URL (필요한 경우 환경에 맞게 설정)
const baseURL = '';

// API 인터페이스 정의
interface ApiInterface {
  testLogin(): Promise<any>;
  login(username: string, password: string): Promise<any>;
  logout(): Promise<any>;
  getCurrentUser(): Promise<any>;
  transformImage(formData: FormData): Promise<any>;
  getGalleryItems(filter?: string): Promise<any[]>;
  generateMusic(formData: any): Promise<any>;
  getMusicList(filter?: string): Promise<any[]>;
  shareMedia(mediaId: string, mediaType: string): Promise<any>;
  downloadMedia(url: string, filename?: string): Promise<boolean>;
  recordAbTestResult(data: { testId: string; selectedVariantId: string }): Promise<any>;
  batchImportPersonas(data: any): Promise<any>;
  saveChat(data: any): Promise<any>;
  getActiveAbTest(): Promise<any>;
}

// 공통 fetch 헬퍼 함수
async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  // 헤더 설정
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }

  // 요청 옵션 설정 (항상 쿠키 포함하도록)
  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // 쿠키 포함 (중요!)
  };

  // 디버깅을 위한 로그
  console.log(`API 요청: ${options.method || 'GET'} ${url} (쿠키 포함: ${document.cookie || '없음'})`);
  
  // 요청 실행
  const response = await fetch(`${baseURL}${url}`, fetchOptions);
  console.log(`API 응답: ${response.status} ${response.statusText}`);

  // 요청 실패 처리
  if (!response.ok) {
    let errorMessage = 'API 요청 실패';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // JSON 파싱 실패 시 상태 텍스트 사용
      errorMessage = response.statusText || errorMessage;
    }

    console.error(`API 오류: ${url} - ${errorMessage}`);
    throw new Error(errorMessage);
  }

  // 세션 쿠키 확인 (디버깅용)
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    console.log('API 응답에 새로운 쿠키 포함됨:', setCookie);
  }

  // 응답 데이터 파싱
  try {
    return await response.json() as T;
  } catch (error) {
    console.error('API 응답 파싱 오류:', error);
    throw new Error('API 응답 파싱 오류');
  }
}

// API 기능 모음
const api: ApiInterface = {
  // 테스트 로그인 API (개발용)
  async testLogin() {
    return apiFetch('/api/test-login', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  // 로그인 API
  async login(username: string, password: string) {
    return apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  // 로그아웃 API
  async logout() {
    return apiFetch('/api/auth/logout', {
      method: 'POST',
    });
  },

  // 사용자 정보 조회 API
  async getCurrentUser() {
    try {
      return await apiFetch('/api/auth/me');
    } catch (error) {
      // 인증 오류나 네트워크 오류는 null 반환
      if (error instanceof Error && error.message.includes('401')) {
        console.log('API: 사용자 인증되지 않음 (401)');
        return null;
      }
      console.error('API: 사용자 정보 조회 오류', error);
      throw error;
    }
  },

  // 이미지 변환 API
  async transformImage(formData: FormData) {
    return apiFetch('/api/image/transform', {
      method: 'POST',
      body: formData,
    });
  },

  // 갤러리 아이템 조회 API
  async getGalleryItems(filter?: string) {
    let url = '/api/gallery';
    if (filter) {
      url += `?filter=${filter}`;
    }
    
    try {
      return await apiFetch(url);
    } catch (error) {
      console.error('갤러리 아이템 조회 오류:', error);
      return [];
    }
  },
  
  // 음악 생성 API
  async generateMusic(formData: any) {
    return apiFetch('/api/music/generate', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
  },
  
  // 음악 목록 조회 API
  async getMusicList(filter?: string) {
    let url = '/api/music';
    if (filter) {
      url += `?filter=${filter}`;
    }
    
    try {
      return await apiFetch(url);
    } catch (error) {
      console.error('음악 목록 조회 오류:', error);
      return [];
    }
  },
  
  // 미디어 공유 API
  async shareMedia(mediaId: string, mediaType: string) {
    return apiFetch('/api/share', {
      method: 'POST',
      body: JSON.stringify({ mediaId, mediaType }),
    });
  },
  
  // 미디어 다운로드 API
  async downloadMedia(url: string, filename?: string) {
    try {
      // 전체 URL이 제공된 경우 그대로 사용, 아니면 baseURL과 결합
      const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`;
      
      // 다운로드 요청
      const response = await fetch(fullUrl, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`다운로드 실패: ${response.status} ${response.statusText}`);
      }
      
      // Blob으로 응답 변환
      const blob = await response.blob();
      
      // 다운로드 링크 생성
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename || url.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      
      // 정리
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
      return true;
    } catch (error) {
      console.error('미디어 다운로드 오류:', error);
      return false;
    }
  },
  
  // AB 테스트 결과 기록 API
  async recordAbTestResult(data: { testId: string; selectedVariantId: string }) {
    return apiFetch('/api/tests/record-result', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  // 페르소나 일괄 가져오기 API
  async batchImportPersonas(data: any) {
    return apiFetch('/api/admin/personas/batch-import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  // 채팅 저장 API
  async saveChat(data: any) {
    return apiFetch('/api/chat/save', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  // 활성 AB 테스트 조회 API
  async getActiveAbTest() {
    return apiFetch('/api/tests/active');
  },
};

// 각 함수 개별 내보내기 (호환성 유지)
export async function generateMusic(formData: any) {
  return api.generateMusic(formData);
}

export async function getMusicList(filter?: string) {
  return api.getMusicList(filter);
}

export async function shareMedia(mediaId: string, mediaType: string) {
  return api.shareMedia(mediaId, mediaType);
}

export function downloadMedia(url: string, filename?: string) {
  return api.downloadMedia(url, filename);
}

export async function recordAbTestResult(data: { testId: string; selectedVariantId: string }) {
  return api.recordAbTestResult(data);
}

export async function batchImportPersonas(data: any) {
  return api.batchImportPersonas(data);
}

export async function saveChat(data: any) {
  return api.saveChat(data);
}

export async function getActiveAbTest() {
  return api.getActiveAbTest();
}

// 기본 내보내기 (default export)
export default api;