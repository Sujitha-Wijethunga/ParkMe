import { Platform } from 'react-native';

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export function resolveImageMimeType(
  uri?: string,
  mimeType?: string,
  fileName?: string
): string {
  const cleanMime = mimeType?.toLowerCase();
  if (cleanMime && (Object.values(MIME_MAP).includes(cleanMime) || cleanMime.startsWith('image/'))) {
    return cleanMime === 'image/jpg' ? 'image/jpeg' : cleanMime;
  }

  const ext = (fileName || uri || '').split(/[?#]/, 1)[0].split('.').pop()?.toLowerCase();
  if (ext && MIME_MAP[ext]) {
    return MIME_MAP[ext];
  }

  return 'image/jpeg';
}

export function getFileExtensionFromMime(mime: string): string {
  switch (mime.toLowerCase()) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/jpeg':
    case 'image/jpg':
    default:
      return 'jpg';
  }
}

function decodeBase64ToUint8(base64: string): Uint8Array {
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  const bufferLength = clean.length * 0.75 - (clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0);
  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const encoded1 = chars.indexOf(clean[i]);
    const encoded2 = chars.indexOf(clean[i + 1]);
    const encoded3 = chars.indexOf(clean[i + 2]);
    const encoded4 = chars.indexOf(clean[i + 3]);
    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== -1 && clean[i + 2] !== '=') {
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    }
    if (encoded4 !== -1 && clean[i + 3] !== '=') {
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
  }
  return bytes;
}

/**
 * Appends an image to a FormData object in a cross-platform way
 * supporting React Native (iOS/Android) and React Native Web.
 *
 * In modern Expo (SDK 57 / React Native 0.86+), the WinterCG FormData implementation
 * expects parts to implement a `bytes(): Promise<Uint8Array>` method or be a `Blob`.
 * Legacy React Native networking expects `{ uri, name, type }`.
 *
 * The object below satisfies BOTH implementations simultaneously.
 */
export async function appendImageToFormData(
  formData: FormData,
  fieldName: string,
  imageUri: string,
  options?: {
    mimeType?: string;
    fileName?: string;
    fileBlob?: Blob | any;
  }
): Promise<void> {
  const mime = resolveImageMimeType(imageUri, options?.mimeType, options?.fileName);
  const ext = getFileExtensionFromMime(mime);
  const fileName = options?.fileName || `${fieldName}_${Date.now()}.${ext}`;

  if (Platform.OS === 'web') {
    if (options?.fileBlob instanceof Blob) {
      formData.append(fieldName, options.fileBlob, fileName);
      return;
    }

    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      formData.append(fieldName, blob, fileName);
    } catch (err) {
      console.warn('[imageUpload] Failed to fetch imageUri as blob on web:', err);
      if (options?.fileBlob) {
        formData.append(fieldName, options.fileBlob, fileName);
      }
    }
    return;
  }

  // React Native (iOS / Android)
  let resolvedUri = imageUri;

  // Convert iOS ph:// URIs to local file:// URIs using expo-file-system
  if (Platform.OS === 'ios' && imageUri.startsWith('ph://')) {
    try {
      const FS: any = await import('expo-file-system');
      const cacheDir = FS.cacheDirectory || (FS.default && FS.default.cacheDirectory);
      if (cacheDir) {
        const cacheUri = `${cacheDir}${fileName}`;
        const copyAsync = FS.copyAsync || (FS.default && FS.default.copyAsync);
        if (typeof copyAsync === 'function') {
          await copyAsync({ from: imageUri, to: cacheUri });
          resolvedUri = cacheUri;
        }
      }
    } catch (err) {
      console.warn('[imageUpload] Could not copy ph:// URI to cache, using original:', err);
    }
  }

  // Dual-mode FormData part compatible with:
  // 1) Expo WinterCG fetch (checks 'bytes' in entry)
  // 2) React Native legacy fetch (checks uri, name, type)
  const nativeFile = {
    uri: resolvedUri,
    name: fileName,
    type: mime,
    bytes: async (): Promise<Uint8Array> => {
      // 1. Try expo-file-system File class
      try {
        const { File: ExpoFile } = require('expo-file-system');
        if (typeof ExpoFile === 'function') {
          const file = new ExpoFile(resolvedUri);
          if (typeof file.bytes === 'function') {
            return await file.bytes();
          }
        }
      } catch {
        // continue
      }

      // 2. Try fetch arrayBuffer
      try {
        const res = await fetch(resolvedUri);
        const buffer = await res.arrayBuffer();
        return new Uint8Array(buffer);
      } catch {
        // continue
      }

      // 3. Try reading as base64 via expo-file-system
      try {
        const FS = require('expo-file-system');
        const base64 = await FS.readAsStringAsync(resolvedUri, {
          encoding: FS.EncodingType.Base64,
        });
        return decodeBase64ToUint8(base64);
      } catch (err) {
        console.warn('[imageUpload] Failed to read bytes for file:', resolvedUri, err);
        return new Uint8Array(0);
      }
    },
  };

  formData.append(fieldName, nativeFile as any, fileName);
}

