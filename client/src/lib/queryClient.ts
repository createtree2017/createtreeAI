import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  options: {
    url: string;
    method?: string;
    data?: any;
    headers?: Record<string, string>;
  },
): Promise<any> {
  const res = await fetch(options.url, {
    method: options.method || "GET",
    headers: {
      ...(options.data ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    },
    body: options.data ? JSON.stringify(options.data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // 빈 응답인 경우 (예: 204 No Content) null 반환
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return null;
  }
  
  // JSON 응답이 아닌 경우 응답 그대로 반환
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return res;
  }
  
  return res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // 창이 포커스될 때 자동으로 리페치 (새로운 데이터가 있는지 확인)
      staleTime: 10000, // 10초 후에 데이터를 stale로 간주 (기존 Infinity에서 변경)
      gcTime: 300000, // 비활성 캐시 유지 시간 (5분) - v5에서는 cacheTime이 gcTime으로 변경됨
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
