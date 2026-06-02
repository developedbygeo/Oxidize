import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultsBanner } from './ResultsBanner';

const invoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

describe('ResultsBanner', () => {
  it('renders title and subtitle', () => {
    render(<ResultsBanner title="Complete" subtitle="3/3 converted" />);
    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getByText('3/3 converted')).toBeInTheDocument();
  });

  it('hides the Open folder button when no outputDir is provided', () => {
    render(<ResultsBanner title="Done" subtitle="1/1" />);
    expect(screen.queryByRole('button', { name: /open folder/i })).not.toBeInTheDocument();
  });

  it('shows the Open folder button when outputDir is provided', () => {
    render(<ResultsBanner title="Done" subtitle="1/1" outputDir="/out" />);
    expect(screen.getByRole('button', { name: /open folder/i })).toBeInTheDocument();
  });

  it('invokes open_folder with the path on click', async () => {
    invoke.mockResolvedValue(undefined);
    render(<ResultsBanner title="Done" subtitle="1/1" outputDir="/Users/me/out" />);
    await userEvent.click(screen.getByRole('button', { name: /open folder/i }));
    expect(invoke).toHaveBeenCalledWith('open_folder', { path: '/Users/me/out' });
  });

  it('renders children before the open-folder button', () => {
    render(
      <ResultsBanner title="Done" subtitle="1/1" outputDir="/out">
        <span data-testid="extra">extra</span>
      </ResultsBanner>
    );
    expect(screen.getByTestId('extra')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open folder/i })).toBeInTheDocument();
  });
});
