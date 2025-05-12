// client/src/lib/api.ts - API 호출을 위한 유틸리티 함수 및 인터페이스

// 기본 URL (필요한 경우 환경에 맞게 설정)
const baseURL = '';

// 공통 fetch 헬퍼 함수
async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  // 헤더 설정
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  // credentials 설정 (쿠키 포함)
  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  };
  
  // API 요청 수행
  console.log(`API 요청: ${url}`, fetchOptions);
  
  try {
    const response = await fetch(`${baseURL}${url}`, fetchOptions);
    
    // 응답 상태 확인
    if (!response.ok) {
      console.error(`API 오류 (${response.status}): ${response.statusText}`);
      
      if (response.status === 401) {
        console.warn('인증 오류 발생: 로그인이 필요합니다.');
      }
      
      // 오류 응답 내용 확인 시도
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || `API 오류: ${response.statusText}`);
      } catch (parseError) {
        throw new Error(`API 오류 (${response.status}): ${response.statusText}`);
      }
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
  catch (error) {
    console.error('API 요청 실패:', error);
    throw error;
  }
}

// API 함수들
export async function testLogin() {
  return apiFetch('/api/test-login', {
    method: 'POST',
  });
}

export async function login(username: string, password: string) {
  return apiFetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function logout() {
  return apiFetch('/api/logout', {
    method: 'POST',
  });
}

export async function getCurrentUser() {
  try {
    return await apiFetch('/api/user');
  } catch (error) {
    if (error instanceof Error && error.message.includes('401')) {
      console.log('사용자 인증되지 않음');
      return null;
    }
    throw error;
  }
}

export async function transformImage(formData: FormData) {
  return apiFetch('/api/image/transform', {
    method: 'POST',
    body: formData,
  });
}

export async function getGalleryItems(filter = '') {
  const queryParams = filter ? `?filter=${encodeURIComponent(filter)}` : '';
  return apiFetch<any[]>(`/api/gallery${queryParams}`);
}

export async function generateMusic(formData: any) {
  return apiFetch('/api/music/generate', {
    method: 'POST',
    body: JSON.stringify(formData),
  });
}

export async function getMusicList(filter = '') {
  const queryParams = filter ? `?filter=${encodeURIComponent(filter)}` : '';
  return apiFetch<any[]>(`/api/music${queryParams}`);
}

export async function shareMedia(mediaId: string, mediaType: string) {
  return apiFetch('/api/share', {
    method: 'POST',
    body: JSON.stringify({ mediaId, mediaType }),
  });
}

export async function downloadMedia(url: string, filename = '') {
  try {
    console.log(`미디어 다운로드 시작: ${url}`);
    
    const response = await fetch(url, { credentials: 'include' });
    
    if (!response.ok) {
      throw new Error(`다운로드 실패: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    // 파일명이 제공되지 않은 경우 URL에서 추출 시도
    if (!filename) {
      const urlParts = url.split('/');
      filename = urlParts[urlParts.length - 1].split('?')[0];
    }
    
    // 다운로드 링크 생성 및 클릭
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // URL 객체 해제
    setTimeout(() => {
      window.URL.revokeObjectURL(downloadUrl);
    }, 100);
    
    console.log(`미디어 다운로드 완료: ${filename}`);
    return true;
  } catch (error) {
    console.error('미디어 다운로드 오류:', error);
    return false;
  }
}

export async function recordAbTestResult(data: { testId: string; selectedVariantId: string }) {
  return apiFetch('/api/tests/record-result', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function batchImportPersonas(data: any) {
  return apiFetch('/api/personas/batch-import', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function saveChat(data: any) {
  return apiFetch('/api/chat/save', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getActiveAbTest() {
  return apiFetch('/api/tests/active');
}

export async function sendChatMessage(message: string) {
  return apiFetch('/api/chat/message', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function getChatHistory() {
  return apiFetch('/api/chat/history');
}

export async function toggleFavorite(itemId: number, type: string) {
  return apiFetch('/api/gallery/favorite', {
    method: 'POST',
    body: JSON.stringify({ itemId, type }),
  });
}

// 카테고리 관리 API 함수들
export async function getServiceCategories() {
  return apiFetch('/api/admin/service-categories');
}

export async function createServiceCategory(data: {
  categoryId: string;
  title: string;
  icon: string;
  isPublic: boolean;
  order: number;
}) {
  return apiFetch('/api/admin/service-categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateServiceCategory(id: number, data: {
  categoryId?: string;
  title?: string;
  icon?: string;
  isPublic?: boolean;
  order?: number;
}) {
  return apiFetch(`/api/admin/service-categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteServiceCategory(id: number) {
  return apiFetch(`/api/admin/service-categories/${id}`, {
    method: 'DELETE',
  });
}

// 모든 API 함수를 포함하는 객체 생성
const api = {
  testLogin,
  login,
  logout,
  getCurrentUser,
  transformImage,
  getGalleryItems,
  generateMusic,
  getMusicList,
  shareMedia,
  downloadMedia,
  recordAbTestResult,
  batchImportPersonas,
  saveChat,
  getActiveAbTest,
  sendChatMessage,
  getChatHistory,
  toggleFavorite,
  getServiceCategories,
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory
};

// 기본 내보내기 
export default api;