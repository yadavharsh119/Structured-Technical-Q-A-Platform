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

function suspendedUntilFrom(details: unknown): string | null {
  if (!details || typeof details !== 'object') return null;
  const value = (details as { suspendedUntil?: unknown }).suspendedUntil;
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
}

function withAccountStatusMessage<T>(payload: ApiResponse<T>): ApiResponse<T> {
  if (payload.success) return payload;

  let message: string | null = null;
  if (payload.error.code === 'ACCOUNT_BANNED') {
    message = 'Your account is banned. You cannot submit content or vote.';
  } else if (payload.error.code === 'ACCOUNT_SUSPENDED') {
    const until = suspendedUntilFrom(payload.error.details);
    message = until
      ? `Your account is suspended until ${until}. You cannot submit content or vote until then.`
      : 'Your account is suspended until the suspension ends. You cannot submit content or vote until then.';
  }

  if (!message) return payload;
  return { ...payload, error: { ...payload.error, message } };
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  const { headers, ...rest } = init;
  const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData;
  try {
    const res = await fetch(`/api${path}`, {
      credentials: 'include',
      ...rest,
      headers: { ...(isFormData ? {} : { 'Content-Type': 'application/json' }), ...headers },
    });
    return withAccountStatusMessage((await res.json()) as ApiResponse<T>);
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
