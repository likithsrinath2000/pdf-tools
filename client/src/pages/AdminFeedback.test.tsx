import React from 'react';
(globalThis as any).React = React;
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminFeedback from './AdminFeedback';

vi.mock('@/components/Navbar', () => ({ Navbar: () => <nav>Mock Navbar</nav> }));
vi.mock('@/components/Footer', () => ({ Footer: () => <footer>Mock Footer</footer> }));

describe('AdminFeedback page', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders fetched feedback entries and refreshes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ feedbacks: [{ id: '1', feedback: 'Love it', email: 'a@b.com', ipAddress: '127.0.0.1', userAgent: 'Vitest Browser', createdAt: '2026-01-02T03:04:05Z' }] }),
    } as Response);
    render(<AdminFeedback />);
    expect(screen.getByText(/loading feedback/i)).toBeInTheDocument();
    expect(await screen.findByText('Love it')).toBeInTheDocument();
    expect(screen.getByText('a@b.com')).toBeInTheDocument();
    expect(screen.getByText('127.0.0.1')).toBeInTheDocument();
    expect(screen.getByText('Vitest Browser')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('renders an empty state', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ feedbacks: [] }) } as Response);
    render(<AdminFeedback />);
    expect(await screen.findByText(/no feedback yet/i)).toBeInTheDocument();
  });

  it('renders an error state', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);
    render(<AdminFeedback />);
    expect(await screen.findByText(/failed to load feedback/i)).toBeInTheDocument();
  });
});
