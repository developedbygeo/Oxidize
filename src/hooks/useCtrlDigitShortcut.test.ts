import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCtrlDigitShortcut } from './useCtrlDigitShortcut';

const dispatch = (init: KeyboardEventInit) => {
  const event = new KeyboardEvent('keydown', { ...init, cancelable: true });
  window.dispatchEvent(event);
  return event;
};

describe('useCtrlDigitShortcut', () => {
  let handler: Mock<(digit: number) => void>;

  beforeEach(() => {
    handler = vi.fn<(digit: number) => void>();
  });

  it('fires for Ctrl+1..9 with the digit value', () => {
    renderHook(() => useCtrlDigitShortcut(handler));
    for (let d = 1; d <= 9; d++) {
      dispatch({ key: String(d), ctrlKey: true });
    }
    expect(handler).toHaveBeenCalledTimes(9);
    expect(handler.mock.calls.map((c) => c[0])).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('does not fire for digit 0 (out of 1..9 range)', () => {
    renderHook(() => useCtrlDigitShortcut(handler));
    dispatch({ key: '0', ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not fire without the Ctrl/Cmd modifier', () => {
    renderHook(() => useCtrlDigitShortcut(handler));
    dispatch({ key: '1' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('accepts Cmd/meta as an equivalent modifier', () => {
    renderHook(() => useCtrlDigitShortcut(handler));
    dispatch({ key: '4', metaKey: true });
    expect(handler).toHaveBeenCalledWith(4);
  });

  it('ignores non-digit single-character keys', () => {
    renderHook(() => useCtrlDigitShortcut(handler));
    dispatch({ key: 'a', ctrlKey: true });
    dispatch({ key: '/', ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('detaches the listener on unmount', () => {
    const { unmount } = renderHook(() => useCtrlDigitShortcut(handler));
    unmount();
    dispatch({ key: '3', ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('uses the latest handler without re-attaching', () => {
    const first = vi.fn<(d: number) => void>();
    const second = vi.fn<(d: number) => void>();
    const { rerender } = renderHook(
      ({ fn }: { fn: (d: number) => void }) => useCtrlDigitShortcut(fn),
      { initialProps: { fn: first } }
    );
    rerender({ fn: second });
    dispatch({ key: '5', ctrlKey: true });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(5);
  });

  it('calls preventDefault on a matched digit', () => {
    renderHook(() => useCtrlDigitShortcut(handler));
    const event = dispatch({ key: '2', ctrlKey: true });
    expect(event.defaultPrevented).toBe(true);
  });
});
