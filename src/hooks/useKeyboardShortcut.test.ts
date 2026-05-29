import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcut } from './useKeyboardShortcut';

const dispatchKey = (init: KeyboardEventInit) => {
  const event = new KeyboardEvent('keydown', { ...init, cancelable: true });
  window.dispatchEvent(event);
  return event;
};

describe('useKeyboardShortcut', () => {
  let handler: Mock<() => void>;

  beforeEach(() => {
    handler = vi.fn<() => void>();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fires the handler on a plain key without modifiers', () => {
    renderHook(() => useKeyboardShortcut('Escape', handler));
    dispatchKey({ key: 'Escape' });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('only fires when the meta modifier matches', () => {
    renderHook(() => useKeyboardShortcut('Enter', handler, { meta: true }));
    dispatchKey({ key: 'Enter' });
    expect(handler).not.toHaveBeenCalled();
    dispatchKey({ key: 'Enter', ctrlKey: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not fire when meta=false but a modifier is held', () => {
    renderHook(() => useKeyboardShortcut('Escape', handler));
    dispatchKey({ key: 'Escape', ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('treats Cmd/Meta as equivalent to Ctrl', () => {
    renderHook(() => useKeyboardShortcut('/', handler, { meta: true }));
    dispatchKey({ key: '/', metaKey: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('matches single character keys case-insensitively', () => {
    renderHook(() => useKeyboardShortcut('s', handler, { meta: true }));
    dispatchKey({ key: 'S', ctrlKey: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not attach a listener when enabled=false', () => {
    renderHook(() => useKeyboardShortcut('Enter', handler, { meta: true, enabled: false }));
    dispatchKey({ key: 'Enter', ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('detaches the listener on unmount', () => {
    const { unmount } = renderHook(() =>
      useKeyboardShortcut('Enter', handler, { meta: true })
    );
    unmount();
    dispatchKey({ key: 'Enter', ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('uses the latest handler reference without re-attaching', () => {
    const first = vi.fn<() => void>();
    const second = vi.fn<() => void>();
    const { rerender } = renderHook(
      ({ fn }: { fn: () => void }) => useKeyboardShortcut('Escape', fn),
      { initialProps: { fn: first } }
    );
    rerender({ fn: second });
    dispatchKey({ key: 'Escape' });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });

  it('calls preventDefault on a matched event', () => {
    renderHook(() => useKeyboardShortcut('Enter', handler, { meta: true }));
    const event = dispatchKey({ key: 'Enter', ctrlKey: true });
    expect(event.defaultPrevented).toBe(true);
  });
});
