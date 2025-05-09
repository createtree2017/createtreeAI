import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

interface ApiRequestOptions {
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
};