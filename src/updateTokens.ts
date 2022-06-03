import { updateToken } from './updateToken';
import { TOKENS } from './configMainnet';
import { APIGatewayProxyResult } from 'aws-lambda';

export const updateTokens = async (tableName: string) => {
  for (let token in TOKENS) {
    const res = await updateToken(tableName, token);
    console.log(`update ${token} results`, res);
  }
};

// Parallelized but may cause throttling issues
export const updateTokensParallel = async (tableName: string) => {
  const promises: Promise<APIGatewayProxyResult>[] = [];
  for (const token in TOKENS) {
    promises.push(updateToken(tableName, token));
  }
  const results = await Promise.all(promises);
  console.log(`Finished updating tokens`, results);
};
