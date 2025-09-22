import { startUpload, getPresignedUrl, completeUpload, abortUpload } from './api';

export async function uploadFile(file, onProgress) {
  if (!file) {
    throw new Error('No file provided');
  }
  if (file.size === 0) {
    throw new Error('Empty files are not supported for multipart upload');
  }

  const partSize = 500 * 1024 * 1024; // 500MB
  const totalParts = Math.ceil(file.size / partSize);
  const fileName = file.name;
  const fileType = file.type || 'application/octet-stream';

  const { uploadId } = await startUpload(fileName, fileType);
  if (!uploadId) {
    throw new Error('Failed to start upload');
  }

  const parts = [];
  let completedBytes = 0;

  const updateProgress = (currentPartUploadedBytes = 0) => {
    if (typeof onProgress === 'function') {
      const uploaded = completedBytes + currentPartUploadedBytes;
      const pct = Math.max(0, Math.min(100, Math.round((uploaded / file.size) * 100)));
      onProgress(pct);
    }
  };

  try {
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * partSize;
      const end = Math.min(start + partSize, file.size);
      const blob = file.slice(start, end);

      const { url } = await getPresignedUrl(fileName, uploadId, partNumber);
      if (!url) {
        throw new Error(`Presigned URL not received for part ${partNumber}`);
      }

      const etag = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', url, true);
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            updateProgress(evt.loaded);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const header = xhr.getResponseHeader('ETag');
            if (!header) {
              reject(new Error(`Missing ETag for part ${partNumber}`));
              return;
            }
            resolve(header);
          } else {
            reject(new Error(`Upload failed for part ${partNumber} with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error(`Network error uploading part ${partNumber}`));
        xhr.onabort = () => reject(new Error(`Aborted uploading part ${partNumber}`));
        xhr.send(blob);
      });

      parts.push({ ETag: etag, PartNumber: partNumber });
      completedBytes += blob.size;
      updateProgress(0);
    }

    const result = await completeUpload(fileName, uploadId, parts);
    updateProgress(file.size);
    return result;
  } catch (error) {
    try {
      await abortUpload(fileName, uploadId);
    } catch (_) {
      // swallow abort errors
    }
    throw error;
  }
}


