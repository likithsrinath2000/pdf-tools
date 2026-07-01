import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type RecordValue = { key: string; data: string; timestamp: number };

class FakeRequest<T = any> {
  onsuccess: ((event?: any) => void) | null = null;
  onerror: (() => void) | null = null;
  onupgradeneeded: ((event: any) => void) | null = null;
  result!: T;
  error: Error | null = null;
}

function asyncSuccess<T>(result: T): FakeRequest<T> {
  const request = new FakeRequest<T>();
  queueMicrotask(() => {
    request.result = result;
    request.onsuccess?.({ target: request });
  });
  return request;
}

class FakeStore {
  constructor(private rows: Map<string, RecordValue>) {}
  createIndex = vi.fn();
  get(key: string) { return asyncSuccess(this.rows.get(key)); }
  count() { return asyncSuccess(this.rows.size); }
  put(value: RecordValue) { this.rows.set(value.key, value); return asyncSuccess(value.key); }
  clear() { this.rows.clear(); return asyncSuccess(undefined); }
  delete(key: string) { this.rows.delete(key); return asyncSuccess(undefined); }
  index() {
    return {
      openCursor: () => {
        const request = new FakeRequest<any>();
        const keys = [...this.rows.values()].sort((a, b) => a.timestamp - b.timestamp).map(v => v.key);
        let index = 0;
        const advance = () => queueMicrotask(() => {
          const key = keys[index++];
          request.result = key ? { primaryKey: key, continue: advance } : null;
          request.onsuccess?.({ target: request });
        });
        advance();
        return request;
      },
    };
  }
}

class FakeDB {
  objectStoreNames = { contains: (name: string) => this.stores.has(name) };
  stores = new Map<string, Map<string, RecordValue>>();
  createObjectStore(name: string) {
    const rows = new Map<string, RecordValue>();
    this.stores.set(name, rows);
    return new FakeStore(rows);
  }
  transaction(name: string) {
    if (!this.stores.has(name)) this.stores.set(name, new Map());
    return { objectStore: () => new FakeStore(this.stores.get(name)!) };
  }
}

let fakeDB: FakeDB;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(10_000);
  fakeDB = new FakeDB();
  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    value: {
      open: vi.fn(() => {
        const request = new FakeRequest<FakeDB>();
        queueMicrotask(() => {
          request.result = fakeDB;
          request.onupgradeneeded?.({ target: request });
          request.onsuccess?.({ target: request });
        });
        return request;
      }),
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
  vi.restoreAllMocks();
});

async function flush() {
  for (let i = 0; i < 50; i++) {
    await Promise.resolve();
  }
}

describe('thumbnailCache', () => {
  it('generates cache keys, stores, retrieves, and clears thumbnails', async () => {
    const mod = await import('./thumbnailCache');
    expect(mod.generateCacheKey('hash', 2, 1.5)).toBe('hash-p2-s1.5');

    await mod.setCachedThumbnail('k1', 'data-url');
    await flush();
    await expect(mod.getCachedThumbnail('k1')).resolves.toBe('data-url');

    await mod.clearThumbnailCache();
    await flush();
    await expect(mod.getCachedThumbnail('k1')).resolves.toBeNull();
  });

  it('returns null for expired IndexedDB entries and get errors', async () => {
    const mod = await import('./thumbnailCache');
    fakeDB.stores.set('thumbnails', new Map([
      ['old', { key: 'old', data: 'stale', timestamp: 10_000 - 25 * 60 * 60 * 1000 }],
    ]));
    await expect(mod.getCachedThumbnail('old')).resolves.toBeNull();

    fakeDB.transaction = () => ({ objectStore: () => ({ get: () => {
      const req = new FakeRequest();
      queueMicrotask(() => req.onerror?.());
      return req;
    } }) as any });
    await expect(mod.getCachedThumbnail('missing')).resolves.toBeNull();
  });

  it('falls back safely when IndexedDB open or writes fail', async () => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: { open: vi.fn(() => {
        const request = new FakeRequest();
        queueMicrotask(() => { request.error = new Error('blocked'); request.onerror?.(); });
        return request;
      }) },
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mod = await import('./thumbnailCache');

    await expect(mod.getCachedThumbnail('x')).resolves.toBeNull();
    await expect(mod.setCachedThumbnail('x', 'memory')).resolves.toBeUndefined();
    await expect(mod.getCachedThumbnail('x')).resolves.toBe('memory');
    await expect(mod.clearThumbnailCache()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it('evicts the oldest 20 percent from IndexedDB when max size is reached', async () => {
    const mod = await import('./thumbnailCache');
    fakeDB.stores.set('thumbnails', new Map());
    for (let i = 0; i < 100; i++) {
      fakeDB.stores.get('thumbnails')?.set(`old-${i}`, { key: `old-${i}`, data: `${i}`, timestamp: i });
    }

    await mod.setCachedThumbnail('new', 'fresh');
    await flush();

    const rows = fakeDB.stores.get('thumbnails')!;
    expect(rows.has('new')).toBe(true);
    expect(rows.has('old-0')).toBe(false);
    expect(rows.has('old-19')).toBe(false);
    expect(rows.has('old-25')).toBe(true);
    expect(rows.size).toBeLessThanOrEqual(82);
  });

  it('hashes a file from its first bytes', async () => {
    const mod = await import('./thumbnailCache');
    const hash = await mod.getFileHash({
      name: 'doc.pdf',
      size: 11,
      slice: () => ({ arrayBuffer: async () => new TextEncoder().encode('hello world').buffer }),
    } as File);
    expect(hash).toMatch(/^doc\.pdf-11-[a-f0-9]{16}$/);
  });
});
