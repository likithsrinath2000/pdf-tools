import React from 'react';
(globalThis as any).React = React;
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ErrorBoundary from './ErrorBoundary';

function Boom() {
  throw new Error('Kaboom');
}

describe('ErrorBoundary', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.spyOn(Date, 'now').mockReturnValue(123456);
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: vi.fn(), href: 'http://localhost/current' },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  it('renders children when no error occurs', () => {
    render(<ErrorBoundary><div>Healthy child</div></ErrorBoundary>);
    expect(screen.getByText('Healthy child')).toBeInTheDocument();
  });

  it('renders fallback UI and handles actions after a child throws', async () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByRole('heading', { name: /oops/i })).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/awkward/i)).toBeInTheDocument();
    expect(screen.getByText(/have you tried turning it off/i)).toBeInTheDocument();
    expect(screen.getByText(/deep breaths/i)).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('button-try-again'));
    expect(window.location.reload).toHaveBeenCalled();
    await userEvent.click(screen.getByTestId('button-go-home'));
    expect(window.location.href).toBe('/');
  });
});
