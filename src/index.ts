import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { updateToken } from './updateToken';

const tableName = process.env.TABLE_NAME || 'token-dev';

// eslint-disable-next-line arrow-body-style
export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const tokenName = (event && event.pathParameters && event.pathParameters.tokenName) || 'ichi';
  return updateToken(tableName, tokenName);
};
