import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilenameSettings } from './FilenameSettings';
import type { OverwriteMode } from '@/types/output-naming';

const noop = () => {};

describe('FilenameSettings', () => {
  it('renders the three overwrite-mode buttons', () => {
    render(
      <FilenameSettings
        template=""
        overwriteMode="auto-number"
        onTemplateChange={noop}
        onOverwriteModeChange={noop}
      />
    );
    expect(screen.getByRole('button', { name: /Auto-number/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Skip/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Overwrite/i })).toBeInTheDocument();
  });

  it('marks the currently-active mode visually distinct from the others', () => {
    render(
      <FilenameSettings
        template=""
        overwriteMode="skip"
        onTemplateChange={noop}
        onOverwriteModeChange={noop}
      />
    );
    const skip = screen.getByRole('button', { name: /Skip/i });
    const auto = screen.getByRole('button', { name: /Auto-number/i });
    expect(skip.className).toContain('bg-primary');
    expect(auto.className).not.toContain('bg-primary');
  });

  it('fires onOverwriteModeChange with the selected value', () => {
    const onOverwriteModeChange = vi.fn<(m: OverwriteMode) => void>();
    render(
      <FilenameSettings
        template=""
        overwriteMode="auto-number"
        onTemplateChange={noop}
        onOverwriteModeChange={onOverwriteModeChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Overwrite/i }));
    expect(onOverwriteModeChange).toHaveBeenCalledWith('overwrite');
  });

  it('fires onTemplateChange as the user types', async () => {
    const onTemplateChange = vi.fn<(t: string) => void>();
    render(
      <FilenameSettings
        template=""
        overwriteMode="auto-number"
        onTemplateChange={onTemplateChange}
        onOverwriteModeChange={noop}
      />
    );
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText('{name}_{op}');
    await user.type(input, 'x');
    expect(onTemplateChange).toHaveBeenCalledWith('x');
  });

  it('lists the supported placeholders as a hint', () => {
    render(
      <FilenameSettings
        template=""
        overwriteMode="auto-number"
        onTemplateChange={noop}
        onOverwriteModeChange={noop}
      />
    );
    const hint = screen.getByText(/Placeholders:/i);
    expect(hint.textContent).toContain('{name}');
    expect(hint.textContent).toContain('{op}');
    expect(hint.textContent).toContain('{date}');
    expect(hint.textContent).toContain('{width}');
    expect(hint.textContent).toContain('{height}');
  });
});
