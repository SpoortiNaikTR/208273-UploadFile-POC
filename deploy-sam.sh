#!/bin/bash

echo "🚀 Deploying REST API using AWS SAM..."

# Build the SAM application
echo "📦 Building SAM application..."
sam build

# Deploy the application
echo "🚀 Deploying to AWS..."
sam deploy --guided

echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update your frontend BASE_URL with the API Gateway URL from the output above"
echo "2. Test the API endpoints"
echo "3. Set up API Gateway usage plans and throttling if needed" 