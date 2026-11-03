import type { ApiResponse } from '@structured-qa/shared';

export interface DownloadedFile {
  blob: Blob;
  filename: string;
}

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  return match ? decodeURIComponent(match[1].trim()) : null;
}

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

export async function apiDownload(
  path: string,
  init: RequestInit = {},
): Promise<ApiResponse<DownloadedFile>> {
  const { headers, ...rest } = init;
  try {
    const res = await fetch(`/api${path}`, {
      credentials: 'include',
      ...rest,
      headers: { 'Content-Type': 'application/json', ...headers },
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as ApiResponse<never> | null;
      if (payload && !payload.success) return payload;
      return {
        success: false,
        error: {
          code: 'DOWNLOAD_FAILED',
          message: `The download failed (${res.status}).`,
        },
      };
    }

    const blob = await res.blob();
    return {
      success: true,
      data: {
        blob,
        filename:
          filenameFromDisposition(res.headers.get('Content-Disposition')) ?? 'account-export.zip',
      },
    };
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
