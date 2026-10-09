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

/**
 * Appends an image to a FormData object in a cross-platform way
 * supporting React Native (iOS/Android) and React Native Web.
 *
 * On native, RN's FormData polyfill accepts { uri, name, type } objects.
 * For iOS ph:// URIs (from ImagePicker without copying), expo-file-system
 * is used to copy to a local file:// cache URI first.
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
    // On web: use the blob directly if provided, otherwise fetch the URI as blob
    if (options?.fileBlob instanceof Blob) {
      formData.append(fieldName, options.fileBlob, fileName);
      return;
    }

    try {
      // Expo ImagePicker on web gives blob: or data: URIs which can be fetched
      const response = await fetch(imageUri);
      const blob = await response.blob();
      formData.append(fieldName, blob, fileName);
    } catch (err) {
      console.warn('[imageUpload] Failed to fetch imageUri as blob on web:', err);
      if (options?.fileBlob) {
        formData.append(fieldName, options.fileBlob, fileName);
      }
    }
  } else {
    // React Native (iOS / Android)
    // RN's fetch network layer expects { uri, name, type } for file uploads in FormData.
    // Appending a Blob to FormData on native causes 'Unsupported FormDataPart implementation'.
    let resolvedUri = imageUri;

    // Convert iOS ph:// URIs to local file:// URIs using expo-file-system
    if (Platform.OS === 'ios' && imageUri.startsWith('ph://')) {
      try {
        const FS: any = await import('expo-file-system');
        // @ts-ignore
        const cacheDir = FS.cacheDirectory || (FS.default && FS.default.cacheDirectory);
        if (cacheDir) {
          const cacheUri = `${cacheDir}${fileName}`;
          // @ts-ignore
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

    // Append using the exact structure expected by React Native's networking layer
    const nativeFile = { uri: resolvedUri, name: fileName, type: mime };
    formData.append(fieldName, nativeFile as any);
  }
}
