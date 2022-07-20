import { APIGatewayProxyResult } from 'aws-lambda';
import { updateTreasuryItem } from './updateTreasuryItem';
import { ChainId, getTreasuries, PartialRecord, TokenName } from '@ichidao/ichi-sdk';

export const updateTreasury = async (
  tableName: string,
  tokenPrices: PartialRecord<TokenName, number>,
  tokenNames: PartialRecord<TokenName, string>,
  chainId: ChainId
): Promise<void> => {
  const promises: Promise<APIGatewayProxyResult>[] = [];
  for (const treasury of getTreasuries(chainId)) {
    promises.push(updateTreasuryItem(tableName, treasury, tokenPrices, tokenNames, chainId));
  }

  const results = await Promise.all(promises);
  console.log(`Finished updating treasuries`, results);
};
