// 타입 안전한, 더 간단한 API 클라이언트
import { QueryClient } from "@tanstack/react-query";

// 메인 QueryClient 인스턴스 (React Query에서 사용)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

// API 요청 옵션 타입
export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  data?: any;
  params?: Record<string, string | number | boolean>;
  on401?: "throw" | "returnNull";
}

/**
 * 기본 API 요청 함수
 */
export async function apiRequest(
  url: string,
  options: ApiRequestOptions = {}
): Promise<Response> {
  const method = options.method || "GET";
  
  // 기본 헤더 설정
  const headers: Record<string, string> = {
    ...options.headers,
  };

  // GET이 아니고 FormData가 아닌 경우에만 Content-Type 설정
  if (method !== "GET" && !(options.data instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  
  // URL에 쿼리 파라미터 추가
  let finalUrl = url;
  if (options.params) {
    const queryParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, value]) => {
      queryParams.append(key, String(value));
    });
    
    const queryString = queryParams.toString();
    if (queryString) {
      finalUrl = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
    }
  }
  
  // fetch 요청 설정
  const config: RequestInit = {
    method,
    headers,
    credentials: "include",
  };
  
  // 요청 본문 처리
  if (options.data !== undefined && method !== "GET") {
    if (options.data instanceof FormData) {
      config.body = options.data;
    } else {
      config.body = JSON.stringify(options.data);
    }
  }
  
  console.log(`API 요청: ${method} ${finalUrl}`);
  const response = await fetch(finalUrl, config);
  
  // 오류 응답 처리
  if (!response.ok) {
    // 401 특수 처리
    if (response.status === 401 && options.on401 === "returnNull") {
      return response;
    }
    
    // 기타 오류 처리
    const responseText = await response.text();
    let errorMessage = `API error ${response.status}`;
    
    try {
      const errorData = JSON.parse(responseText);
      errorMessage = errorData.message || errorMessage;
    } catch {
      errorMessage = responseText || errorMessage;
    }
    
    const error = new Error(errorMessage);
    console.error(`API 오류: ${method} ${finalUrl}`, error);
    throw error;
  }
  
  return response;
}

/**
 * 타입 안전한 API 호출 함수
 */
export async function fetchApi<T = any>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  const response = await apiRequest(url, options);
  
  // 401 상태에서 returnNull 옵션이 설정된 경우 null 반환
  if (response.status === 401 && options.on401 === "returnNull") {
    return null as unknown as T;
  }
  
  // JSON 응답 파싱
  return await response.json() as T;
}

/**
 * GET 요청 도우미
 */
export async function getApi<T = any>(
  url: string, 
  params?: Record<string, string | number | boolean>, 
  options: Omit<ApiRequestOptions, 'method' | 'params'> = {}
): Promise<T> {
  return fetchApi<T>(url, { ...options, method: "GET", params });
}

/**
 * POST 요청 도우미
 */
export async function postApi<T = any>(
  url: string, 
  data?: any, 
  options: Omit<ApiRequestOptions, 'method' | 'data'> = {}
): Promise<T> {
  return fetchApi<T>(url, { ...options, method: "POST", data });
}

/**
 * PUT 요청 도우미
 */
export async function putApi<T = any>(
  url: string, 
  data?: any, 
  options: Omit<ApiRequestOptions, 'method' | 'data'> = {}
): Promise<T> {
  return fetchApi<T>(url, { ...options, method: "PUT", data });
}

/**
 * PATCH 요청 도우미
 */
export async function patchApi<T = any>(
  url: string, 
  data?: any, 
  options: Omit<ApiRequestOptions, 'method' | 'data'> = {}
): Promise<T> {
  return fetchApi<T>(url, { ...options, method: "PATCH", data });
}

/**
 * DELETE 요청 도우미
 */
export async function deleteApi<T = any>(
  url: string, 
  options: Omit<ApiRequestOptions, 'method'> = {}
): Promise<T> {
  return fetchApi<T>(url, { ...options, method: "DELETE" });
}

/**
 * React Query의 queryFn 생성 도우미
 */
export const getQueryFn = 
  (options: ApiRequestOptions = {}) => 
  async <T>({ queryKey }: { queryKey: string[] }): Promise<T | null> => {
    const [url] = queryKey;
    return getApi<T>(url, options.params, options);
  };

// 직접 API 함수들
export const api = {
  // 인증 관련
  testLogin: () => postApi('/api/test-login'),
  login: (username: string, password: string) => postApi('/api/login', { username, password }),
  logout: () => postApi('/api/logout'),
  getCurrentUser: () => getApi('/api/user', undefined, { on401: 'returnNull' }),
  
  // 갤러리 및 미디어
  getGalleryItems: (filter = '') => getApi(`/api/gallery${filter ? `?filter=${filter}` : ''}`),
  transformImage: (formData: FormData) => postApi('/api/image/transform', formData),
  getImageList: (page = 1, pageSize = 20, filterByUser = true) => {
    const params: Record<string, any> = { page, pageSize };
    if (filterByUser === false) params.filterByUser = 'false';
    return getApi('/api/image/list', params);
  },
  generateMusic: (data: any) => postApi('/api/music/generate', data),
  getMusicList: (filter = '') => getApi(`/api/music${filter ? `?filter=${filter}` : ''}`),
  shareMedia: (mediaId: string, mediaType: string) => postApi('/api/share', { mediaId, mediaType }),
  toggleFavorite: (itemId: number, type: string) => postApi('/api/gallery/favorite', { itemId, type }),
  
  // 채팅 관련
  sendChatMessage: (message: string, ephemeral = false, systemPrompt?: string) => 
    postApi('/api/chat/message', { message, ephemeral, systemPrompt }),
  getChatHistory: () => getApi('/api/chat/history'),
  saveChat: (data: any) => postApi('/api/chat/save', data),
  
  // 테스트 및 관리자
  getActiveAbTest: () => getApi('/api/tests/active'),
  recordAbTestResult: (data: { testId: string; selectedVariantId: string }) => 
    postApi('/api/tests/record-result', data),
  
  // 페르소나 관리
  getPersonas: () => getApi('/api/admin/personas'),
  createPersona: (data: any) => postApi('/api/admin/personas', data),
  updatePersona: (id: string, data: any) => patchApi(`/api/admin/personas/${id}`, data),
  deletePersona: (id: string) => deleteApi(`/api/admin/personas/${id}`),
  batchImportPersonas: (data: any) => postApi('/api/admin/personas/batch-import', data),
  
  // 카테고리 관리
  getServiceCategories: () => getApi('/api/admin/service-categories'),
  createServiceCategory: (data: any) => postApi('/api/admin/service-categories', data),
  updateServiceCategory: (id: number, data: any) => patchApi(`/api/admin/service-categories/${id}`, data),
  deleteServiceCategory: (id: number) => deleteApi(`/api/admin/service-categories/${id}`),
  
  // 언어 관리
  getLanguages: () => getApi('/api/admin/languages'),
  uploadTranslations: (formData: FormData) => postApi('/api/admin/translations/upload', formData),
  
  // 파일 다운로드 (특수 처리)
  downloadMedia: async (url: string, filename = '') => {
    try {
      const response = await fetch(url, { credentials: 'include' });
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || url.split('/').pop() || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);
      
      return true;
    } catch (error) {
      console.error('Media download error:', error);
      return false;
    }
  }
};