// API 호출을 위한 기본 설정
export const api = {
  // API 기본 URL
  baseURL: '',

  // fetch 헬퍼 함수
  async fetch<T>(url: string, options: RequestInit = {}): Promise<T> {
    // 헤더 설정
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type') && options.method !== 'GET') {
      headers.set('Content-Type', 'application/json');
    }

    // 요청 옵션 병합
    const fetchOptions = {
      ...options,
      headers,
      credentials: 'include' as RequestCredentials, // 쿠키 포함 (중요!)
    };

    // API 요청 실행 - 디버깅 로그 추가
    console.log(`API 요청: ${options.method || 'GET'} ${url} (쿠키 포함: ${document.cookie || '없음'})`);
    const response = await fetch(`${this.baseURL}${url}`, fetchOptions);
    console.log(`API 응답: ${response.status} ${response.statusText}`);

    // 응답 처리
    if (!response.ok) {
      // 오류 응답 처리
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

    // 성공 응답 처리
    try {
      // 세션 쿠키가 응답에 포함된 경우 세트쿠키 헤더 확인
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        console.log('API 응답에 새로운 쿠키 포함됨:', setCookie);
      }

      return await response.json() as T;
    } catch (error) {
      console.error('API 응답 파싱 오류:', error);
      throw new Error('API 응답 파싱 오류');
    }
  },

  // 로그인 API
  async login(username: string, password: string) {
    return this.fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  // 테스트 로그인 API (개발용)
  async testLogin() {
    return this.fetch('/api/test-login', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  // 로그아웃 API
  async logout() {
    return this.fetch('/api/auth/logout', {
      method: 'POST',
    });
  },

  // 사용자 정보 조회 API
  async getCurrentUser() {
    try {
      return await this.fetch('/api/auth/me');
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
    // multipart/form-data로 전송 (Content-Type은 자동 설정됨)
    return this.fetch('/api/image/transform', {
      method: 'POST',
      body: formData,
      // Content-Type 헤더는 자동으로 설정됨
    });
  },

  // 기타 API 메서드들...
};