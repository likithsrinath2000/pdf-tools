import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * React Query Client Configuration
 * 
 * Caching Strategy:
 * - staleTime: 5 minutes - Data remains fresh and won't be refetched for 5 minutes.
 *   This reduces unnecessary API calls for data that doesn't change frequently.
 * 
 * - gcTime (previously cacheTime): 30 minutes - Cached data is kept in memory
 *   for 30 minutes after it's no longer being used. This allows for quick
 *   restoration if the user navigates back to a page.
 * 
 * - retry: 3 attempts with exponential backoff - Automatically retries failed
 *   requests up to 3 times before throwing an error, improving resilience
 *   against temporary network issues.
 * 
 * - refetchOnWindowFocus: false - Prevents automatic refetching when the user
 *   returns to the tab, reducing unnecessary network requests.
 */

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
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
    const res = await fetch(queryKey.join("/") as string, {
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
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh, reducing refetch frequency
      gcTime: 30 * 60 * 1000, // 30 minutes - cache retention for inactive queries
      retry: 3, // Retry failed requests up to 3 times
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
    mutations: {
      retry: 1, // Retry failed mutations once
      retryDelay: 1000, // 1 second delay before retry
    },
  },
});
