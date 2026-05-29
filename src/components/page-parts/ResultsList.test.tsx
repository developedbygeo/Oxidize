import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultsList } from './ResultsList';

const invoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => toastError(...args) },
}));

describe('ResultsList', () => {
  it('renders the basename of each output path', () => {
    render(
      <ResultsList
        results={[
          { success: true, output_path: '/Users/me/out/photo.png' },
          { success: true, output_path: 'C:\\out\\image.jpg' },
        ]}
      />
    );
    expect(screen.getByText('photo.png')).toBeInTheDocument();
    expect(screen.getByText('image.jpg')).toBeInTheDocument();
  });

  it('invokes reveal_file on click when the row is successful', async () => {
    invoke.mockResolvedValue(undefined);
    render(
      <ResultsList results={[{ success: true, output_path: '/out/photo.png' }]} />
    );
    await userEvent.click(screen.getByText('photo.png'));
    expect(invoke).toHaveBeenCalledWith('reveal_file', { path: '/out/photo.png' });
  });

  it('shows a destructive style and disables click for failed rows', async () => {
    render(
      <ResultsList
        results={[{ success: false, output_path: null }]}
      />
    );
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('renders meta render-prop children for each successful row', () => {
    render(
      <ResultsList
        results={[
          { success: true, output_path: '/out/a.png' },
          { success: true, output_path: '/out/b.png' },
        ]}
      >
        {(r) => <span data-testid="meta">{r.output_path}</span>}
      </ResultsList>
    );
    expect(screen.getAllByTestId('meta')).toHaveLength(2);
  });

  it('falls back to a placeholder name when output_path is null', () => {
    render(<ResultsList results={[{ success: false, output_path: null }]} />);
    expect(screen.getByText('Image 1')).toBeInTheDocument();
  });

  it('toasts an error when reveal_file rejects', async () => {
    invoke.mockRejectedValue(new Error('not found'));
    render(<ResultsList results={[{ success: true, output_path: '/out/x.png' }]} />);
    await userEvent.click(screen.getByText('x.png'));
    expect(toastError).toHaveBeenCalledWith(
      'File not found',
      expect.objectContaining({ description: expect.any(String) })
    );
  });
});
