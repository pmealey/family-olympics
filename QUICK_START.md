# Family Olympics - Quick Start Guide

## 🚀 Deploy in 5 Minutes

### 1. Prerequisites Check

```bash
# Check Node.js version (need 20.x or later)
node --version

# Check AWS CLI is configured
aws sts get-caller-identity
```

### 2. Install & Build

```bash
# Install all dependencies
npm install
cd ui && npm install && cd ..

# Build everything
npm run build
cd ui && npm run build && cd ..
```

### 3. Deploy to AWS

```bash
# First time only: Bootstrap CDK
npx cdk bootstrap

# Deploy the stack
npx cdk deploy
```

**Save the outputs!** You'll need:
- `ApiUrl` - Copy this for the next step
- `WebsiteUrl` - This is your website URL

### 4. Configure Frontend

```bash
cd ui
echo "VITE_API_BASE_URL=YOUR_API_URL_HERE" > .env
# Replace YOUR_API_URL_HERE with the ApiUrl from step 3
```

### 5. Rebuild & Redeploy

```bash
npm run build
cd ..
npx cdk deploy
```

### 6. Access Your Site

Open the `WebsiteUrl` from step 3 in your browser!

## 📝 First-Time Setup

1. Go to `/admin` on your website
2. Create Olympics year (e.g., 2025)
3. Set placement points (e.g., 1st=4, 2nd=3, 3rd=2, 4th=1)
4. Add teams with names, colors, and members
5. Add events with scoring types

## 🔄 Making Updates

### Update Frontend

```bash
cd ui
# Make your changes...
npm run build
cd ..
npx cdk deploy
```

### Update Backend

```bash
# Make your changes to Lambda functions...
npm run build
npx cdk deploy
```

## 🧪 Testing Locally

### Backend Tests

```bash
npm test
```

### Frontend Tests

```bash
cd ui
npm test
```

### Run Frontend Locally

```bash
cd ui
npm run dev
# Opens at http://localhost:5173
```

## 🗑️ Cleanup

To delete everything:

```bash
npx cdk destroy
```

## 📚 Need More Help?

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

