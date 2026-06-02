import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SourcePreview } from './SourcePreview';
import type { ImageInfo } from '@/types/image';

const makeImage = (overrides: Partial<ImageInfo> = {}): ImageInfo => ({
  path: '/in/photo.png',
  name: 'photo.png',
  size: 12_345,
  width: 1000,
  height: 800,
  format: 'png',
  thumbnail: 'data:thumb',
  ...overrides,
});

describe('SourcePreview', () => {
  it('renders null when no images are loaded', () => {
    const { container } = render(<SourcePreview images={[]} />);
    expect(container.textContent ?? '').not.toContain('Source preview');
  });

  it('shows the current image meta line for the first image', () => {
    render(<SourcePreview images={[makeImage({ name: 'first.png' })]} />);
    expect(screen.getByText('first.png')).toBeInTheDocument();
    // Format text is uppercased in the meta strip
    expect(screen.getByText(/PNG/)).toBeInTheDocument();
  });

  it('hides the pager for a single image', () => {
    render(<SourcePreview images={[makeImage()]} />);
    // No prev/next buttons when total === 1
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('advances to the next image on Next click', async () => {
    const a = makeImage({ name: 'a.png', path: '/in/a.png' });
    const b = makeImage({ name: 'b.png', path: '/in/b.png' });
    render(<SourcePreview images={[a, b]} />);
    expect(screen.getByText('a.png')).toBeInTheDocument();
    const [, next] = screen.getAllByRole('button');
    await userEvent.click(next);
    expect(screen.getByText('b.png')).toBeInTheDocument();
  });

  it('wraps around past the last image', async () => {
    const a = makeImage({ name: 'a.png', path: '/in/a.png' });
    const b = makeImage({ name: 'b.png', path: '/in/b.png' });
    render(<SourcePreview images={[a, b]} />);
    const [, next] = screen.getAllByRole('button');
    await userEvent.click(next); // → b
    await userEvent.click(next); // wraps → a
    expect(screen.getByText('a.png')).toBeInTheDocument();
  });
});
