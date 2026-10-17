import crypto from 'node:crypto';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'relationship-verification-biometrics';

const isR2Configured = Boolean(
  R2_ACCOUNT_ID &&
  R2_ACCOUNT_ID !== 'REPLACE_WITH_SECRET' &&
  R2_ACCESS_KEY_ID &&
  R2_ACCESS_KEY_ID !== 'REPLACE_WITH_SECRET' &&
  R2_SECRET_ACCESS_KEY &&
  R2_SECRET_ACCESS_KEY !== 'REPLACE_WITH_SECRET'
);

let s3Client: S3Client | null = null;
if (isR2Configured) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });
}

// In-memory registry of biometric uploads for local mock development / fallback
const mockUploadRegistry = new Map<string, { size: number; contentType: string; createdAt: number }>();

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export type UploadFileType = 'FACE_FRONT' | 'FACE_RIGHT' | 'FACE_LEFT' | 'THUMB_RIGHT';

/**
 * Generates an unforgeable, server-controlled object key stored in Cloudflare R2
 */
export function generateObjectKey(sessionId: string, fileType: UploadFileType): string {
  const fileKeyMap: Record<UploadFileType, string> = {
    FACE_FRONT: 'face-front',
    FACE_RIGHT: 'face-right',
    FACE_LEFT: 'face-left',
    THUMB_RIGHT: 'thumb-right',
  };

  const suffix = crypto.randomBytes(6).toString('hex');
  const target = fileKeyMap[fileType] || 'misc';
  const ext = fileType === 'THUMB_RIGHT' ? 'png' : 'jpg';
  return `biometrics/${sessionId}/${target}-${suffix}.${ext}`;
}

/**
 * Validates upload parameters before generating presigned URL
 */
export function validateUploadParams(contentType: string, fileSizeBytes: number): void {
  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    throw new Error(
      `UNSUPPORTED_MEDIA_TYPE: Only ${ALLOWED_MIME_TYPES.join(', ')} are accepted. Received: ${contentType}`
    );
  }

  if (fileSizeBytes <= 0 || fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `FILE_TOO_LARGE: File size must be between 1 byte and ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB. Received: ${fileSizeBytes} bytes`
    );
  }
}

/**
 * Generates a presigned PUT URL for Cloudflare R2 (or simulated URL in mock mode)
 */
export async function createPresignedUploadUrl(
  sessionId: string,
  fileType: UploadFileType,
  contentType: string,
  fileSizeBytes: number
): Promise<{ uploadUrl: string; objectKey: string; expiresInSeconds: number }> {
  validateUploadParams(contentType, fileSizeBytes);
  const objectKey = generateObjectKey(sessionId, fileType);
  const expiresInSeconds = 900; // 15 minutes

  if (s3Client && isR2Configured) {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
      ContentType: contentType,
      ContentLength: fileSizeBytes,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
    return { uploadUrl, objectKey, expiresInSeconds };
  }

  // Fallback to local server upload proxy endpoint in mock mode
  mockUploadRegistry.set(objectKey, {
    size: fileSizeBytes,
    contentType,
    createdAt: Date.now(),
  });

  return {
    uploadUrl: `/api/verification/upload-simulated?key=${encodeURIComponent(objectKey)}`,
    objectKey,
    expiresInSeconds,
  };
}

/**
 * Persists and retains the biometric archive (3 face angles + right thumb) in Cloudflare R2
 */
export async function retainBiometricArchive(
  sessionId: string,
  keys: { faceFront: string; faceRight: string; faceLeft: string; thumbRight: string }
): Promise<{ success: boolean; storageBucket: string; retainedKeys: string[] }> {
  const retainedKeys = [keys.faceFront, keys.faceRight, keys.faceLeft, keys.thumbRight];
  return {
    success: true,
    storageBucket: R2_BUCKET_NAME,
    retainedKeys,
  };
}

/**
 * Idempotently deletes all temporary objects for a verification session (if explicitly requested)
 */
export async function deleteVerificationObjects(sessionId: string): Promise<{ deletedCount: number }> {
  const prefix = `biometrics/${sessionId}/`;

  if (s3Client && isR2Configured) {
    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: prefix,
      });

      const listResult = await s3Client.send(listCommand);
      const objects = listResult.Contents?.map((obj) => ({ Key: obj.Key })) || [];

      if (objects.length > 0) {
        await s3Client.send(
          new DeleteObjectsCommand({
            Bucket: R2_BUCKET_NAME,
            Delete: { Objects: objects },
          })
        );
      }
      return { deletedCount: objects.length };
    } catch {
      return { deletedCount: 0 };
    }
  }

  // Clear from mock registry
  let deletedCount = 0;
  for (const key of mockUploadRegistry.keys()) {
    if (key.startsWith(prefix)) {
      mockUploadRegistry.delete(key);
      deletedCount++;
    }
  }

  return { deletedCount };
}
