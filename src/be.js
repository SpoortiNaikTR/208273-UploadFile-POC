const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const BUCKET = 'a208273-help-support-dev-ys';

exports.handler = async (event) => {
  const method = event.httpMethod;
  const path = event.resource || event.path;
  let body = {};

  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON in request body' }),
    };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
  };

  // POST /uploads
  if (method === 'POST' && path === '/uploads') {
    const { fileName, fileType } = body;
    const params = {
      Bucket: BUCKET,
      Key: fileName,
      ContentType: fileType,
    };
    const { UploadId } = await s3.createMultipartUpload(params).promise();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ uploadId: UploadId }),
    };
  }

  // GET /uploads/{uploadId}/parts/{partNumber}
  if (method === 'GET' && path.match(/^\/uploads\/[^/]+\/parts\/\d+$/)) {
    const { fileName, uploadId, partNumber } = event.queryStringParameters;
    const params = {
      Bucket: BUCKET,
      Key: fileName,
      UploadId: uploadId,
      PartNumber: parseInt(partNumber),
      Expires: 3600,
    };
    const url = await s3.getSignedUrlPromise('uploadPart', params);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url }),
    };
  }

  // POST /uploads/{uploadId}/complete
  if (method === 'POST' && path.match(/^\/uploads\/[^/]+\/complete$/)) {
    const { fileName, uploadId, parts } = body;
    const params = {
      Bucket: BUCKET,
      Key: fileName,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    };
    const result = await s3.completeMultipartUpload(params).promise();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ location: result.Location }),
    };
  }

  // DELETE /uploads/{uploadId}
  if (method === 'DELETE' && path.match(/^\/uploads\/[^/]+$/)) {
    const { fileName, uploadId } = event.queryStringParameters;
    const params = {
      Bucket: BUCKET,
      Key: fileName,
      UploadId: uploadId,
    };
    await s3.abortMultipartUpload(params).promise();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ aborted: true }),
    };
  }

  // POST /folders
  if (method === 'POST' && path === '/folders') {
    const folderKey = body.key;
    if (!folderKey) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing folder key' }) };
    }
    const normalizedKey = folderKey.endsWith('/') ? folderKey : `${folderKey}/`;
    const params = { Bucket: BUCKET, Key: normalizedKey, Body: '' };
    await s3.putObject(params).promise();
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, key: normalizedKey }) };
  }

  // GET /files
  if (method === 'GET' && path === '/files') {
    const prefix = event.queryStringParameters?.prefix || '';
    const params = { Bucket: BUCKET, Prefix: prefix, Delimiter: '/' };
    const data = await s3.listObjectsV2(params).promise();
    const files = (data.Contents || [])
      .filter(obj => obj.Key !== prefix && !obj.Key.endsWith('/'))
      .map(obj => ({ key: obj.Key, size: obj.Size, lastModified: obj.LastModified }));
    const folders = data.CommonPrefixes?.map(cp => cp.Prefix) || [];
    return { statusCode: 200, headers, body: JSON.stringify({ folders, files }) };
  }

  // GET /files/flat
  if (method === 'GET' && path === '/files/flat') {
    const prefix = event.queryStringParameters?.prefix || '';
    let isTruncated = true;
    let continuationToken;
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
          files.push({ key: obj.Key, size: obj.Size, lastModified: obj.LastModified });
        }
      });
      isTruncated = !!resp.IsTruncated;
      continuationToken = resp.NextContinuationToken;
    }

    return { statusCode: 200, headers, body: JSON.stringify({ files }) };
  }

  // GET /files/download-url
  if (method === 'GET' && path === '/files/download-url') {
    const key = event.queryStringParameters?.key;
    if (!key) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing key' }) };

    const params = {
      Bucket: BUCKET,
      Key: key,
      Expires: 3600,
      ResponseContentDisposition: 'attachment',
    };
    const url = await s3.getSignedUrlPromise('getObject', params);
    return { statusCode: 200, headers, body: JSON.stringify({ url }) };
  }

  // GET /files/download-info
  if (method === 'GET' && path === '/files/download-info') {
    const key = event.queryStringParameters?.key;
    if (!key) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing key' }) };

    const lowerKey = key.toLowerCase();
    const isPublic = lowerKey.startsWith('public/') || lowerKey.includes('/public/');
    const isGated = lowerKey.startsWith('gated/') || lowerKey.includes('/gated/');

    if (!isPublic && !isGated) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'File must be in public/ or gated/ folder' }) };
    }

    if (isPublic) {
      const baseCdn = 'https://cdn.thomsonreuters.com/helpandsupp/us/case-notebook/external/';
      const filenameOnly = key.split('/').pop();
      const cdnUrl = `${baseCdn}${filenameOnly}`;
      return { statusCode: 200, headers, body: JSON.stringify({ url: cdnUrl, type: 'public', downloadType: 'cdn' }) };
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
        headers,
        body: JSON.stringify({ url: presignedUrl, type: 'gated', downloadType: 'presigned' }),
      };
    }
  }

  return { statusCode: 404, headers, body: JSON.stringify({ message: 'Route not found' }) };
};