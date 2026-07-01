import { describe, expect, it } from 'vitest';
import { TOOLS } from './constants';

describe('TOOLS constants', () => {
  it('exports complete tool definitions with required fields and categories', () => {
    expect(TOOLS.length).toBeGreaterThan(30);
    expect(new Set(TOOLS.map(t => t.id)).size).toBe(TOOLS.length);
    for (const tool of TOOLS) {
      expect(tool).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        description: expect.any(String),
        color: expect.stringMatching(/^bg-/),
        accept: expect.any(String),
        action: expect.any(String),
        category: expect.any(String),
      });
      expect(tool.icon).toBeTruthy();
    }
    expect(TOOLS.map(t => t.category)).toEqual(expect.arrayContaining([
      'organize', 'optimize', 'convert-to-pdf', 'convert-from-pdf', 'security', 'edit', 'image-tools', 'create-office',
    ]));
    expect(TOOLS.find(t => t.id === 'merge-pdf')?.maxFiles).toBeUndefined();
    expect(TOOLS.find(t => t.id === 'compress-pdf')?.maxFiles).toBe(1);
    expect(TOOLS.find(t => t.id === 'create-document')?.maxFiles).toBe(0);
  });
});
