import { ChainId, PartialRecord, TokenName } from '@ichidao/ichi-sdk';
import { getDynamoTokens } from '../dynamo';

export async function getTokenNames(
  tokenTableName: string,
  chainId: ChainId
): Promise<PartialRecord<TokenName, string>> {
  const tokenNames: PartialRecord<TokenName, string> = {
    [TokenName.ETH]: 'ETH'
  };
  try {
    const results = await getDynamoTokens(tokenTableName, chainId);
    for (const item of results) {
      const tokenName = item['tokenName']['S'];
      tokenNames[tokenName] = item['displayName']['S'];
    }
  } catch (error) {
    throw new Error(`Error in dynamoDB: ${JSON.stringify(error)}`);
  }
  return tokenNames;
}
