const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const BUCKET = 'a208273-help-support-dev-ys';

exports.handler = async (event) => {
  // Normalize event across REST API (v1), HTTP API (v2), and misconfigured integrations
  const normalizedHttpMethod = event?.httpMethod || event?.requestContext?.http?.method || 'GET';
  const normalizedPath = event?.path || event?.rawPath || event?.resource || '/';
  const normalizedPathParameters = event?.pathParameters || {};
  const normalizedQueryStringParameters = (event && (event.queryStringParameters || event.queryString)) || {};
  let requestBodyRaw = event?.body;

  // Parse body if it exists
  let parsedBody = {};
  if (requestBodyRaw) {
    try {
      parsedBody = typeof requestBodyRaw === 'string' ? JSON.parse(requestBodyRaw) : requestBodyRaw;
    } catch (err) {
      console.error('Invalid JSON:', requestBodyRaw);
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }
  }

  // Helper function to create CORS response
  const createResponse = (statusCode, body) => ({
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  // Handle CORS preflight requests
  if (normalizedHttpMethod === 'OPTIONS') {
    return createResponse(200, {});
  }

  try {
    // Route based on HTTP method and path
    const pathSegments = String(normalizedPath || '/').split('/').filter(Boolean);

    // GET /files - List files and folders
    if (normalizedHttpMethod === 'GET' && pathSegments[0] === 'files' && pathSegments.length === 1) {
      const prefix = normalizedQueryStringParameters?.prefix || '';
      const flat = String(normalizedQueryStringParameters?.flat || '').toLowerCase() === 'true';

      if (flat) {
        return await listFilesFlat(prefix);
      } else {
        return await listFiles(prefix);
      }
    }

    // GET /files/{key}/download-url - Get download URL
    if (normalizedHttpMethod === 'GET' && pathSegments[0] === 'files' && pathSegments[2] === 'download-url') {
      const key = normalizedPathParameters?.key;
      if (!key) return createResponse(400, { error: 'Missing key' });
      return await getDownloadUrl(key);
    }

    // GET /files/{key}/download-info - Get download info
    if (normalizedHttpMethod === 'GET' && pathSegments[0] === 'files' && pathSegments[2] === 'download-info') {
      const key = normalizedPathParameters?.key;
      if (!key) return createResponse(400, { error: 'Missing key' });
      return await getDownloadInfo(key);
    }

    // POST /uploads - Start multipart upload
    if (normalizedHttpMethod === 'POST' && pathSegments[0] === 'uploads' && pathSegments.length === 1) {
      const { fileName, fileType } = parsedBody;
      return await startUpload(fileName, fileType);
    }

    // GET /uploads/{uploadId}/parts/{partNumber} - Get presigned URL for part upload
    if (normalizedHttpMethod === 'GET' && pathSegments[0] === 'uploads' && pathSegments[2] === 'parts') {
      const uploadId = normalizedPathParameters?.uploadId;
      const partNumber = parseInt(normalizedPathParameters?.partNumber, 10);
      const fileName = normalizedQueryStringParameters?.fileName;
      return await getPresignedUrl(fileName, uploadId, partNumber);
    }

    // POST /uploads/{uploadId}/complete - Complete multipart upload
    if (normalizedHttpMethod === 'POST' && pathSegments[0] === 'uploads' && pathSegments[2] === 'complete') {
      const uploadId = normalizedPathParameters?.uploadId;
      const { fileName, parts } = parsedBody;
      return await completeUpload(fileName, uploadId, parts);
    }

    // DELETE /uploads/{uploadId} - Abort multipart upload
    if (normalizedHttpMethod === 'DELETE' && pathSegments[0] === 'uploads' && pathSegments.length === 2) {
      const uploadId = normalizedPathParameters?.uploadId;
      const fileName = normalizedQueryStringParameters?.fileName;
      return await abortUpload(fileName, uploadId);
    }

    // POST /folders - Create folder
    if (normalizedHttpMethod === 'POST' && pathSegments[0] === 'folders' && pathSegments.length === 1) {
      const { key } = parsedBody;
      return await createFolder(key);
    }

    return createResponse(404, { error: 'Endpoint not found' });

  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};

// Helper functions remain unchanged below
async function listFiles(prefix = '') {
  const params = {
    Bucket: BUCKET,
    Prefix: prefix,
    Delimiter: '/',
  };

  const data = await s3.listObjectsV2(params).promise();

  const files = (data.Contents || [])
    .filter(obj => obj.Key !== params.Prefix && !obj.Key.endsWith('/'))
    .map(obj => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified
    }));

  const folders = data.CommonPrefixes ? data.CommonPrefixes.map(cp => cp.Prefix) : [];

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ folders, files })
  };
}

