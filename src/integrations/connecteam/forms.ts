/**
 * Lightweight Connecteam forms integration helpers.
 * These helpers rely on an API base/key being provided via environment variables at runtime.
 * They are intentionally resilient – if the integration is not configured the helpers
 * simply return empty datasets so the rest of the analytics pipeline keeps working.
 */

const CONNECTEAM_API_BASE = import.meta.env.VITE_CONNECTEAM_API_BASE ?? 'https://api.connecteam.com/v1';
const CONNECTEAM_API_KEY = import.meta.env.VITE_CONNECTEAM_API_KEY ?? '';

export interface ConnecteamForm {
  id: string;
  title: string;
  updatedAt: string;
  categories: string[];
}

export interface ConnecteamFormSubmission {
  id: string;
  formId: string;
  submittedAt: string;
  payload: Record<string, unknown>;
}

interface FetchParams {
  start?: string;
  end?: string;
}

async function callConnecteam<T>(path: string, params: FetchParams = {}): Promise<T> {
  if (!CONNECTEAM_API_KEY) {
    // Integration not configured – return empty data
    return Promise.resolve([] as unknown as T);
  }

  const url = new URL(`${CONNECTEAM_API_BASE.replace(/\/$/, '')}/${path.replace(/^\//, '')}`);
  if (params.start) url.searchParams.set('start', params.start);
  if (params.end) url.searchParams.set('end', params.end);

  const response = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': CONNECTEAM_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Connecteam request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function fetchConnecteamForms(params: FetchParams = {}): Promise<ConnecteamForm[]> {
  try {
    const data = await callConnecteam<{ data: ConnecteamForm[] }>('forms', params);
    if (Array.isArray((data as any).data)) {
      return (data as any).data as ConnecteamForm[];
    }
    return data as unknown as ConnecteamForm[];
  } catch (error) {
    console.warn('Connecteam forms fetch failed', error);
    return [];
  }
}

export async function fetchConnecteamFormSubmissions(
  formId: string,
  params: FetchParams = {},
): Promise<ConnecteamFormSubmission[]> {
  if (!formId) return [];
  try {
    const data = await callConnecteam<{ data: ConnecteamFormSubmission[] }>(`forms/${formId}/submissions`, params);
    if (Array.isArray((data as any).data)) {
      return (data as any).data as ConnecteamFormSubmission[];
    }
    return data as unknown as ConnecteamFormSubmission[];
  } catch (error) {
    console.warn(`Connecteam submissions fetch failed for form ${formId}`, error);
    return [];
  }
}
