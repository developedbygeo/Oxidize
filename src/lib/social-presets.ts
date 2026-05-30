/**
 * Static catalog of dimension + format presets for the major social platforms.
 *
 * Numbers reflect each platform's *recommended* upload spec as of late 2025.
 * They drift — the maintainer guide is: if you spot one that's wrong, fix the
 * literal here. There's no remote-fetch path on purpose (avoids network +
 * supply-chain dependency for static dimension data).
 */

import type { ImageFormat } from '@/types/image';
import type { VideoFormat } from '@/types/video';

export type PresetMediaType = 'image' | 'video';

export type PresetPlatform =
  | 'instagram'
  | 'tiktok'
  | 'linkedin'
  | 'facebook'
  | 'x'
  | 'youtube'
  | 'pinterest';

export type SocialPreset = {
  /** Stable id used as a React key + in tests; never user-visible. */
  id: string;
  platform: PresetPlatform;
  mediaType: PresetMediaType;
  /** Short label shown on the preset card (e.g. "Square Post"). */
  name: string;
  /** Sub-label / hint shown under the name. */
  description: string;
  width: number;
  height: number;
  /** Image presets only: target encode format. Defaults to 'jpg' (photo-friendly
   *  + universally accepted by every social platform's upload pipeline). */
  imageFormat?: ImageFormat;
  /** Image presets only: encode quality 1-100. */
  imageQuality?: number;
  /** Video presets only: container format. */
  videoFormat?: VideoFormat;
  /** Video presets only: CRF (lower = better quality, larger files).
   *  23 is the standard "high quality" default. */
  videoCrf?: number;
};

export const PLATFORM_LABELS: Record<PresetPlatform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  x: 'X / Twitter',
  youtube: 'YouTube',
  pinterest: 'Pinterest',
};

/** Render order in the platform-picker chips. */
export const PLATFORM_ORDER: PresetPlatform[] = [
  'instagram',
  'tiktok',
  'youtube',
  'linkedin',
  'facebook',
  'x',
  'pinterest',
];

const IMG_QUALITY_PHOTO = 85;
const IMG_QUALITY_GRAPHIC = 90;
const VIDEO_CRF_HIGH = 23;

