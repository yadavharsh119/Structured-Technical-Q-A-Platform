import { ApiResponse, HealthCheckData } from '@structured-qa/shared';

const API_BASE_URL = '/api';

export async function fetchHealth(): Promise<ApiResponse<HealthCheckData>> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    const json = (await res.json()) as ApiResponse<HealthCheckData>;
    return json;
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Failed to connect to backend',
      },
    };
  }
}
