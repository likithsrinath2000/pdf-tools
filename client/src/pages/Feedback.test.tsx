import React from 'react';
(globalThis as any).React = React;
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Feedback from './Feedback';

vi.mock('@/components/Navbar', () => ({ Navbar: () => <nav>Mock Navbar</nav> }));
vi.mock('@/components/Footer', () => ({ Footer: () => <footer>Mock Footer</footer> }));

describe('Feedback page', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps submit disabled until feedback is entered', async () => {
    render(<Feedback />);
    const submit = screen.getByRole('button', { name: /send feedback/i });
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/your feedback/i), 'Great tool');
    expect(submit).toBeEnabled();
  });

  it('submits feedback successfully and allows another submission', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);
    render(<Feedback />);
    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/your feedback/i), 'Please add batch mode');
    await userEvent.click(screen.getByRole('button', { name: /send feedback/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/feedback', expect.objectContaining({ method: 'POST' })));
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      email: 'user@example.com',
      feedback: 'Please add batch mode',
    });
    expect(await screen.findByRole('heading', { name: /thanks for your feedback/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /send more feedback/i }));
    expect(screen.getByRole('button', { name: /send feedback/i })).toBeDisabled();
  });

  it('shows an error when submission fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);
    render(<Feedback />);
    await userEvent.type(screen.getByLabelText(/your feedback/i), 'Broken');
    await userEvent.click(screen.getByRole('button', { name: /send feedback/i }));
    expect(await screen.findByText(/oops! something went wrong/i)).toBeInTheDocument();
  });
});
