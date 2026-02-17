import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, OLYMPICS_TABLE } from '../shared/db';
import { successResponse, errorResponse, ErrorCodes } from '../shared/response';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const { year } = event.pathParameters || {};
    const path = event.path;

    // GET /olympics/current - Get current year's configuration
    if (path.includes('/current')) {
      const result = await docClient.send(
        new ScanCommand({
          TableName: OLYMPICS_TABLE,
          FilterExpression: 'currentYear = :true',
          ExpressionAttributeValues: {
            ':true': true,
          },
        })
      );

      if (!result.Items || result.Items.length === 0) {
        return errorResponse(
          ErrorCodes.NOT_FOUND.code,
          'No current year configured',
          ErrorCodes.NOT_FOUND.status
        );
      }

      const item = result.Items[0] as Record<string, unknown>;
      const { galleryTokenSecret, galleryPasswordHash, ...rest } = item;
      return successResponse({ ...rest, hasGalleryPassword: !!galleryPasswordHash });
    }

    // GET /olympics/:year - Get specific year
    if (year) {
      const result = await docClient.send(
        new GetCommand({
          TableName: OLYMPICS_TABLE,
          Key: { year: parseInt(year) },
        })
      );

      if (!result.Item) {
        return errorResponse(
          ErrorCodes.NOT_FOUND.code,
          `Olympics year ${year} not found`,
          ErrorCodes.NOT_FOUND.status
        );
      }

      const item = result.Item as Record<string, unknown>;
      const { galleryTokenSecret, galleryPasswordHash, ...rest } = item;
      return successResponse({ ...rest, hasGalleryPassword: !!galleryPasswordHash });
    }

    // GET /olympics - List all years
    const result = await docClient.send(
      new ScanCommand({
        TableName: OLYMPICS_TABLE,
      })
    );

    const years = (result.Items || []).map((item) => ({
      year: item.year,
      currentYear: item.currentYear || false,
    }));

    return successResponse({ years });
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR.code,
      'Internal server error',
      ErrorCodes.INTERNAL_ERROR.status
    );
  }
}

