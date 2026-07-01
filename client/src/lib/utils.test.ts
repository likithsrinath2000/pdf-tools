import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges conditional and conflicting Tailwind classes', () => {
    expect(cn('px-2 text-sm', false && 'hidden', ['px-4', { 'text-lg': true }])).toBe('px-4 text-lg');
  });
});
