import React from 'react';
(globalThis as any).React = React;
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileText } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { ToolCard } from './ToolCard';

const addRecentTool = vi.fn();
vi.mock('@/lib/preferences', () => ({ addRecentTool: (...args: any[]) => addRecentTool(...args) }));
vi.mock('wouter', () => ({
  Link: ({ href, onClick, children }: any) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  ),
}));

describe('ToolCard', () => {
  it('renders tool information and records clicks', async () => {
    const onToolClick = vi.fn();
    render(<ToolCard id="merge-pdf" title="Merge PDF" description="Combine documents" icon={FileText} color="bg-red-500" onToolClick={onToolClick} />);
    const link = screen.getByRole('link', { name: /merge pdf combine documents/i });
    expect(link).toHaveAttribute('href', '/merge-pdf');
    expect(screen.getByText('Combine documents')).toBeInTheDocument();
    await userEvent.click(link);
    expect(addRecentTool).toHaveBeenCalledWith('merge-pdf');
    expect(onToolClick).toHaveBeenCalledWith('merge-pdf');
  });

  it('works without an optional click handler', async () => {
    render(<ToolCard id="split-pdf" title="Split PDF" description="Separate pages" icon={FileText} color="bg-red-500" />);
    await userEvent.click(screen.getByRole('link', { name: /split pdf separate pages/i }));
    expect(addRecentTool).toHaveBeenCalledWith('split-pdf');
  });
});
