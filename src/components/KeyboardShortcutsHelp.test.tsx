import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
import { navOrder, pageMeta } from '@/pages/registry';

describe('KeyboardShortcutsHelp', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <KeyboardShortcutsHelp open={false} onOpenChange={() => {}} />
    );
    // The sheet should not show its title when closed
    expect(container.textContent ?? '').not.toContain('Keyboard shortcuts');
  });

  it('renders the headline and navigation section when open', () => {
    render(<KeyboardShortcutsHelp open onOpenChange={() => {}} />);
    expect(screen.getByText('Keyboard shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('renders one nav row per navOrder entry, labeled from pageMeta', () => {
    render(<KeyboardShortcutsHelp open onOpenChange={() => {}} />);
    for (const [index, page] of navOrder.entries()) {
      expect(screen.getByText(pageMeta[page].navLabel)).toBeInTheDocument();
      expect(screen.getAllByText(String(index + 1)).length).toBeGreaterThan(0);
    }
  });

  it('lists the action shortcuts (Ctrl+Enter, Esc, Ctrl+/)', () => {
    render(<KeyboardShortcutsHelp open onOpenChange={() => {}} />);
    expect(screen.getByText(/Run the current page/i)).toBeInTheDocument();
    expect(screen.getByText(/Cancel a running image or video job/i)).toBeInTheDocument();
    expect(screen.getByText(/Open this shortcuts panel/i)).toBeInTheDocument();
  });
});