async function listFilesFlat(prefix = '') {
  let isTruncated = true;
  let continuationToken = undefined;
  const files = [];

  while (isTruncated) {
    const params = {
      Bucket: BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    };

    const resp = await s3.listObjectsV2(params).promise();
    (resp.Contents || []).forEach(obj => {
      if (!obj.Key.endsWith('/')) {
        files.push({
          key: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified
        });
      }
    });

    isTruncated = !!resp.IsTruncated;
    continuationToken = resp.NextContinuationToken;
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ files })
  };
}

async function startUpload(fileName, fileType) {
  if (!fileName || !fileType) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'fileName and fileType are required' })
    };
  }

  const params = {
    Bucket: BUCKET,
    Key: fileName,
    ContentType: fileType,
  };

  const { UploadId } = await s3.createMultipartUpload(params).promise();

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ uploadId: UploadId })
  };
}

async function getPresignedUrl(fileName, uploadId, partNumber) {
  if (!fileName || !uploadId || !partNumber) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'fileName, uploadId, and partNumber are required' })
    };
  }

  const params = {
    Bucket: BUCKET,
    Key: fileName,
    UploadId: uploadId,
    PartNumber: partNumber,
    Expires: 3600,
  };

  const url = await s3.getSignedUrlPromise('uploadPart', params);

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url })
  };
}

async function completeUpload(fileName, uploadId, parts) {
  if (!fileName || !uploadId || !parts) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'fileName, uploadId, and parts are required' })
    };
  }

  const params = {
    Bucket: BUCKET,
    Key: fileName,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts,
    },
  };

  const result = await s3.completeMultipartUpload(params).promise();

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ location: result.Location })
  };
}

async function abortUpload(fileName, uploadId) {
  if (!fileName || !uploadId) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'fileName and uploadId are required' })
    };
  }

  const params = {
    Bucket: BUCKET,
    Key: fileName,
    UploadId: uploadId,
  };

  await s3.abortMultipartUpload(params).promise();

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ aborted: true })
  };
}

async function createFolder(folderKey) {
  if (!folderKey) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'folderKey is required' })
    };
  }

  const normalizedKey = folderKey.endsWith('/') ? folderKey : `${folderKey}/`;

  const params = {
    Bucket: BUCKET,
    Key: normalizedKey,
    Body: '',
  };

  await s3.putObject(params).promise();

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      success: true,
      key: normalizedKey
    })
  };
}

async function getDownloadUrl(key) {
  if (!key) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'key is required' })
    };
  }

  const params = {
    Bucket: BUCKET,
    Key: key,
    Expires: 3600,
    ResponseContentDisposition: 'attachment',
  };

  const url = await s3.getSignedUrlPromise('getObject', params);

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url })
  };
}

async function getDownloadInfo(key) {
  if (!key) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'key is required' })
    };
  }

  const lowerKey = String(key).toLowerCase();
  const isPublic = lowerKey.startsWith('public/') || lowerKey.includes('/public/');
  const isGated = lowerKey.startsWith('gated/') || lowerKey.includes('/gated/');

  if (!isPublic && !isGated) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'File must be in public/ or gated/ folder' })
    };
  }

  if (isPublic) {
    const baseCdn = 'https://cdn.thomsonreuters.com/helpandsupp/us/case-notebook/external/';
    const filenameOnly = key.split('/').pop();
    const cdnUrl = `${baseCdn}${filenameOnly}`;

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: cdnUrl,
        type: 'public',
        downloadType: 'cdn'
      })
    };
  } else {
    const params = {
      Bucket: BUCKET,
      Key: key,
      Expires: 3600,
      ResponseContentDisposition: 'attachment',
    };

    const presignedUrl = await s3.getSignedUrlPromise('getObject', params);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: presignedUrl,
        type: 'gated',
        downloadType: 'presigned'
      })
    };
  }
} 