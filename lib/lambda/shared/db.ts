import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Create DynamoDB client
const client = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(client);

// Table names from environment variables
export const OLYMPICS_TABLE = process.env.OLYMPICS_TABLE_NAME!;
export const TEAMS_TABLE = process.env.TEAMS_TABLE_NAME!;
export const EVENTS_TABLE = process.env.EVENTS_TABLE_NAME!;
export const SCORES_TABLE = process.env.SCORES_TABLE_NAME!;

