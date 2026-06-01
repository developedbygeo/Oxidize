import { describe, expect, it } from 'vitest';
import { navOrder, operationPages, pageMeta } from './registry';
import type { Page } from './registry';

const allPages: Page[] = [
  'convert',
  'compress',
  'beautify',
  'effects',
  'crop',
  'rotate',
  'resize',
  'watermark',
  'social',
  'pipeline',
  'video-convert',
  'video-compress',
  'video-resize',
  'video-watermark',
  'video-trim',
  'extract-audio',
  'history',
];

describe('pages/registry', () => {
  it('has pageMeta for every Page variant', () => {
    for (const page of allPages) {
      expect(pageMeta[page], `pageMeta missing entry for "${page}"`).toBeDefined();
      expect(pageMeta[page].title.length).toBeGreaterThan(0);
      expect(pageMeta[page].subtitle.length).toBeGreaterThan(0);
      expect(pageMeta[page].navLabel.length).toBeGreaterThan(0);
    }
  });

  it('has an operationPages component for every Page except history', () => {
    for (const page of allPages) {
      if (page === 'history') continue;
      expect(
        operationPages[page],
        `operationPages missing component for "${page}"`
      ).toBeDefined();
    }
  });

  it('does not include history in operationPages', () => {
    expect(operationPages).not.toHaveProperty('history');
  });

  it('navOrder is a subset of the Page union (no stale ids)', () => {
    for (const page of navOrder) {
      expect(allPages.includes(page), `navOrder has unknown page "${page}"`).toBe(true);
    }
  });

  it('navOrder contains no duplicates', () => {
    expect(new Set(navOrder).size).toBe(navOrder.length);
  });

  it('navOrder fits within Ctrl+1..9 shortcut range', () => {
    expect(navOrder.length).toBeLessThanOrEqual(9);
  });

  it('every navOrder entry has corresponding pageMeta (so the cheat-sheet stays in sync)', () => {
    for (const page of navOrder) {
      expect(pageMeta[page].navLabel.length).toBeGreaterThan(0);
    }
  });
});
