# Family Olympics

A full-stack web application for managing and tracking family Olympic competitions. Built with React, AWS Lambda, DynamoDB, and deployed via AWS CDK.

## 📖 Overview

Family Olympics is a serverless web application that helps families organize and track their own Olympic-style competitions. The app supports multiple teams, various event types (placement-based and judged), real-time scoring, and comprehensive leaderboards.

**Key Features:**
- 🏆 Track multiple teams with custom colors and members
- 📅 Schedule and manage events throughout the year
- 🎯 Support for both placement-based and judge-scored events
- 📊 Real-time leaderboards and scoring
- 📷 **Media gallery** – upload photos and videos, filter by event/team, lightbox viewer
- 👨‍⚖️ Judge interface for entering scores on mobile devices
- 🎨 Modern, responsive UI built with React and Tailwind CSS
- ☁️ Fully serverless architecture on AWS

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20.x or later
- **AWS CLI** configured with credentials
- **AWS CDK** (installed via npm)

### Installation & Deployment

```bash
# 1. Install dependencies
npm install
cd ui && npm install && cd ..

# 2. Bootstrap CDK (first time only)
npx cdk bootstrap

# 3. Build and deploy
npm run deploy
```

After deployment, note the `ApiUrl` and `WebsiteUrl` from the CDK outputs.

### Configuration

```bash
# Configure the frontend with your API URL
cd ui
echo "VITE_API_BASE_URL=<your-api-url>" > .env

# Rebuild and redeploy
npm run build
cd ..
npx cdk deploy
```

Access your application at the `WebsiteUrl` shown in the deployment outputs!

📚 **For detailed setup instructions, see [QUICK_START.md](./QUICK_START.md)**

## 🏗️ Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling
- **Testing Library** - Component testing

### Backend
- **AWS Lambda** - Serverless compute
- **API Gateway** - REST API
- **DynamoDB** - NoSQL database
- **AWS CDK** - Infrastructure as Code
- **TypeScript** - Lambda function code
- **Jest** - Unit testing

### Infrastructure
- **CloudFront** - CDN for static assets
- **S3** - Static website hosting
- **AWS CDK** - Deployment automation

## 📁 Project Structure

```
family-olympics/
├── bin/                          # CDK app entry point
├── lib/                          # CDK infrastructure code
│   ├── family-olympics-stack.ts  # Main CDK stack definition
│   ├── lambda-layers/sharp/      # Sharp layer for image processing (see README there)
│   └── lambda/                   # Lambda function handlers
│       ├── olympics/             # Olympics configuration endpoints
│       ├── teams/                # Team management endpoints
│       ├── events/               # Event management endpoints
│       ├── scores/               # Score tracking endpoints
│       ├── media/                # Media upload, list, get, delete, process
│       └── shared/               # Shared utilities (DB, responses)
├── test/                         # Backend unit tests
│   └── lambda/                   # Lambda function tests (including media/)
├── ui/                           # React frontend application
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   ├── pages/                # Page components
│   │   │   ├── admin/            # Admin pages (Olympics, Teams, Events, Scores, Media)
│   │   │   ├── Home.tsx          # Public leaderboard
│   │   │   ├── Schedule.tsx      # Event schedule
│   │   │   ├── Gallery.tsx       # Media gallery (filter, lightbox, upload)
│   │   │   ├── EventDetail.tsx   # Individual event details
│   │   │   └── Judge*.tsx        # Judge scoring interface
│   │   ├── contexts/             # React contexts (Judge state)
│   │   ├── hooks/                # Custom React hooks
│   │   ├── layouts/              # Layout components
│   │   └── lib/                  # API client and utilities
│   └── dist/                     # Built frontend (deployed to S3)
├── agent/                        # Project documentation
│   ├── API_SPEC.md               # API endpoint documentation
│   ├── DATA_MODELS.md            # Database schema
│   └── UI_SPEC.md                # UI component specifications
└── cdk.out/                      # CDK synthesis output
```

## 🛠️ Development

### Running Tests

```bash
# Backend tests
npm test

# Frontend tests
cd ui
npm test

# Watch mode
npm run test:watch
```

### Local Development

```bash
# Run frontend dev server
cd ui
npm run dev
# Opens at http://localhost:5173
```

**Note:** The frontend will connect to your deployed AWS backend. There is no local backend development mode.

### Making Changes

#### Frontend Changes
```bash
cd ui
# Make your changes to src/ files
npm run build
cd ..
npx cdk deploy
```

#### Backend Changes
```bash
# Make your changes to lib/lambda/ files
npm run build
npx cdk deploy
```

#### Infrastructure Changes
```bash
# Edit lib/family-olympics-stack.ts
npm run build
npx cdk deploy
```

## 📊 Database Schema

The application uses five DynamoDB tables:

- **Olympics** - Configuration for each year (placement points, active year)
- **Teams** - Team information (name, color, members)
- **Events** - Event details (name, date, scoring type)
- **Scores** - Individual scores (placement or judge scores)
- **Media** - Media metadata (year, mediaId, type, status, S3 keys, tags, optional eventId/teamId)

See [agent/DATA_MODELS.md](./agent/DATA_MODELS.md) for detailed schema documentation.

## 🔌 API Endpoints

The REST API provides endpoints for:

- **Olympics**: GET, POST, PUT, DELETE `/olympics/*`
- **Teams**: GET, POST, PUT, DELETE `/teams/*`
- **Events**: GET, POST, PUT, DELETE `/events/*`
- **Scores**: GET, POST, DELETE `/scores/*`
- **Media**: POST `/olympics/{year}/media/upload-url`, GET/DELETE `/olympics/{year}/media/*` (presigned URLs for upload/view)

See [agent/API_SPEC.md](./agent/API_SPEC.md) for complete API documentation.

## 📱 Application Features

### Public Pages
- **Home** - Real-time leaderboard showing team standings
- **Schedule** - Upcoming and past events
- **Gallery** - Photos and videos; filter by event/team/person; lightbox and video player; upload from event/team pages or gallery
- **Event Detail** - Detailed results for each event; link to event gallery and upload
- **Team Detail** - Team roster; link to team gallery and upload

### Judge Interface
- **Judge Login** - Enter judge name
- **Event Selection** - Choose event to score
- **Score Entry** - Enter scores for teams (placement or numeric)

### Admin Pages
- **Olympics Config** - Set up year and placement points
- **Teams** - Manage teams, colors, and members
- **Events** - Create and manage events
- **Scores** - View and manage all scores
- **Media** - View all media for the year, filter by status, delete items

## 🧹 Cleanup

To remove all AWS resources:

```bash
npx cdk destroy
```

**Note:** DynamoDB tables are retained by default to prevent accidental data loss. Delete them manually from the AWS Console if needed.

## 📚 Additional Documentation

- [QUICK_START.md](./QUICK_START.md) - Fast deployment guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment instructions
- [agent/API_SPEC.md](./agent/API_SPEC.md) - Complete API reference
- [agent/DATA_MODELS.md](./agent/DATA_MODELS.md) - Database schema
- [agent/UI_SPEC.md](./agent/UI_SPEC.md) - UI component specifications

## 📝 License

This project is for personal/family use.

## 🤝 Contributing

This is a personal project, but feel free to fork and adapt for your own family Olympics!
