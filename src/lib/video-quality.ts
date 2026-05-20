/**
 * CRF (Constant Rate Factor) is the standard quality knob for h.264/h.265/VP9
 * and AV1 — but it's counterintuitive (lower = better) and tied to the codec.
 *
 * For the UI we map CRF 0..51 → a 0..100 "quality" percent that reads the
 * normal way (higher = better). Encoded value stays as CRF so the backend
 * doesn't change.
 */
const CRF_MIN = 0;
const CRF_MAX = 51;

export const crfToQuality = (crf: number): number =>
  Math.round(((CRF_MAX - crf) / (CRF_MAX - CRF_MIN)) * 100);

export const qualityToCrf = (quality: number): number =>
  Math.round(CRF_MAX - (quality / 100) * (CRF_MAX - CRF_MIN));
