import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PreviewNavigation } from './PreviewNavigation';

describe('PreviewNavigation', () => {
  it('renders just its children when total <= 1', () => {
    render(
      <PreviewNavigation currentIndex={0} total={1} onPrev={() => {}} onNext={() => {}}>
        <div data-testid="content">single</div>
      </PreviewNavigation>
    );
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the prev/next pager when total > 1', () => {
    render(
      <PreviewNavigation currentIndex={1} total={3} onPrev={() => {}} onNext={() => {}}>
        <div data-testid="content">multi</div>
      </PreviewNavigation>
    );
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('wires onPrev and onNext to the chevron buttons', async () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <PreviewNavigation currentIndex={0} total={2} onPrev={onPrev} onNext={onNext}>
        <div>c</div>
      </PreviewNavigation>
    );
    const [prev, next] = screen.getAllByRole('button');
    await userEvent.click(prev);
    await userEvent.click(next);
    expect(onPrev).toHaveBeenCalledOnce();
    expect(onNext).toHaveBeenCalledOnce();
  });
});
