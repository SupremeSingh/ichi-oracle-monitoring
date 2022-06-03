import { updateToken } from './updateToken';
import { TOKENS } from './configMumbai';
import { APIGatewayProxyResult } from 'aws-lambda';

export const updateTokens = async (tableName: string) => {
  const promises: Promise<APIGatewayProxyResult>[] = [];
  for (const token in TOKENS) {
    promises.push(updateToken(tableName, token));
  }

  const results = await Promise.all(promises);
  console.log(`Finished updating tokens`, results);
};
