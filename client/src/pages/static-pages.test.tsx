import React from 'react';
(globalThis as any).React = React;
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import About from './About';
import Privacy from './Privacy';
import Terms from './Terms';
import NotFound from './not-found';

vi.mock('@/components/Navbar', () => ({ Navbar: () => <nav>Mock Navbar</nav> }));
vi.mock('@/components/Footer', () => ({ Footer: () => <footer>Mock Footer</footer> }));
vi.mock('wouter', () => ({ Link: ({ href, children }: any) => <a href={href}>{children}</a> }));

describe('static pages', () => {
  it('renders the about page sections', () => {
    render(<About />);
    expect(screen.getByRole('heading', { name: /about pdftools/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /our mission/i })).toBeInTheDocument();
    expect(screen.getByText(/smooth as butter on warm toast/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /the story/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /our promise/i })).toBeInTheDocument();
    expect(screen.getByText(/always improving/i)).toBeInTheDocument();
  });

  it('renders the privacy policy content', () => {
    render(<Privacy />);
    expect(screen.getByRole('heading', { name: /privacy policy/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /what we collect/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /what we delete/i })).toBeInTheDocument();
    expect(screen.getByText(/your uploaded files are deleted within 1 hour/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /questions/i })).toBeInTheDocument();
    expect(screen.getByText(/waltwhite929@gmail.com/i)).toBeInTheDocument();
  });

  it('renders the terms page content', () => {
    render(<Terms />);
    expect(screen.getByRole('heading', { name: /terms of service/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /acceptance of terms/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /service limitations/i })).toBeInTheDocument();
    expect(screen.getByText(/file size limits/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /fair use/i })).toBeInTheDocument();
    expect(screen.getByText(/let's just make great documents together/i)).toBeInTheDocument();
  });

  it('renders the not found page actions', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<NotFound />);
    expect(screen.getByRole('heading', { name: /404/i })).toBeInTheDocument();
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
    expect(screen.getByText(/went on vacation/i)).toBeInTheDocument();
    expect(screen.getByText(/converted to a different format/i)).toBeInTheDocument();
    expect(screen.getByTestId('button-go-home')).toBeInTheDocument();
    expect(screen.getByTestId('button-browse-tools')).toBeInTheDocument();
  });
});
