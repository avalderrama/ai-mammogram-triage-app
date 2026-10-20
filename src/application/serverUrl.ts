const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

/**
 * The access key travels in a header, so remote servers must use HTTPS. Plain HTTP is only accepted for
 * the local machine (development and the owner's own PC).
 */
export function parseServerUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol === 'https:' || (url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname))) return url;
  } catch { /* not a URL */ }
  return null;
}
