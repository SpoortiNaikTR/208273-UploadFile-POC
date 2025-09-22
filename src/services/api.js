const BASE_URL = 'https://i33abzt327.execute-api.us-east-1.amazonaws.com/dev';

export async function startUpload(fileName, fileType) {
  const res = await fetch(`${BASE_URL}/uploads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fileName, fileType }),
  });
  return res.json();
}

export async function listS3(prefix = '') {
  const url = `${BASE_URL}/files?prefix=${encodeURIComponent(prefix)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return res.json();
}

export async function getPresignedUrl(fileName, uploadId, partNumber) {
  const url = `${BASE_URL}/uploads/${uploadId}/parts/${partNumber}?fileName=${encodeURIComponent(fileName)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('Failed to parse response:', text);
    return {};
  }
}

export async function completeUpload(fileName, uploadId, parts) {
  const res = await fetch(`${BASE_URL}/uploads/${uploadId}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName,
      parts,
    }),
  });
  return res.json();
}

export async function abortUpload(fileName, uploadId) {
  const url = `${BASE_URL}/uploads/${uploadId}?fileName=${encodeURIComponent(fileName)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return res.json();
}

export async function listFlat(prefix = '') {
  const url = `${BASE_URL}/files?prefix=${encodeURIComponent(prefix)}&flat=true`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return res.json();
}

export async function listAll() {
  return listFlat('');
}

export async function createFolder(folderKey) {
  const res = await fetch(`${BASE_URL}/folders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key: folderKey }),
  });
  return res.json();
} 