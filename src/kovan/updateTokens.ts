import { updateToken } from './updateToken';
import { APIGatewayProxyResult } from 'aws-lambda';
import { ChainId, getTokens } from '@ichidao/ichi-sdk';

export const updateTokens = async (tableName: string, chainId: ChainId) => {
  for (let token of getTokens(chainId)) {
    console.log(`Updating ${token.displayName}`);
    const res = await updateToken(tableName, token.tokenName, chainId);
    console.log(`\tDone updating ${token.displayName}`, res);
  }
};

export const updateTokensParallel = async (tableName: string, chainId: ChainId) => {
  const promises: Promise<APIGatewayProxyResult>[] = [];
  for (const token of getTokens(chainId)) {
    promises.push(updateToken(tableName, token.tokenName, chainId));
  }

  const results = await Promise.all(promises);
  console.log(results);
};
