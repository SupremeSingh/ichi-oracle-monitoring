import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { updateToken } from './updateToken';
import { updateTreasury } from './updateTreasury';

const token_tableName = process.env.TABLE_NAME || 'token-dev';
const treasury_tableName = process.env.TABLE_NAME || 'treasury-dev';

export const handler = async (event: APIGatewayProxyEvent) => {
  const tokenName = (event && event.pathParameters && event.pathParameters.tokenName) || 'ichi';
  await updateToken(token_tableName, tokenName);

  await updateTreasury(treasury_tableName);
};
