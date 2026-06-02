import { describe, expect, it } from 'vitest';
import packageJson from '../../package.json';
import tauriConf from '../../src-tauri/tauri.conf.json';
import { APP_VERSION, CHANGELOG, findVersion, shouldAutoOpen } from './changelog';

describe('changelog catalog', () => {
  it('has at least one version entry', () => {
    expect(CHANGELOG.length).toBeGreaterThan(0);
  });

  it('every version has a non-empty body', () => {
    for (const v of CHANGELOG) {
      expect(v.body.trim().length, `${v.version} has empty body`).toBeGreaterThan(0);
    }
  });

  it('every version date is YYYY-MM-DD when present', () => {
    for (const v of CHANGELOG) {
      if (v.date.length === 0) continue;
      expect(v.date, `${v.version} date format`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('versions are listed newest-first (numeric comparison)', () => {
    // String sort gets 0.10.0 vs 0.2.0 wrong, so we compare numerically.
    const parse = (v: string) => v.split('.').map(Number);
    const versions = CHANGELOG.map((v) => v.version);
    for (let i = 1; i < versions.length; i++) {
      const a = parse(versions[i - 1]);
      const b = parse(versions[i]);
      let ordered = false;
      for (let j = 0; j < Math.max(a.length, b.length); j++) {
        const da = a[j] ?? 0;
        const db = b[j] ?? 0;
        if (da > db) {
          ordered = true;
          break;
        }
        if (da < db) {
          throw new Error(`Out of order: ${versions[i - 1]} should be > ${versions[i]}`);
        }
      }
      expect(ordered, `Duplicate or unordered: ${versions[i - 1]} vs ${versions[i]}`).toBe(true);
    }
  });

  it('versions are unique', () => {
    const versions = CHANGELOG.map((v) => v.version);
    expect(new Set(versions).size).toBe(versions.length);
  });

  it('APP_VERSION matches the newest entry', () => {
    expect(APP_VERSION).toBe(CHANGELOG[0].version);
  });

  it('APP_VERSION matches package.json', () => {
    expect(APP_VERSION).toBe(packageJson.version);
  });

  it('APP_VERSION matches tauri.conf.json — keeps the auto-open trigger honest', () => {
    expect(APP_VERSION).toBe(tauriConf.version);
  });
});

describe('findVersion', () => {
  it('returns the matching entry', () => {
    const latest = CHANGELOG[0];
    expect(findVersion(latest.version)).toEqual(latest);
  });

  it('returns undefined for an unknown version', () => {
    expect(findVersion('99.99.99')).toBeUndefined();
  });
});

describe('shouldAutoOpen', () => {
  it('is true when the user has never seen the panel', () => {
    expect(shouldAutoOpen(null, '0.2.0')).toBe(true);
  });

  it('is true after a version bump', () => {
    expect(shouldAutoOpen('0.1.0', '0.2.0')).toBe(true);
  });

  it('is false when last-seen matches the current version', () => {
    expect(shouldAutoOpen('0.2.0', '0.2.0')).toBe(false);
  });

  it('treats a downgrade as a mismatch (same as a bump)', () => {
    expect(shouldAutoOpen('0.3.0', '0.2.0')).toBe(true);
  });
});
