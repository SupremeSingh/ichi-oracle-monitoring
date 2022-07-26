import { ChainId, PartialRecord, TokenName } from '@ichidao/ichi-sdk';
import { getDynamoTokens } from '../dynamo';

export async function getTokenPrices(
  tokenTableName: string,
  chainId: ChainId
): Promise<PartialRecord<TokenName, number>> {
  const tokenPrices: PartialRecord<TokenName, number> = {};
  try {
    const results = await getDynamoTokens(tokenTableName, chainId);
    for (const item of results) {
      const tokenName = item['tokenName']['S'];
      tokenPrices[tokenName] = Number(item['price']['N']);
    }
  } catch (error) {
    throw new Error(`Error in dynamoDB: ${JSON.stringify(error)}`);
  }
  return tokenPrices;
}
