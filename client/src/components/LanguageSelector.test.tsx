import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageSelector } from './LanguageSelector';
(globalThis as any).React = React;

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <>{children}</>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick, ...props }: any) => <button type="button" onClick={onClick} {...props}>{children}</button>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
}));

describe('LanguageSelector', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    document.cookie = 'googtrans=/en/hi';
    (window as any).google = { translate: { TranslateElement: vi.fn() } };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as any).google;
    delete (window as any).googleTranslateElementInit;
  });

  it('loads Google Translate, displays saved English, and switches to a non-English language', async () => {
    const combo = document.createElement('select');
    combo.className = 'goog-te-combo';
    combo.add(new Option('Hindi', 'hi'));
    combo.addEventListener('change', vi.fn());
    document.body.appendChild(combo);
    const frame = document.createElement('iframe');
    frame.className = 'goog-te-menu-frame';
    document.body.appendChild(frame);
    frame.contentDocument!.body.innerHTML = '<div class="goog-te-menu2-item"><span class="text">Hindi</span></div>';

    render(<LanguageSelector />);
    expect(screen.getByTestId('button-language-selector')).toHaveTextContent('English');
    expect(document.getElementById('google-translate-script')).toHaveAttribute('src', expect.stringContaining('googleTranslateElementInit'));

    act(() => window.googleTranslateElementInit?.());
    fireEvent.click(screen.getByTestId('lang-hi'));

    expect(localStorage.getItem('preferredLanguage')).toBe('hi');
    expect(combo.value).toBe('hi');
    expect(screen.getByTestId('button-language-selector')).toHaveTextContent('हिन्दी');
  });

  it('uses an existing script, restores a saved language, and resets back to English', async () => {
    localStorage.setItem('preferredLanguage', 'es');
    sessionStorage.setItem('google_translate_state', 'cached');
    document.body.classList.add('translated-ltr');
    document.documentElement.classList.add('translated-rtl');
    const oldScript = document.createElement('script');
    oldScript.id = 'google-translate-script';
    document.body.appendChild(oldScript);
    const skip = document.createElement('div');
    skip.className = 'skiptranslate';
    document.body.appendChild(skip);
    render(<LanguageSelector />);
    await waitFor(() => expect(screen.getByTestId('button-language-selector')).toHaveTextContent('Español'));

    fireEvent.click(screen.getByTestId('lang-en'));

    expect(localStorage.getItem('preferredLanguage')).toBe('en');
    expect(sessionStorage.getItem('google_translate_state')).toBeNull();
    expect(document.querySelector('.skiptranslate')).toBeNull();
    expect(document.body).not.toHaveClass('translated-ltr');
    expect(document.documentElement).not.toHaveClass('translated-rtl');
  });
});
