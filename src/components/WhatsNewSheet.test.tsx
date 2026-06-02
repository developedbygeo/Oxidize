import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WhatsNewSheet } from './WhatsNewSheet';
import { CHANGELOG } from '@/lib/changelog';

describe('WhatsNewSheet', () => {
  it('renders nothing visible when closed', () => {
    const { container } = render(<WhatsNewSheet open={false} onOpenChange={() => {}} />);
    expect(container.textContent ?? '').not.toContain("What's new");
  });

  it('renders the headline when open', () => {
    render(<WhatsNewSheet open onOpenChange={() => {}} />);
    expect(screen.getByText("What's new")).toBeInTheDocument();
  });

  it('shows the latest version with a "Latest" badge', () => {
    render(<WhatsNewSheet open onOpenChange={() => {}} />);
    expect(screen.getByText(`v${CHANGELOG[0].version}`)).toBeInTheDocument();
    expect(screen.getByText('Latest')).toBeInTheDocument();
  });

  it('does not render older versions — only the latest is shown', () => {
    // Even with multiple changelogs on disk, the panel surfaces only the
    // newest. Older versions stay in the catalog for code use but don't
    // clutter the UI.
    render(<WhatsNewSheet open onOpenChange={() => {}} />);
    for (const v of CHANGELOG.slice(1)) {
      expect(screen.queryByText(`v${v.version}`)).toBeNull();
    }
  });

  it('renders the markdown body — section headings come through', () => {
    // The exact heading set depends on what's in the latest changelog, but
    // every release we ship should have at least one categorized section.
    render(<WhatsNewSheet open onOpenChange={() => {}} />);
    const body = CHANGELOG[0].body;
    const headingMatch = body.match(/^##\s+(.+?)\s*$/m);
    if (headingMatch) {
      expect(screen.getByText(headingMatch[1])).toBeInTheDocument();
    }
  });
});
