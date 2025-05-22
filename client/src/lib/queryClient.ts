import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

export interface ApiRequestOptions {
  headers?: HeadersInit;
  on401?: "throw" | "returnNull";
  params?: Record<string, string | number | boolean>;
  method?: string;
  data?: any;
}

export const getQueryFn = 
  (options: ApiRequestOptions = {}) => 
  async <T>({ queryKey }: { queryKey: string[] }): Promise<T | null> => {
    const [url] = queryKey;
    
    try {
      // 기존 apiRequest 함수 재사용
      const response = await apiRequest(url, {
        ...options,
        method: 'GET'
      });
      
      if (response.status === 401 && options.on401 === "returnNull") {
        return null;
      }
      
      // Content-Type 헤더 확인
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error(`API 응답이 JSON 형식이 아닙니다: ${url}`, contentType);
        throw new Error(`서버가 유효하지 않은 응답 형식을 반환했습니다 (${contentType || '없음'})`);
      }
      
      return await response.json() as T;
    } catch (error) {
      console.error(`API error for ${url}:`, error);
      
      if (options.on401 === "returnNull") {
        return null;
      }
      
      throw error;
    }
  };

export const apiRequest = async (
  url: string,
  options: ApiRequestOptions = {}
): Promise<Response> => {
  const method = options.method || "GET";
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // JWT 토큰이 있으면 Authorization 헤더에 포함
  const jwtToken = localStorage.getItem('jwt_token');
  if (jwtToken) {
    headers['Authorization'] = `Bearer ${jwtToken}`;
    console.log("[JWT 토큰] Authorization 헤더에 포함됨");
  }
  
  // URL에 쿼리 파라미터 추가 처리
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
  
  const config: RequestInit = {
    method,
    headers,
    credentials: "include",
  };
  
  // 요청 본문 데이터 처리
  if (options.data && method !== "GET") {
    config.body = JSON.stringify(options.data);
  }
  
  console.log(`API 요청: ${method} ${finalUrl}`);
  const response = await fetch(finalUrl, config);
  
  if (!response.ok) {
    if (response.status === 401 && options.on401 === "returnNull") {
      return response;
    }
    
    // 응답의 Content-Type 확인
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    // 응답 내용 가져오기
    const responseText = await response.text();
    let errorMessage = `API error ${response.status}`;
    
    // JSON 응답인 경우 에러 메시지 추출 시도
    if (isJson && responseText) {
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (parseError) {
        console.warn("JSON 파싱 오류:", parseError);
        errorMessage = responseText || errorMessage;
      }
    } else {
      // HTML 또는 다른 형식의 응답인 경우
      errorMessage = "서버가 예상치 못한 응답을 반환했습니다. 관리자에게 문의하세요.";
      console.error("비정상 응답:", responseText);
    }
    
    const error = new Error(errorMessage);
    console.error(`API 오류: ${method} ${finalUrl}`, error);
    throw error;
  }
  
  return response;
};