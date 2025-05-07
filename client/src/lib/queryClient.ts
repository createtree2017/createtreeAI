import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    body?: string;
    data?: any;
    headers?: Record<string, string>;
  },
): Promise<Response> {
  // data가 있으면 JSON으로 직렬화하여 body에 넣음
  const body = options?.data 
    ? JSON.stringify(options.data)
    : options?.body;

  const res = await fetch(url, {
    method: options?.method || "GET",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(options?.headers || {})
    },
    body: body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
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
