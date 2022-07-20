import { updateTreasuryItem } from './updateTreasuryItem';
import { APIGatewayProxyResult } from 'aws-lambda';
import { ChainId, PartialRecord, TokenName } from '@ichidao/ichi-sdk';

export const updateTreasury = async (
  tableName: string,
  tokenPrices: PartialRecord<TokenName, number>,
  chainId: ChainId
) => {
  let tokenNames = [TokenName.OTI, TokenName.ONE_UNI, TokenName.ONE_FIL];

  const promises: Promise<APIGatewayProxyResult>[] = [];
  for (let tokenName of tokenNames) {
    promises.push(updateTreasuryItem(tableName, tokenName, tokenPrices, chainId));
  }

  const results = await Promise.all(promises);
  console.log(results);
};
