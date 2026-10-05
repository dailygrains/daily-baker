// Test responses are inspected structurally; precise typing would add noise.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject } from 'vitest';

export type ApiResponse<T = any> = {
  status: number;
  body: { success: boolean; data?: T; error?: string; details?: unknown; meta?: Record<string, number> };
};

/** Minimal REST client bound to one API key. */
export function client(key: string) {
  const base = inject('apiBase');

  async function call<T = any>(method: string, path: string, body?: unknown): Promise<ApiResponse<T>> {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    // Some responses (e.g. Next's 405 for an unexported method) have no body.
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : { success: false } };
  }

  return {
    get: <T = any>(path: string) => call<T>('GET', path),
    post: <T = any>(path: string, body: unknown) => call<T>('POST', path, body),
    put: <T = any>(path: string, body: unknown) => call<T>('PUT', path, body),
    del: <T = any>(path: string) => call<T>('DELETE', path),
  };
}

export const asA = () => client(inject('bakeryA').key);
export const asAReadOnly = () => client(inject('bakeryA').readOnlyKey);
export const asB = () => client(inject('bakeryB').key);

/** Assert a 2xx success envelope and return its data. */
export function ok<T>(res: ApiResponse<T>): T {
  if (res.status >= 300 || !res.body.success) {
    throw new Error(`Expected success, got ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return res.body.data as T;
}

export const unique = (label: string) => `${label} ${Math.random().toString(36).slice(2, 8)}`;
