export type DetectedMedia = {
  ext: 'jpg' | 'png' | 'gif' | 'webp' | 'mp4' | 'mov' | 'webm';
  mime: string;
  kind: 'IMAGE' | 'VIDEO';
};

export function detectMedia(buffer: Buffer): DetectedMedia | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg', kind: 'IMAGE' };
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: 'png', mime: 'image/png', kind: 'IMAGE' };
  }
  if (buffer.length >= 6) {
    const signature = buffer.subarray(0, 6).toString('ascii');
    if (signature === 'GIF87a' || signature === 'GIF89a') {
      return { ext: 'gif', mime: 'image/gif', kind: 'IMAGE' };
    }
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { ext: 'webp', mime: 'image/webp', kind: 'IMAGE' };
  }
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buffer.subarray(8, 12).toString('ascii');
    if (brand === 'qt  ') {
      return { ext: 'mov', mime: 'video/quicktime', kind: 'VIDEO' };
    }
    return { ext: 'mp4', mime: 'video/mp4', kind: 'VIDEO' };
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) {
    return { ext: 'webm', mime: 'video/webm', kind: 'VIDEO' };
  }
  return null;
}

export function mediaMatchesDeclaredType(detected: DetectedMedia, declaredMime: string): boolean {
  if (detected.mime === declaredMime) return true;
  // Neki browseri MP4/MOV kontejnere prijavljuju zamijenjenim MIME tipom.
  return detected.kind === 'VIDEO' &&
    (detected.mime === 'video/mp4' || detected.mime === 'video/quicktime') &&
    (declaredMime === 'video/mp4' || declaredMime === 'video/quicktime');
}
