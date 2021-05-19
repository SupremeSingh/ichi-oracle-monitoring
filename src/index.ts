import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { updateTokens } from './updateTokens';
import { updateTreasury } from './updateTreasury';
import { updateFarms } from './updateFarms';

const token_tableName = process.env.TABLE_NAME || 'token-dev';
const treasury_tableName = process.env.TABLE_NAME || 'treasury-dev';
const farms_tableName = process.env.TABLE_NAME || 'farms-dev';

export const handler = async (event: APIGatewayProxyEvent) => {
  await updateTokens(token_tableName);
  await updateTreasury(treasury_tableName);
  await updateFarms(farms_tableName);
};
