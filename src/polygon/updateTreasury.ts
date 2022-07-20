import { ChainId, PartialRecord, TokenName } from '@ichidao/ichi-sdk';
import { APIGatewayProxyResult } from 'aws-lambda';
import { updateTreasuryItem } from './updateTreasuryItem';

export const updateTreasury = async (
  tableName: string,
  tokenPrices: PartialRecord<TokenName, number>,
  chainId: ChainId
): Promise<void> => {
  const tokenNames = [TokenName.ONE_BTC];

  const promises: Promise<APIGatewayProxyResult>[] = [];
  for (let tokenName of tokenNames) {
    promises.push(updateTreasuryItem(tableName, tokenName, tokenPrices, chainId));
  }

  await Promise.all(promises);
};
