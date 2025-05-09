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
}

export const getQueryFn = 
  (options: ApiRequestOptions = {}) => 
  async <T>({ queryKey }: { queryKey: string[] }): Promise<T | null> => {
    const [url] = queryKey;
    const token = localStorage.getItem("accessToken");
    
    const headers: HeadersInit = {
      ...options.headers,
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        if (response.status === 401 && options.on401 === "returnNull") {
          return null;
        }
        throw new Error(`API error ${response.status}: ${await response.text()}`);
      }
      
      return await response.json() as T;
    } catch (error) {
      console.error(`API error for ${url}:`, error);
      throw error;
    }
  };

export const apiRequest = async (
  method: string,
  url: string,
  body?: any,
  options: ApiRequestOptions = {}
): Promise<Response> => {
  const token = localStorage.getItem("accessToken");
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const config: RequestInit = {
    method,
    headers,
    credentials: "include",
  };
  
  if (body && method !== "GET") {
    config.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, config);
  
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
    throw error;
  }
  
  return response;
};