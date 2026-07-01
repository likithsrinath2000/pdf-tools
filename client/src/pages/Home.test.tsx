import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Home from './Home';
(globalThis as any).React = React;

const pref = vi.hoisted(() => ({ getRecentTools: vi.fn() }));

vi.mock('@/components/Navbar', () => ({ Navbar: () => <div data-testid="navbar" /> }));
vi.mock('@/components/Footer', () => ({ Footer: () => <div data-testid="footer" /> }));
vi.mock('@/components/ToolCard', () => ({
  ToolCard: ({ id, title, description }: any) => (
    <a href={`/${id}`} data-testid={`tool-card-${id}`}>
      <span>{title}</span>
      <span>{description}</span>
    </a>
  ),
}));
vi.mock('@/lib/preferences', () => ({ getRecentTools: pref.getRecentTools }));

describe('Home', () => {
  beforeEach(() => {
    pref.getRecentTools.mockReset();
  });

  it('renders hero, all tool categories, popular tools, and no recent section without history', () => {
    pref.getRecentTools.mockReturnValue([]);

    render(<Home />);

    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /every tool you need to work with pdfs/i })).toBeInTheDocument();
    expect(screen.queryByTestId('recently-used-section')).not.toBeInTheDocument();

    for (const heading of [
      'Most Popular',
      'Organize PDF',
      'Edit PDF',
      'Optimize & Repair',
      'Security',
      'Convert to PDF',
      'Convert from PDF',
      'Image Tools',
      'Create Office Documents',
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    }

    expect(screen.getAllByTestId('tool-card-merge-pdf')).not.toHaveLength(0);
    expect(screen.getByTestId('tool-card-create-powerpoint')).toBeInTheDocument();
    expect(screen.getByText(/because life is too short/i)).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it('shows only valid recently used tools from stored history', async () => {
    pref.getRecentTools.mockReturnValue(['split-pdf', 'missing-tool', 'compress-image']);

    render(<Home />);

    const recent = await screen.findByTestId('recently-used-section');
    expect(within(recent).getByTestId('tool-card-split-pdf')).toBeInTheDocument();
    expect(within(recent).getByTestId('tool-card-compress-image')).toBeInTheDocument();
    expect(within(recent).queryByText('missing-tool')).not.toBeInTheDocument();
  });
});
