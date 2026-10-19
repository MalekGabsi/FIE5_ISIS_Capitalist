import { computed, Injectable, signal } from '@angular/core';
import { BACKEND_STORAGE_KEY, BACKEND_URL } from './game.config';

/**
 * "localhost:3000/" -> "http://localhost:3000"; also strips a trailing "/graphql".
 * Returns null when the text is not an http(s) address.
 */
export function normalizeBackendUrl(input: string): string | null {
  let text = input.trim();
  if (!text) return null;
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(text)) text = `http://${text}`;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const path = url.pathname.replace(/\/+$/, '').replace(/\/graphql$/i, '');
  return `${url.origin}${path}`;
}

/** Backend address chosen by the player (persisted); read by Apollo and image URLs. */
@Injectable({ providedIn: 'root' })
export class BackendUrl {
  readonly value = signal(this.initial());
  readonly graphql = computed(() => `${this.value()}/graphql`);

  /** Returns the normalized address, or null (unchanged) when the text is invalid. */
  set(input: string): string | null {
    const url = normalizeBackendUrl(input);
    if (!url) return null;
    this.value.set(url);
    try {
      localStorage.setItem(BACKEND_STORAGE_KEY, url);
    } catch (error) {
      console.warn('[BackendUrl] could not persist the backend address', error);
    }
    return url;
  }

  private initial(): string {
    try {
      const stored = typeof localStorage === 'undefined' ? null : localStorage.getItem(BACKEND_STORAGE_KEY);
      return (stored && normalizeBackendUrl(stored)) || BACKEND_URL;
    } catch {
      return BACKEND_URL;
    }
  }
}
