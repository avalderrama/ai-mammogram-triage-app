import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.doUnmock('./mcpTriageGateway');
  vi.resetModules();
});

const settings = { serverUrl: 'https://x.example/mcp', accessKey: 'k' };

describe('LazyTriageGateway', () => {
  it('loads the MCP client once and retries after a failed chunk download', async () => {
    let attempts = 0;
    const testConnection = vi.fn(async () => undefined);
    vi.doMock('./mcpTriageGateway', () => {
      attempts += 1;
      if (attempts === 1) throw new Error('chunk failed');
      return { McpTriageGateway: class { testConnection = testConnection; } };
    });
    const { LazyTriageGateway } = await import('./lazyTriageGateway');
    const gateway = new LazyTriageGateway();
    await expect(gateway.testConnection(settings)).rejects.toMatchObject({ kind: 'app_outdated' });
    await gateway.testConnection(settings);
    await gateway.testConnection(settings);
    expect(testConnection).toHaveBeenCalledTimes(2);
  });
});
