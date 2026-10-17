import { describe, it, expect } from 'vitest';
import {
  generateObjectKey,
  validateUploadParams,
  createPresignedUploadUrl,
  retainBiometricArchive,
  deleteVerificationObjects,
} from '../src/server/storage/r2.ts';

describe('Cloudflare R2 Biometric Storage & Retention', () => {
  const sessionId = 'test-session-uuid-1234';

  it('generates secure, non-guessable server-side object paths for face and thumb', () => {
    const thumbKey = generateObjectKey(sessionId, 'THUMB_RIGHT');
    const faceKey = generateObjectKey(sessionId, 'FACE_FRONT');

    expect(thumbKey).toMatch(/^biometrics\/test-session-uuid-1234\/thumb-right-[a-f0-9]{12}\.png$/);
    expect(faceKey).toMatch(/^biometrics\/test-session-uuid-1234\/face-front-[a-f0-9]{12}\.jpg$/);
  });

  it('validates allowed image MIME types and rejects executables or scripts', () => {
    expect(() => validateUploadParams('image/jpeg', 1024 * 500)).not.toThrow();
    expect(() => validateUploadParams('image/png', 1024 * 500)).not.toThrow();
    expect(() => validateUploadParams('image/webp', 1024 * 500)).not.toThrow();

    expect(() => validateUploadParams('application/x-sh', 1024)).toThrow(/UNSUPPORTED_MEDIA_TYPE/);
    expect(() => validateUploadParams('text/html', 1024)).toThrow(/UNSUPPORTED_MEDIA_TYPE/);
  });

  it('rejects oversized files exceeding 10MB limit', () => {
    const elevenMegabytes = 11 * 1024 * 1024;
    expect(() => validateUploadParams('image/jpeg', elevenMegabytes)).toThrow(/FILE_TOO_LARGE/);
  });

  it('generates upload URLs and retains biometric archive in Cloudflare R2', async () => {
    const uploadRes = await createPresignedUploadUrl(sessionId, 'THUMB_RIGHT', 'image/png', 1024 * 200);
    expect(uploadRes.uploadUrl).toBeDefined();
    expect(uploadRes.objectKey).toContain(sessionId);

    // Retain archive
    const retainRes = await retainBiometricArchive(sessionId, {
      faceFront: 'biometrics/sess_123/face-front.jpg',
      faceRight: 'biometrics/sess_123/face-right.jpg',
      faceLeft: 'biometrics/sess_123/face-left.jpg',
      thumbRight: uploadRes.objectKey,
    });

    expect(retainRes.success).toBe(true);
    expect(retainRes.retainedKeys).toHaveLength(4);
    expect(retainRes.storageBucket).toBeDefined();

    // Idempotent deletion if requested
    const cleanRes1 = await deleteVerificationObjects(sessionId);
    expect(cleanRes1.deletedCount).toBeGreaterThanOrEqual(0);
  });
});
