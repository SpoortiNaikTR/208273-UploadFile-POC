#!/bin/bash

# Configuration
API_NAME="S3MultipartUploadAPI"
STAGE_NAME="dev"
REGION="us-east-1"
LAMBDA_FUNCTION_NAME="s3-multipart-rest-api"
LAMBDA_ROLE_ARN="arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-s3-role"  # Update with your role ARN

echo "🚀 Deploying REST API to AWS..."

# 1. Create or update Lambda function
echo "📦 Creating/updating Lambda function..."

# Create deployment package
zip -r function.zip src/rest-api.js node_modules/

# Create or update Lambda function
aws lambda create-function \
  --function-name $LAMBDA_FUNCTION_NAME \
  --runtime nodejs18.x \
  --role $LAMBDA_ROLE_ARN \
  --handler rest-api.handler \
  --zip-file fileb://function.zip \
  --region $REGION \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables='{"BUCKET_NAME":"a208273-help-support-dev-ys"}' \
  2>/dev/null || \
aws lambda update-function-code \
  --function-name $LAMBDA_FUNCTION_NAME \
  --zip-file fileb://function.zip \
  --region $REGION

# 2. Create API Gateway REST API
echo "🌐 Creating API Gateway REST API..."

# Create the API
API_ID=$(aws apigateway create-rest-api \
  --name $API_NAME \
  --description "S3 Multipart Upload REST API" \
  --region $REGION \
  --query 'id' \
  --output text)

echo "API ID: $API_ID"

# 3. Get root resource ID
ROOT_RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $REGION \
  --query 'items[?path==`/`].id' \
  --output text)

echo "Root Resource ID: $ROOT_RESOURCE_ID"

# 4. Create resources and methods
echo "🔧 Creating API resources and methods..."

# Create /files resource
FILES_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_RESOURCE_ID \
  --path-part "files" \
  --region $REGION \
  --query 'id' \
  --output text)

# Create /uploads resource
UPLOADS_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_RESOURCE_ID \
  --path-part "uploads" \
  --region $REGION \
  --query 'id' \
  --output text)

# Create /folders resource
FOLDERS_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_RESOURCE_ID \
  --path-part "folders" \
  --region $REGION \
  --query 'id' \
  --output text)

# Create /{key} resource under /files
FILES_KEY_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $FILES_RESOURCE_ID \
  --path-part "{key}" \
  --region $REGION \
  --query 'id' \
  --output text)

# Create /{uploadId} resource under /uploads
UPLOADS_ID_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $UPLOADS_RESOURCE_ID \
  --path-part "{uploadId}" \
  --region $REGION \
  --query 'id' \
  --output text)

# Create /download-url and /download-info resources under /files/{key}
DOWNLOAD_URL_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $FILES_KEY_RESOURCE_ID \
  --path-part "download-url" \
  --region $REGION \
  --query 'id' \
  --output text)

DOWNLOAD_INFO_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $FILES_KEY_RESOURCE_ID \
  --path-part "download-info" \
  --region $REGION \
  --query 'id' \
  --output text)

# Create /parts resource under /uploads/{uploadId}
PARTS_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $UPLOADS_ID_RESOURCE_ID \
  --path-part "parts" \
  --region $REGION \
  --query 'id' \
  --output text)

# Create /{partNumber} resource under /uploads/{uploadId}/parts
PART_NUMBER_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $PARTS_RESOURCE_ID \
  --path-part "{partNumber}" \
  --region $REGION \
  --query 'id' \
  --output text)

# Create /complete resource under /uploads/{uploadId}
COMPLETE_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $UPLOADS_ID_RESOURCE_ID \
  --path-part "complete" \
  --region $REGION \
  --query 'id' \
  --output text)

# 5. Create Lambda integration
echo "🔗 Creating Lambda integration..."

# Create Lambda integration
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $ROOT_RESOURCE_ID \
  --http-method ANY \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$(aws sts get-caller-identity --query Account --output text):function:$LAMBDA_FUNCTION_NAME/invocations" \
  --region $REGION

# 6. Add Lambda permission
echo "🔐 Adding Lambda permission..."

aws lambda add-permission \
  --function-name $LAMBDA_FUNCTION_NAME \
  --statement-id apigateway-permission \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$(aws sts get-caller-identity --query Account --output text):$API_ID/*/*" \
  --region $REGION \
  2>/dev/null || echo "Permission already exists"

# 7. Deploy the API
echo "🚀 Deploying API to stage..."

aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name $STAGE_NAME \
  --region $REGION

# 8. Enable CORS
echo "🌍 Enabling CORS..."

# Enable CORS for all resources
aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $ROOT_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Headers":true,"method.response.header.Access-Control-Allow-Methods":true,"method.response.header.Access-Control-Allow-Origin":true}' \
  --region $REGION

aws apigateway put-integration-response \
  --rest-api-id $API_ID \
  --resource-id $ROOT_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'GET,POST,PUT,DELETE,OPTIONS'"'"'","method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
  --region $REGION

# 9. Clean up
rm -f function.zip

echo "✅ Deployment complete!"
echo "🌐 API Gateway URL: https://$API_ID.execute-api.$REGION.amazonaws.com/$STAGE_NAME"
echo "📋 API ID: $API_ID"
echo ""
echo "📝 Next steps:"
echo "1. Update your frontend BASE_URL to: https://$API_ID.execute-api.$REGION.amazonaws.com/$STAGE_NAME"
echo "2. Test the API endpoints"
echo "3. Set up API Gateway usage plans and throttling if needed" 