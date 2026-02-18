import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { join } from 'path';

export class FamilyOlympicsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ============================================
    // DynamoDB Tables
    // ============================================

    // Olympics Table
    const olympicsTable = new dynamodb.Table(this, 'OlympicsTable', {
      tableName: 'FamilyOlympics-Olympics',
      partitionKey: { name: 'year', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Teams Table
    const teamsTable = new dynamodb.Table(this, 'TeamsTable', {
      tableName: 'FamilyOlympics-Teams',
      partitionKey: { name: 'year', type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: 'teamId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Events Table
    const eventsTable = new dynamodb.Table(this, 'EventsTable', {
      tableName: 'FamilyOlympics-Events',
      partitionKey: { name: 'year', type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Scores Table with GSI for querying by year
    const scoresTable = new dynamodb.Table(this, 'ScoresTable', {
      tableName: 'FamilyOlympics-Scores',
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'scoreId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Add GSI for querying scores by year
    scoresTable.addGlobalSecondaryIndex({
      indexName: 'YearIndex',
      partitionKey: { name: 'year', type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
    });

    // Media Table (photos/videos with GSIs for event and team)
    const mediaTable = new dynamodb.Table(this, 'MediaTable', {
      tableName: 'FamilyOlympics-Media',
      partitionKey: { name: 'year', type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: 'mediaId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    mediaTable.addGlobalSecondaryIndex({
      indexName: 'EventIndex',
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    mediaTable.addGlobalSecondaryIndex({
      indexName: 'TeamIndex',
      partitionKey: { name: 'teamId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    mediaTable.addGlobalSecondaryIndex({
      indexName: 'YearCreatedAtIndex',
      partitionKey: { name: 'year', type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // ============================================
    // S3 Media Bucket (private, presigned URLs only)
    // ============================================

    const mediaBucket = new s3.Bucket(this, 'MediaBucket', {
      bucketName: `family-olympics-media-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      cors: [
        {
          id: 'MediaBucketCors',
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: [
            'https://www.aureliansystems.io',
            'https://aureliansystems.io',
            'http://localhost:5173',
            'http://127.0.0.1:5173',
          ],
          allowedHeaders: ['*'],
        },
      ],
      lifecycleRules: [
        {
          id: 'AbortIncompleteMultipartUploads',
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },
      ],
    });

    // ============================================
    // Lambda Environment Variables
    // ============================================

    const lambdaEnvironment = {
      OLYMPICS_TABLE_NAME: olympicsTable.tableName,
      TEAMS_TABLE_NAME: teamsTable.tableName,
      EVENTS_TABLE_NAME: eventsTable.tableName,
      SCORES_TABLE_NAME: scoresTable.tableName,
      MEDIA_TABLE_NAME: mediaTable.tableName,
      MEDIA_BUCKET_NAME: mediaBucket.bucketName,
      CODE_VERSION: '1.0.3', // Force Lambda update
    };

    // ============================================
    // Lambda Functions
    // ============================================

    // Common bundling configuration - use esbuild locally (no Docker required)
    const bundlingConfig = {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      bundling: {
        minify: false, // Disable minification for easier debugging
        sourceMap: true,
        externalModules: ['@aws-sdk'], // Only AWS SDK is external
        forceDockerBundling: false,
        format: nodejs.OutputFormat.CJS,
      },
    };

    // Olympics handlers
    const getOlympicsHandler = new nodejs.NodejsFunction(this, 'GetOlympicsHandler', {
      entry: join(__dirname, 'lambda/olympics/get.ts'),
      environment: lambdaEnvironment,
      ...bundlingConfig,
    });

    const createOlympicsHandler = new nodejs.NodejsFunction(this, 'CreateOlympicsHandler', {
      entry: join(__dirname, 'lambda/olympics/create.ts'),
      environment: lambdaEnvironment,
      ...bundlingConfig,
    });

    const updateOlympicsHandler = new nodejs.NodejsFunction(this, 'UpdateOlympicsHandler', {
      entry: join(__dirname, 'lambda/olympics/update.ts'),
      environment: lambdaEnvironment,
      ...bundlingConfig,
    });

    const deleteOlympicsHandler = new nodejs.NodejsFunction(this, 'DeleteOlympicsHandler', {
      entry: join(__dirname, 'lambda/olympics/delete.ts'),
      environment: lambdaEnvironment,
      ...bundlingConfig,
    });

    // Teams handlers
    const listTeamsHandler = new nodejs.NodejsFunction(this, 'ListTeamsHandler', {
      entry: join(__dirname, 'lambda/teams/list.ts'),
      environment: lambdaEnvironment,
      ...bundlingConfig,
    });

    const getTeamHandler = new nodejs.NodejsFunction(this, 'GetTeamHandler', {
      entry: join(__dirname, 'lambda/teams/get.ts'),
      environment: lambdaEnvironment,
      ...bundlingConfig,
    });

    const createTeamHandler = new nodejs.NodejsFunction(this, 'CreateTeamHandler', {
      entry: join(__dirname, 'lambda/teams/create.ts'),
      environment: lambdaEnvironment,
      ...bundlingConfig,
    });

    const updateTeamHandler = new nodejs.NodejsFunction(this, 'UpdateTeamHandler', {
      entry: join(__dirname, 'lambda/teams/update.ts'),
      environment: lambdaEnvironment,
      ...bundlingConfig,
    });

    const deleteTeamHandler = new nodejs.NodejsFunction(this, 'DeleteTeamHandler', {
      entry: join(__dirname, 'lambda/teams/delete.ts'),
      environment: lambdaEnvironment,
      ...bundlingConfig,
    });

    // Events handlers
    const listEventsHandler = new nodejs.NodejsFunction(this, 'ListEventsHandler', {
      entry: join(__dirname, 'lambda/events/list.ts'),
      environment: lambdaEnvironment,
      ...bundlingConfig,
    });

    const getEventHandler = new nodejs.NodejsFunction(this, 'GetEventHandler', {
      entry: join(__dirname, 'lambda/events/get.ts'),
      environment: lambdaEnvironment,
      ...bundlingConfig,
    });

    const createEventHandler = new nodejs.NodejsFunction(this, 'CreateEventHandler', {
      entry: join(__dirname, 'lambda/events/create.ts'),
      environment: lambdaEnvironment,
      ...bundlingConfig,
    });

    const updateEventHandler = new nodejs.NodejsFunction(this, 'UpdateEventHandler', {
      entry: join(__dirname, 'lambda/events/update.ts'),
      environment: lambdaEnvironment,
      ...bundlingConfig,
    });

    const deleteEventHandler = new nodejs.NodejsFunction(this, 'DeleteEventHandler', {
      entry: join(__dirname, 'lambda/events/delete.ts'),
      environment: lambdaEnvironment,
      ...bundlingConfig,
    });

    // Scores handlers
    const listScoresHandler = new nodejs.NodejsFunction(this, 'ListScoresHandler', {
      entry: join(__dirname, 'lambda/scores/list.ts'),
      environment: lambdaEnvironment,
      ...bundlingConfig,
    });

    const listScoresByEventHandler = new nodejs.NodejsFunction(this, 'ListScoresByEventHandler', {
      entry: join(__dirname, 'lambda/scores/listByEvent.ts'),
      environment: lambdaEnvironment,
      ...bundlingConfig,
    });

    const submitPlacementHandler = new nodejs.NodejsFunction(this, 'SubmitPlacementHandler', {
      entry: join(__dirname, 'lambda/scores/placement.ts'),
      environment: lambdaEnvironment,
      ...bundlingConfig,
    });

    const submitJudgeScoreHandler = new nodejs.NodejsFunction(this, 'SubmitJudgeScoreHandler', {
      entry: join(__dirname, 'lambda/scores/judge.ts'),
      environment: lambdaEnvironment,
      ...bundlingConfig,
    });

    const deleteScoreHandler = new nodejs.NodejsFunction(this, 'DeleteScoreHandler', {
      entry: join(__dirname, 'lambda/scores/delete.ts'),
      environment: lambdaEnvironment,
      ...bundlingConfig,
    });

    // Media handlers
    const requestUploadUrlHandler = new nodejs.NodejsFunction(this, 'RequestUploadUrlHandler', {
      entry: join(__dirname, 'lambda/media/requestUploadUrl.ts'),
      environment: lambdaEnvironment,
      ...bundlingConfig,
    });

    const listMediaHandler = new nodejs.NodejsFunction(this, 'ListMediaHandler', {
      entry: join(__dirname, 'lambda/media/list.ts'),
      environment: lambdaEnvironment,
      ...bundlingConfig,
    });

    const getMediaHandler = new nodejs.NodejsFunction(this, 'GetMediaHandler', {
      entry: join(__dirname, 'lambda/media/get.ts'),
      environment: lambdaEnvironment,
      ...bundlingConfig,
    });

    const deleteMediaHandler = new nodejs.NodejsFunction(this, 'DeleteMediaHandler', {
      entry: join(__dirname, 'lambda/media/delete.ts'),
      environment: lambdaEnvironment,
      ...bundlingConfig,
    });

    const updateMediaHandler = new nodejs.NodejsFunction(this, 'UpdateMediaHandler', {
      entry: join(__dirname, 'lambda/media/update.ts'),
      environment: lambdaEnvironment,
      ...bundlingConfig,
    });

    const validateGalleryPasswordHandler = new nodejs.NodejsFunction(
      this,
      'ValidateGalleryPasswordHandler',
      {
        entry: join(__dirname, 'lambda/gallery/validate.ts'),
        environment: lambdaEnvironment,
        ...bundlingConfig,
      }
    );

    const processMediaHandler = new nodejs.NodejsFunction(this, 'ProcessMediaHandler', {
      entry: join(__dirname, 'lambda/media/process.ts'),
      environment: lambdaEnvironment,
      ...bundlingConfig,
    });

    // ============================================
    // Grant DynamoDB Permissions
    // ============================================

    // Olympics
    olympicsTable.grantReadData(getOlympicsHandler);
    olympicsTable.grantReadWriteData(createOlympicsHandler); // Needs read to check if exists
    olympicsTable.grantReadWriteData(updateOlympicsHandler); // Needs read to check if exists
    olympicsTable.grantReadWriteData(deleteOlympicsHandler); // Needs read to check if exists

    // Teams
    teamsTable.grantReadData(listTeamsHandler);
    teamsTable.grantReadData(getTeamHandler);
    teamsTable.grantReadWriteData(createTeamHandler); // May need to check if exists
    teamsTable.grantReadWriteData(updateTeamHandler); // Needs read to check if exists
    teamsTable.grantReadWriteData(deleteTeamHandler); // Needs read to check if exists

    // Events
    eventsTable.grantReadData(listEventsHandler);
    eventsTable.grantReadData(getEventHandler);
    eventsTable.grantReadWriteData(createEventHandler); // May need to check if exists
    eventsTable.grantReadWriteData(updateEventHandler); // Needs read to check if exists
    eventsTable.grantReadWriteData(deleteEventHandler); // Needs read to check if exists

    // Scores
    scoresTable.grantReadData(listScoresHandler);
    scoresTable.grantReadData(listScoresByEventHandler);
    scoresTable.grantReadWriteData(submitPlacementHandler); // May need to read existing
    scoresTable.grantReadWriteData(submitJudgeScoreHandler); // May need to read existing
    scoresTable.grantReadWriteData(deleteScoreHandler); // Needs read to check if exists

    // Cross-table: SubmitJudgeScoreHandler reads Events to validate event exists and not completed
    eventsTable.grantReadData(submitJudgeScoreHandler);

    // Gallery password validation
    olympicsTable.grantReadData(validateGalleryPasswordHandler);

    // Media: DynamoDB and S3 (media handlers also need Olympics read for gallery token verification)
    olympicsTable.grantReadData(requestUploadUrlHandler);
    olympicsTable.grantReadData(listMediaHandler);
    olympicsTable.grantReadData(getMediaHandler);
    olympicsTable.grantReadData(deleteMediaHandler);
    olympicsTable.grantReadData(updateMediaHandler);

    mediaTable.grantReadData(listMediaHandler);
    mediaTable.grantReadData(getMediaHandler);
    mediaTable.grantReadWriteData(deleteMediaHandler);
    mediaTable.grantReadWriteData(updateMediaHandler);
    mediaTable.grantReadWriteData(processMediaHandler);

    mediaBucket.grantPut(requestUploadUrlHandler);
    mediaBucket.grantRead(processMediaHandler);
    mediaBucket.grantWrite(processMediaHandler);
    mediaBucket.grantRead(listMediaHandler);
    mediaBucket.grantRead(getMediaHandler);
    mediaBucket.grantRead(updateMediaHandler);
    mediaBucket.grantReadWrite(deleteMediaHandler);

    mediaBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(processMediaHandler)
    );

    // ============================================
    // API Gateway
    // ============================================

    const api = new apigateway.RestApi(this, 'FamilyOlympicsApi', {
      restApiName: 'Family Olympics API',
      description: 'API for Family Olympics website',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Admin-Token', 'X-Gallery-Token'],
      },
    });

    // Olympics routes
    const olympics = api.root.addResource('olympics');
    olympics.addMethod('GET', new apigateway.LambdaIntegration(getOlympicsHandler));
    olympics.addMethod('POST', new apigateway.LambdaIntegration(createOlympicsHandler));

    const olympicsCurrent = olympics.addResource('current');
    olympicsCurrent.addMethod('GET', new apigateway.LambdaIntegration(getOlympicsHandler));

    const olympicsYear = olympics.addResource('{year}');
    olympicsYear.addMethod('GET', new apigateway.LambdaIntegration(getOlympicsHandler));
    olympicsYear.addMethod('PUT', new apigateway.LambdaIntegration(updateOlympicsHandler));
    olympicsYear.addMethod('DELETE', new apigateway.LambdaIntegration(deleteOlympicsHandler));

    // Gallery password validation
    const olympicsYearGallery = olympicsYear.addResource('gallery');
    const galleryValidate = olympicsYearGallery.addResource('validate');
    galleryValidate.addMethod('POST', new apigateway.LambdaIntegration(validateGalleryPasswordHandler));

    // Teams routes
    const olympicsYearTeams = olympicsYear.addResource('teams');
    olympicsYearTeams.addMethod('GET', new apigateway.LambdaIntegration(listTeamsHandler));
    olympicsYearTeams.addMethod('POST', new apigateway.LambdaIntegration(createTeamHandler));

    const team = olympicsYearTeams.addResource('{teamId}');
    team.addMethod('GET', new apigateway.LambdaIntegration(getTeamHandler));
    team.addMethod('PUT', new apigateway.LambdaIntegration(updateTeamHandler));
    team.addMethod('DELETE', new apigateway.LambdaIntegration(deleteTeamHandler));

    // Events routes
    const olympicsYearEvents = olympicsYear.addResource('events');
    olympicsYearEvents.addMethod('GET', new apigateway.LambdaIntegration(listEventsHandler));
    olympicsYearEvents.addMethod('POST', new apigateway.LambdaIntegration(createEventHandler));

    const event = olympicsYearEvents.addResource('{eventId}');
    event.addMethod('GET', new apigateway.LambdaIntegration(getEventHandler));
    event.addMethod('PUT', new apigateway.LambdaIntegration(updateEventHandler));
    event.addMethod('DELETE', new apigateway.LambdaIntegration(deleteEventHandler));

    // Scores routes
    const olympicsYearScores = olympicsYear.addResource('scores');
    olympicsYearScores.addMethod('GET', new apigateway.LambdaIntegration(listScoresHandler));

    const eventScores = event.addResource('scores');
    eventScores.addMethod('GET', new apigateway.LambdaIntegration(listScoresByEventHandler));

    const placementScores = eventScores.addResource('placement');
    placementScores.addMethod('POST', new apigateway.LambdaIntegration(submitPlacementHandler));

    const judgeScores = eventScores.addResource('judge');
    judgeScores.addMethod('POST', new apigateway.LambdaIntegration(submitJudgeScoreHandler));
    judgeScores.addMethod('PUT', new apigateway.LambdaIntegration(submitJudgeScoreHandler));

    const score = eventScores.addResource('{scoreId}');
    score.addMethod('DELETE', new apigateway.LambdaIntegration(deleteScoreHandler));

    // Media routes
    const olympicsYearMedia = olympicsYear.addResource('media');
    const mediaUploadUrl = olympicsYearMedia.addResource('upload-url');
    mediaUploadUrl.addMethod('POST', new apigateway.LambdaIntegration(requestUploadUrlHandler));
    olympicsYearMedia.addMethod('GET', new apigateway.LambdaIntegration(listMediaHandler));

    const mediaItem = olympicsYearMedia.addResource('{mediaId}');
    mediaItem.addMethod('GET', new apigateway.LambdaIntegration(getMediaHandler));
    mediaItem.addMethod('PATCH', new apigateway.LambdaIntegration(updateMediaHandler));
    mediaItem.addMethod('DELETE', new apigateway.LambdaIntegration(deleteMediaHandler));

    // ============================================
    // S3 Bucket for Frontend Hosting
    // ============================================

    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `family-olympics-website-${this.account}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // SPA routing
      publicReadAccess: false, // CloudFront will access via OAI
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });

    // ============================================
    // CloudFront Distribution
    // ============================================

    // Origin Access Identity for S3
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: 'OAI for Family Olympics website',
    });

    websiteBucket.grantRead(originAccessIdentity);

    // Custom response headers policy for SEO prevention
    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeadersPolicy', {
      responseHeadersPolicyName: 'FamilyOlympicsSecurityHeaders',
      comment: 'Security headers including X-Robots-Tag',
      customHeadersBehavior: {
        customHeaders: [
          {
            header: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet',
            override: true,
          },
        ],
      },
      securityHeadersBehavior: {
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
        referrerPolicy: { referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN, override: true },
        strictTransportSecurity: {
          accessControlMaxAge: cdk.Duration.seconds(31536000),
          includeSubdomains: true,
          override: true,
        },
        xssProtection: { protection: true, modeBlock: true, override: true },
      },
    });

    const distribution = new cloudfront.Distribution(this, 'WebsiteDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessIdentity(websiteBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        responseHeadersPolicy,
      },
      defaultRootObject: 'family-olympics/index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/family-olympics/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/family-olympics/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Use only North America and Europe
      comment: 'Family Olympics Website Distribution',
    });

    // Deploy website files to S3 with family-olympics prefix
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(join(__dirname, '../ui/dist'))],
      destinationBucket: websiteBucket,
      destinationKeyPrefix: 'family-olympics/',
      distribution,
      distributionPaths: ['/*'],
    });

    // ============================================
    // Outputs
    // ============================================

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront Website URL',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront Distribution ID',
    });

    new cdk.CfnOutput(this, 'WebsiteBucketName', {
      value: websiteBucket.bucketName,
      description: 'S3 Website Bucket Name',
    });
  }
}
