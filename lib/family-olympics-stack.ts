import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
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

    // ============================================
    // Lambda Environment Variables
    // ============================================

    const lambdaEnvironment = {
      OLYMPICS_TABLE_NAME: olympicsTable.tableName,
      TEAMS_TABLE_NAME: teamsTable.tableName,
      EVENTS_TABLE_NAME: eventsTable.tableName,
      SCORES_TABLE_NAME: scoresTable.tableName,
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

    // ============================================
    // API Gateway
    // ============================================

    const api = new apigateway.RestApi(this, 'FamilyOlympicsApi', {
      restApiName: 'Family Olympics API',
      description: 'API for Family Olympics website',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Admin-Token'],
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

    // ============================================
    // Outputs
    // ============================================

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });
  }
}
