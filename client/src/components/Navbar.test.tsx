import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Navbar } from './Navbar';
(globalThis as any).React = React;

const routing = vi.hoisted(() => ({ location: '/merge-pdf' }));

vi.mock('wouter', () => ({
  Link: ({ href, onClick, className, children }: any) => (
    <a href={href} onClick={(event) => { event.preventDefault(); onClick?.(event); }} className={className}>{children}</a>
  ),
  useLocation: () => [routing.location, vi.fn()],
}));
vi.mock('./LanguageSelector', () => ({ LanguageSelector: () => <div data-testid="language-selector">Language</div> }));
vi.mock('@/components/ui/navigation-menu', () => ({
  NavigationMenu: ({ children }: any) => <div>{children}</div>,
  NavigationMenuList: ({ children }: any) => <div>{children}</div>,
  NavigationMenuItem: ({ children }: any) => <div>{children}</div>,
  NavigationMenuTrigger: ({ children, className }: any) => <button className={className}>{children}</button>,
  NavigationMenuContent: ({ children }: any) => <div>{children}</div>,
  NavigationMenuLink: ({ children }: any) => <>{children}</>,
}));
vi.mock('@/components/ui/sheet', async () => {
  const React = await import('react');
  return {
    Sheet: ({ children }: any) => <div>{children}</div>,
    SheetTrigger: ({ children }: any) => <>{children}</>,
    SheetContent: ({ children }: any) => <aside>{children}</aside>,
    SheetHeader: ({ children }: any) => <div>{children}</div>,
    SheetTitle: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
  };
});
vi.mock('@/components/ui/accordion', () => ({
  Accordion: ({ children }: any) => <div>{children}</div>,
  AccordionItem: ({ children }: any) => <section>{children}</section>,
  AccordionTrigger: ({ children }: any) => <button>{children}</button>,
  AccordionContent: ({ children }: any) => <div>{children}</div>,
}));

describe('Navbar', () => {
  it('renders branding, desktop links, grouped tool links, and language selectors', async () => {
    render(<Navbar />);

    const logo = screen.getByAltText(/cool pdf mascot/i);
    expect(logo).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    await userEvent.click(logo.closest('a')!);
    expect(screen.getAllByTestId('language-selector')).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: /merge pdf/i })[0]).toHaveAttribute('href', '/merge-pdf');
    expect(screen.getByRole('link', { name: /create word doc write and download/i })).toHaveAttribute('href', '/create-word');

    for (const group of ['PDF Tools', 'Image Tools', 'Create Office', 'Organize PDF', 'Optimize', 'Security']) {
      expect(screen.getAllByText(group).length).toBeGreaterThan(0);
    }
  });

  it('opens the mobile menu and closes it when a mobile link is clicked', async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(screen.getByRole('button', { name: '' }));
    expect(screen.getByRole('heading', { name: 'Menu' })).toBeInTheDocument();

    const mobileCompressImage = screen.getAllByRole('link', { name: /compress image/i }).at(-1)!;
    await user.click(mobileCompressImage);
    expect(mobileCompressImage).toHaveAttribute('href', '/compress-image');
  });
});