export const SOCIAL_PRESETS: SocialPreset[] = [
  // ───────── Instagram ─────────
  {
    id: 'instagram-profile',
    platform: 'instagram',
    mediaType: 'image',
    name: 'Profile photo',
    description: '320×320 · JPEG',
    width: 320,
    height: 320,
    imageFormat: 'jpg',
    imageQuality: IMG_QUALITY_PHOTO,
  },
  {
    id: 'instagram-square',
    platform: 'instagram',
    mediaType: 'image',
    name: 'Square post',
    description: '1080×1080 · JPEG',
    width: 1080,
    height: 1080,
    imageFormat: 'jpg',
    imageQuality: IMG_QUALITY_PHOTO,
  },
  {
    id: 'instagram-portrait',
    platform: 'instagram',
    mediaType: 'image',
    name: 'Portrait post',
    description: '1080×1350 · JPEG · 4:5',
    width: 1080,
    height: 1350,
    imageFormat: 'jpg',
    imageQuality: IMG_QUALITY_PHOTO,
  },
  {
    id: 'instagram-landscape',
    platform: 'instagram',
    mediaType: 'image',
    name: 'Landscape post',
    description: '1080×566 · JPEG · 1.91:1',
    width: 1080,
    height: 566,
    imageFormat: 'jpg',
    imageQuality: IMG_QUALITY_PHOTO,
  },
  {
    id: 'instagram-story-image',
    platform: 'instagram',
    mediaType: 'image',
    name: 'Story',
    description: '1080×1920 · JPEG · 9:16',
    width: 1080,
    height: 1920,
    imageFormat: 'jpg',
    imageQuality: IMG_QUALITY_PHOTO,
  },
  {
    id: 'instagram-reel',
    platform: 'instagram',
    mediaType: 'video',
    name: 'Reel',
    description: '1080×1920 · MP4 · 9:16',
    width: 1080,
    height: 1920,
    videoFormat: 'mp4',
    videoCrf: VIDEO_CRF_HIGH,
  },

  // ───────── TikTok ─────────
  {
    id: 'tiktok-profile',
    platform: 'tiktok',
    mediaType: 'image',
    name: 'Profile photo',
    description: '200×200 · JPEG',
    width: 200,
    height: 200,
    imageFormat: 'jpg',
    imageQuality: IMG_QUALITY_PHOTO,
  },
  {
    id: 'tiktok-video',
    platform: 'tiktok',
    mediaType: 'video',
    name: 'Video',
    description: '1080×1920 · MP4 · 9:16',
    width: 1080,
    height: 1920,
    videoFormat: 'mp4',
    videoCrf: VIDEO_CRF_HIGH,
  },

  // ───────── YouTube ─────────
  {
    id: 'youtube-channel-art',
    platform: 'youtube',
    mediaType: 'image',
    name: 'Channel art',
    description: '2560×1440 · JPEG',
    width: 2560,
    height: 1440,
    imageFormat: 'jpg',
    imageQuality: IMG_QUALITY_PHOTO,
  },
  {
    id: 'youtube-thumbnail',
    platform: 'youtube',
    mediaType: 'image',
    name: 'Thumbnail',
    description: '1280×720 · JPEG · 16:9',
    width: 1280,
    height: 720,
    imageFormat: 'jpg',
    imageQuality: IMG_QUALITY_PHOTO,
  },
  {
    id: 'youtube-video',
    platform: 'youtube',
    mediaType: 'video',
    name: 'Standard video',
    description: '1920×1080 · MP4 · 16:9',
    width: 1920,
    height: 1080,
    videoFormat: 'mp4',
    videoCrf: VIDEO_CRF_HIGH,
  },
  {
    id: 'youtube-short',
    platform: 'youtube',
    mediaType: 'video',
    name: 'Short',
    description: '1080×1920 · MP4 · 9:16',
    width: 1080,
    height: 1920,
    videoFormat: 'mp4',
    videoCrf: VIDEO_CRF_HIGH,
  },

  // ───────── LinkedIn ─────────
  {
    id: 'linkedin-profile',
    platform: 'linkedin',
    mediaType: 'image',
    name: 'Profile photo',
    description: '400×400 · JPEG',
    width: 400,
    height: 400,
    imageFormat: 'jpg',
    imageQuality: IMG_QUALITY_PHOTO,
  },
  {
    id: 'linkedin-company-logo',
    platform: 'linkedin',
    mediaType: 'image',
    name: 'Company logo',
    description: '300×300 · PNG',
    width: 300,
    height: 300,
    imageFormat: 'png',
    imageQuality: IMG_QUALITY_GRAPHIC,
  },
  {
    id: 'linkedin-banner',
    platform: 'linkedin',
    mediaType: 'image',
    name: 'Personal banner',
    description: '1584×396 · PNG · 4:1',
    width: 1584,
    height: 396,
    imageFormat: 'png',
    imageQuality: IMG_QUALITY_GRAPHIC,
  },
  {
    id: 'linkedin-company-banner',
    platform: 'linkedin',
    mediaType: 'image',
    name: 'Company banner',
    description: '1128×191 · PNG',
    width: 1128,
    height: 191,
    imageFormat: 'png',
    imageQuality: IMG_QUALITY_GRAPHIC,
  },
  {
    id: 'linkedin-post',
    platform: 'linkedin',
    mediaType: 'image',
    name: 'Post',
    description: '1200×627 · JPEG · 1.91:1',
    width: 1200,
    height: 627,
    imageFormat: 'jpg',
    imageQuality: IMG_QUALITY_PHOTO,
  },
  {
    id: 'linkedin-video',
    platform: 'linkedin',
    mediaType: 'video',
    name: 'Video',
    description: '1920×1080 · MP4 · 16:9',
    width: 1920,
    height: 1080,
    videoFormat: 'mp4',
    videoCrf: VIDEO_CRF_HIGH,
  },

  // ───────── Facebook ─────────
  {
    id: 'facebook-profile',
    platform: 'facebook',
    mediaType: 'image',
    name: 'Profile photo',
    description: '170×170 · JPEG',
    width: 170,
    height: 170,
    imageFormat: 'jpg',
    imageQuality: IMG_QUALITY_PHOTO,
  },
  {
    id: 'facebook-cover',
    platform: 'facebook',
    mediaType: 'image',
    name: 'Cover photo',
    description: '820×312 · JPEG',
    width: 820,
    height: 312,
    imageFormat: 'jpg',
    imageQuality: IMG_QUALITY_PHOTO,
  },
  {
    id: 'facebook-post',
    platform: 'facebook',
    mediaType: 'image',
    name: 'Post',
    description: '1200×630 · JPEG · 1.91:1',
    width: 1200,
    height: 630,
    imageFormat: 'jpg',
    imageQuality: IMG_QUALITY_PHOTO,
  },
  {
    id: 'facebook-story',
    platform: 'facebook',
    mediaType: 'image',
    name: 'Story',
    description: '1080×1920 · JPEG · 9:16',
    width: 1080,
    height: 1920,
    imageFormat: 'jpg',
    imageQuality: IMG_QUALITY_PHOTO,
  },
  {
    id: 'facebook-video',
    platform: 'facebook',
    mediaType: 'video',
    name: 'Video',
    description: '1280×720 · MP4 · 16:9',
    width: 1280,
    height: 720,
    videoFormat: 'mp4',
    videoCrf: VIDEO_CRF_HIGH,
  },

  // ───────── X / Twitter ─────────
  {
    id: 'x-profile',
    platform: 'x',
    mediaType: 'image',
    name: 'Profile photo',
    description: '400×400 · JPEG',
    width: 400,
    height: 400,
    imageFormat: 'jpg',
    imageQuality: IMG_QUALITY_PHOTO,
  },
  {
    id: 'x-header',
    platform: 'x',
    mediaType: 'image',
    name: 'Header',
    description: '1500×500 · JPEG · 3:1',
    width: 1500,
    height: 500,
    imageFormat: 'jpg',
    imageQuality: IMG_QUALITY_PHOTO,
  },
  {
    id: 'x-post',
    platform: 'x',
    mediaType: 'image',
    name: 'Post',
    description: '1200×675 · JPEG · 16:9',
    width: 1200,
    height: 675,
    imageFormat: 'jpg',
    imageQuality: IMG_QUALITY_PHOTO,
  },
  {
    id: 'x-video',
    platform: 'x',
    mediaType: 'video',
    name: 'Video',
    description: '1280×720 · MP4 · 16:9',
    width: 1280,
    height: 720,
    videoFormat: 'mp4',
    videoCrf: VIDEO_CRF_HIGH,
  },

  // ───────── Pinterest ─────────
  {
    id: 'pinterest-profile',
    platform: 'pinterest',
    mediaType: 'image',
    name: 'Profile photo',
    description: '165×165 · JPEG',
    width: 165,
    height: 165,
    imageFormat: 'jpg',
    imageQuality: IMG_QUALITY_PHOTO,
  },
  {
    id: 'pinterest-pin',
    platform: 'pinterest',
    mediaType: 'image',
    name: 'Standard pin',
    description: '1000×1500 · JPEG · 2:3',
    width: 1000,
    height: 1500,
    imageFormat: 'jpg',
    imageQuality: IMG_QUALITY_PHOTO,
  },
  {
    id: 'pinterest-square',
    platform: 'pinterest',
    mediaType: 'image',
    name: 'Square pin',
    description: '1000×1000 · JPEG',
    width: 1000,
    height: 1000,
    imageFormat: 'jpg',
    imageQuality: IMG_QUALITY_PHOTO,
  },
];

export const presetById = (id: string): SocialPreset | undefined =>
  SOCIAL_PRESETS.find((p) => p.id === id);

export const presetsForPlatform = (platform: PresetPlatform): SocialPreset[] =>
  SOCIAL_PRESETS.filter((p) => p.platform === platform);
