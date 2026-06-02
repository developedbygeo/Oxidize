export type ChangelogVersion = {
  version: string;
  date: string;
  body: string;
};

const compareVersions = (a: string, b: string): number => {
  const pa = a.split('.').map((s) => Number.parseInt(s, 10) || 0);
  const pb = b.split('.').map((s) => Number.parseInt(s, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

const extractDate = (raw: string): string => {
  const match = raw.match(/<!--\s*date:\s*(\d{4}-\d{2}-\d{2})\s*-->/);
  return match?.[1] ?? '';
};

const versionFromPath = (path: string): string => {
  const match = path.match(/\/([\d.]+)\.md$/);
  if (!match) throw new Error(`Could not extract version from changelog path: ${path}`);
  return match[1];
};

const FILES = import.meta.glob<string>('../../docs/changelogs/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});

export const CHANGELOG: ChangelogVersion[] = Object.entries(FILES)
  .map(([path, raw]) => ({
    version: versionFromPath(path),
    date: extractDate(raw),
    body: raw,
  }))
  .sort((a, b) => compareVersions(b.version, a.version));

export const APP_VERSION = CHANGELOG[0]?.version ?? '0.0.0';

/** Find the changelog entry for `version`, if any. */
export const findVersion = (version: string): ChangelogVersion | undefined =>
  CHANGELOG.find((v) => v.version === version);

export const shouldAutoOpen = (lastSeenVersion: string | null, appVersion: string = APP_VERSION): boolean => {
  if (!lastSeenVersion) return true;
  return lastSeenVersion !== appVersion;
};
