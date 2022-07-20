import { ChainId, getTokens } from '@ichidao/ichi-sdk';
import { updateToken } from './updateToken';

export const updateTokens = async (tableName: string, chainId: ChainId) => {
  for (let token of getTokens(chainId)) {
    const res = await updateToken(tableName, token.tokenName, chainId);
    console.log(`update ${token} results:`, res);
  }
};

// Parallelized but may cause throttling issues
// export const updateTokens = async (tableName: string) => {
//   const promises: Promise<APIGatewayProxyResult>[] = [];
//   for (const token in TOKENS) {
//     promises.push(updateToken(tableName, token));
//   }
//   const results = await Promise.all(promises);
//   console.log(`Finished updating all tokens`, results);
// };
