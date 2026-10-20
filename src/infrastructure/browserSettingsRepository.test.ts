import { afterEach, describe, expect, it } from 'vitest';
import { BrowserSettingsRepository } from './browserSettingsRepository';

const KEY = 'k'.repeat(32);

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('BrowserSettingsRepository', () => {
  it('never writes the access key to localStorage', () => {
    const repo = new BrowserSettingsRepository('http://127.0.0.1:8765/mcp');
    repo.save({ serverUrl: 'https://x.example/mcp', accessKey: KEY, rememberKey: true });
    expect(Object.values({ ...localStorage })).not.toContain(KEY);
    expect(JSON.stringify({ ...localStorage })).not.toContain(KEY);
  });

  it('keeps the key in memory only unless the user opts in', () => {
    const repo = new BrowserSettingsRepository('d');
    repo.save({ serverUrl: 'https://x.example/mcp', accessKey: KEY, rememberKey: false });
    expect(repo.load().accessKey).toBe(KEY);
    expect(sessionStorage.length).toBe(0);
    expect(new BrowserSettingsRepository('d').load().accessKey).toBe('');
  });

  it('remembers the key for the tab when asked, and forgets it when unchecked', () => {
    const repo = new BrowserSettingsRepository('d');
    repo.save({ serverUrl: 'https://x.example/mcp', accessKey: KEY, rememberKey: true });
    expect(new BrowserSettingsRepository('d').load()).toMatchObject({ accessKey: KEY, rememberKey: true });
    repo.save({ serverUrl: 'https://x.example/mcp', accessKey: KEY, rememberKey: false });
    expect(sessionStorage.length).toBe(0);
  });

  it('remembers the server URL and falls back to the default', () => {
    expect(new BrowserSettingsRepository('http://127.0.0.1:8765/mcp').load().serverUrl).toBe('http://127.0.0.1:8765/mcp');
    new BrowserSettingsRepository('d').save({ serverUrl: 'https://x.example/mcp', accessKey: '', rememberKey: false });
    expect(new BrowserSettingsRepository('d').load().serverUrl).toBe('https://x.example/mcp');
  });
});
