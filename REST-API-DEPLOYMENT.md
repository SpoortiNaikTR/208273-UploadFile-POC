# REST API Migration Guide

This guide explains how to migrate from the action-based API to a proper REST API for your S3 multipart upload application.

## Overview

The new REST API provides the same functionality as the old action-based API but follows REST principles:

- **Resource-based URLs**: `/files`, `/uploads`, `/folders`
- **HTTP methods**: GET, POST, PUT, DELETE
- **Proper status codes**: 200, 400, 404, 500
- **Better error handling**: Consistent error responses

## API Endpoints

### Files Management
- `GET /files?prefix={prefix}` - List files and folders
- `GET /files?prefix={prefix}&flat=true` - List all files (flat structure)
- `GET /files/{key}/download-url` - Get download URL
- `GET /files/{key}/download-info` - Get download information

### Upload Management
- `POST /uploads` - Start multipart upload
- `GET /uploads/{uploadId}/parts/{partNumber}?fileName={fileName}` - Get presigned URL for part
- `POST /uploads/{uploadId}/complete` - Complete multipart upload
- `DELETE /uploads/{uploadId}?fileName={fileName}` - Abort multipart upload

### Folder Management
- `POST /folders` - Create folder

## Deployment Options

### Option 1: AWS SAM (Recommended)

1. **Install AWS SAM CLI**:
   ```bash
   # macOS
   brew install aws-sam-cli
   
   # Windows
   # Download from AWS website
   
   # Linux
   pip install aws-sam-cli
   ```

2. **Deploy using SAM**:
   ```bash
   chmod +x deploy-sam.sh
   ./deploy-sam.sh
   ```

3. **Follow the guided deployment**:
   - Enter stack name: `s3-multipart-rest-api`
   - Enter AWS region: `us-east-1`
   - Confirm IAM role creation: `Y`
   - Confirm API Gateway creation: `Y`

### Option 2: Manual AWS CLI Deployment

1. **Update the deployment script**:
   ```bash
   # Edit deploy-rest-api.sh
   # Update LAMBDA_ROLE_ARN with your IAM role ARN
   ```

2. **Run the deployment**:
   ```bash
   chmod +x deploy-rest-api.sh
   ./deploy-rest-api.sh
   ```

### Option 3: AWS Console Deployment

1. **Create Lambda Function**:
   - Runtime: Node.js 18.x
   - Handler: `rest-api.handler`
   - Upload `src/rest-api.js` and `node_modules/`

2. **Create API Gateway**:
   - Type: REST API
   - Create resources and methods as defined in `api-gateway-config.yaml`

3. **Configure CORS**:
   - Enable CORS for all resources
   - Allow headers: `Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token`
   - Allow methods: `GET,POST,PUT,DELETE,OPTIONS`
   - Allow origin: `*`

## Frontend Updates

The frontend has been updated to use the new REST API endpoints. Key changes:

1. **Updated `src/api.js`**:
   - Changed from action-based POST requests to REST endpoints
   - Uses proper HTTP methods (GET, POST, DELETE)
   - Updated URL structure

2. **No changes needed in `src/App.js`**:
   - All function calls remain the same
   - Only the underlying API implementation changed

## Testing the API

### Test with curl

```bash
# List files
curl "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev/files?prefix="

# Start upload
curl -X POST "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev/uploads" \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.txt","fileType":"text/plain"}'

# Create folder
curl -X POST "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev/folders" \
  -H "Content-Type: application/json" \
  -d '{"key":"test-folder/"}'
```

### Test with Postman

1. Import the API specification from `api-gateway-config.yaml`
2. Update the base URL to your API Gateway URL
3. Test each endpoint

## Migration Checklist

- [ ] Deploy new REST API
- [ ] Update frontend `BASE_URL` in `src/api.js`
- [ ] Test all functionality
- [ ] Update API documentation
- [ ] Monitor API Gateway metrics
- [ ] Set up CloudWatch alarms
- [ ] Configure API Gateway usage plans (if needed)

## Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Ensure CORS is properly configured in API Gateway
   - Check that all required headers are allowed

2. **Lambda Timeout**:
   - Increase timeout in Lambda configuration
   - Optimize Lambda function code

3. **Permission Errors**:
   - Ensure Lambda has proper S3 permissions
   - Check IAM role configuration

4. **API Gateway Integration Errors**:
   - Verify Lambda integration is configured correctly
   - Check Lambda function name and handler

### Debugging

1. **Check CloudWatch Logs**:
   ```bash
   aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/s3-multipart-rest-api"
   ```

2. **Test Lambda directly**:
   ```bash
   aws lambda invoke --function-name s3-multipart-rest-api --payload '{"httpMethod":"GET","path":"/files"}' response.json
   ```

3. **Check API Gateway logs**:
   - Enable CloudWatch logging in API Gateway
   - Monitor access logs for errors

## Benefits of REST API

1. **Better Documentation**: OpenAPI/Swagger specification
2. **Easier Testing**: Standard HTTP methods and status codes
3. **Better Caching**: HTTP caching headers
4. **Improved Security**: Standard authentication methods
5. **API Gateway Features**: Usage plans, throttling, monitoring
6. **Better Error Handling**: Consistent error responses
7. **Easier Integration**: Standard REST patterns

## Next Steps

1. **Add Authentication**: Implement API keys or JWT tokens
2. **Add Rate Limiting**: Configure API Gateway usage plans
3. **Add Monitoring**: Set up CloudWatch dashboards
4. **Add Logging**: Implement structured logging
5. **Add Validation**: Add request/response validation
6. **Add Documentation**: Create API documentation site 