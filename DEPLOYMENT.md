# Family Olympics - Deployment Guide

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured with credentials
3. **Node.js** 20.x or later
4. **npm** installed

## Initial Setup

### 1. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd ui
npm install
cd ..
```

### 2. Build the Backend

```bash
npm run build
```

### 3. Build the Frontend

```bash
cd ui
npm run build
cd ..
```

This creates a production build in `ui/dist/`.

## Deployment Steps

### Step 1: Deploy the CDK Stack

The CDK stack includes:
- DynamoDB tables (Olympics, Teams, Events, Scores)
- Lambda functions for all API endpoints
- API Gateway REST API
- S3 bucket for website hosting
- CloudFront distribution with security headers

```bash
# Bootstrap CDK (first time only)
npx cdk bootstrap

# Deploy the stack
npx cdk deploy
```

**Important:** Save the outputs from the deployment:
- `ApiUrl` - Your API Gateway endpoint
- `WebsiteUrl` - Your CloudFront distribution URL
- `DistributionId` - CloudFront distribution ID (for cache invalidation)
- `WebsiteBucket` - S3 bucket name

### Step 2: Configure Frontend API URL

Create a `.env` file in the `ui/` directory:

```bash
cd ui
cp .env.example .env
```

Edit `.env` and set your API URL:

```
VITE_API_BASE_URL=https://your-api-id.execute-api.region.amazonaws.com/prod
```

### Step 3: Rebuild and Redeploy Frontend

After setting the API URL, rebuild the frontend:

```bash
# From the ui directory
npm run build
cd ..

# Redeploy the stack to update the website
npx cdk deploy
```

## Updating the Application

### Backend Updates

If you've made changes to Lambda functions or infrastructure:

```bash
npm run build
npx cdk deploy
```

### Frontend Updates

If you've made changes to the UI:

```bash
cd ui
npm run build
cd ..
npx cdk deploy
```

The CDK will automatically:
1. Upload new files to S3
2. Invalidate CloudFront cache
3. Deploy the updated website

### Manual Cache Invalidation

If needed, you can manually invalidate CloudFront cache:

```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

## Initial Data Setup

After deployment, you'll need to set up initial data through the admin interface:

1. Navigate to `https://your-cloudfront-url.cloudfront.net/admin`
2. Create a new Olympics year
3. Add teams
4. Add events
5. Configure placement points

## Environment Variables

### Backend (Lambda)

Set via CDK in `lib/family-olympics-stack.ts`:
- `OLYMPICS_TABLE_NAME`
- `TEAMS_TABLE_NAME`
- `EVENTS_TABLE_NAME`
- `SCORES_TABLE_NAME`

### Frontend (Vite)

Set in `ui/.env`:
- `VITE_API_BASE_URL` - API Gateway URL

## Security Features

### SEO Prevention

The application includes multiple layers of SEO prevention:

1. **robots.txt** - Disallows all crawlers
2. **Meta tags** - `noindex, nofollow, noarchive, nosnippet`
3. **X-Robots-Tag header** - Set via CloudFront response headers policy
4. **CloudFront security headers** - HSTS, XSS protection, frame options

### HTTPS

CloudFront automatically provides HTTPS with AWS-managed certificates.

## Monitoring

### CloudWatch Logs

Lambda function logs are available in CloudWatch:
- Log group: `/aws/lambda/FamilyOlympicsStack-*`

### API Gateway Logs

API Gateway access logs can be enabled in the AWS Console.

### CloudFront Metrics

View CloudFront metrics in the AWS Console:
- Requests
- Bytes downloaded
- Error rates

## Troubleshooting

### Frontend shows "Failed to load"

1. Check that the API URL in `.env` is correct
2. Verify CORS is enabled in API Gateway
3. Check Lambda function logs for errors

### CloudFront shows 403 errors

1. Verify S3 bucket policy allows CloudFront OAI
2. Check that files were deployed to S3
3. Wait a few minutes for CloudFront to propagate

### Lambda function errors

1. Check CloudWatch logs
2. Verify DynamoDB table permissions
3. Check environment variables are set correctly

## Cost Optimization

### DynamoDB

- Uses on-demand billing mode
- No charges when not in use
- Scales automatically

### Lambda

- Pay per request
- 1M free requests per month
- Minimal cost for hobby project

### CloudFront

- Pay per request and data transfer
- First 1 TB/month is free tier eligible
- Use PriceClass 100 (North America/Europe only)

### S3

- Minimal storage costs
- No data transfer charges to CloudFront

## Cleanup

To delete all resources:

```bash
npx cdk destroy
```

**Warning:** This will delete all data. DynamoDB tables are set to RETAIN by default, so you'll need to manually delete them from the AWS Console if desired.

## Backup

### DynamoDB Backup

Enable point-in-time recovery in the AWS Console for production use.

### Manual Export

Use AWS CLI to export DynamoDB data:

```bash
aws dynamodb scan --table-name FamilyOlympics-Olympics > olympics-backup.json
aws dynamodb scan --table-name FamilyOlympics-Teams > teams-backup.json
aws dynamodb scan --table-name FamilyOlympics-Events > events-backup.json
aws dynamodb scan --table-name FamilyOlympics-Scores > scores-backup.json
```

## Support

For issues or questions, refer to:
- AWS CDK Documentation: https://docs.aws.amazon.com/cdk/
- AWS Lambda Documentation: https://docs.aws.amazon.com/lambda/
- AWS CloudFront Documentation: https://docs.aws.amazon.com/cloudfront/

