import type { ApiResponse } from '@structured-qa/shared';

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  const { headers, ...rest } = init;
  try {
    const res = await fetch(`/api${path}`, {
      credentials: 'include',
      ...rest,
      headers: { 'Content-Type': 'application/json', ...headers },
    });
    return (await res.json()) as ApiResponse<T>;
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Unable to reach the server.',
      },
    };
  }
}
