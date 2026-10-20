import type { ConnectionSettings, SettingsRepository } from '../application/ports';

const SERVER_URL_KEY = 'mammo-triage.server-url';
const ACCESS_KEY_KEY = 'mammo-triage.access-key';

type StoredSettings = ConnectionSettings & { rememberKey: boolean };

function safely<T>(read: () => T, fallback: T): T {
  try {
    return read();
  } catch {
    return fallback; // storage blocked (private mode, policies): keep working in memory
  }
}

/**
 * The server URL is not secret and is remembered in localStorage. The access key lives in memory and,
 * only if the user opts in, in sessionStorage (cleared when the tab closes). It never touches localStorage.
 */
export class BrowserSettingsRepository implements SettingsRepository {
  private accessKey: string;
  private rememberKey: boolean;

  constructor(private readonly defaultServerUrl: string) {
    const remembered = safely(() => sessionStorage.getItem(ACCESS_KEY_KEY), null);
    this.accessKey = remembered ?? '';
    this.rememberKey = remembered !== null;
  }

  load(): StoredSettings {
    const serverUrl = safely(() => localStorage.getItem(SERVER_URL_KEY), null) ?? this.defaultServerUrl;
    return { serverUrl, accessKey: this.accessKey, rememberKey: this.rememberKey };
  }

  save(settings: StoredSettings): void {
    this.accessKey = settings.accessKey;
    this.rememberKey = settings.rememberKey;
    safely(() => localStorage.setItem(SERVER_URL_KEY, settings.serverUrl), undefined);
    safely(() => settings.rememberKey && settings.accessKey
      ? sessionStorage.setItem(ACCESS_KEY_KEY, settings.accessKey)
      : sessionStorage.removeItem(ACCESS_KEY_KEY), undefined);
  }
}
