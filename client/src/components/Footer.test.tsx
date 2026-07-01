import React from 'react';
(globalThis as any).React = React;
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Footer } from './Footer';

describe('Footer', () => {
  it('renders branding and footer links', () => {
    render(<Footer />);
    expect(screen.getByAltText(/cool pdf mascot/i)).toBeInTheDocument();
    expect(screen.getByText('PDFTools')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /about us/i })).toHaveAttribute('href', '/about');
    expect(screen.getByRole('link', { name: /feedback/i })).toHaveAttribute('href', '/feedback');
    expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: /terms of service/i })).toHaveAttribute('href', '/terms');
    expect(screen.getByText(/no pdfs were harmed/i)).toBeInTheDocument();
  });
});
