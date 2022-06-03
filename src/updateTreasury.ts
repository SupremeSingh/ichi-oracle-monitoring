import { APIGatewayProxyResult } from 'aws-lambda';
import { updateTreasuryItem } from './updateTreasuryItem';
import { TREASURIES } from './configMainnet';

export const updateTreasury = async (
  tableName: string,
  tokenPrices: { [name: string]: number },
  tokenNames: { [name: string]: string }
): Promise<void> => {
  const promises: Promise<APIGatewayProxyResult>[] = [];
  for (const treasury of TREASURIES.treasuries) {
    promises.push(updateTreasuryItem(tableName, treasury, tokenPrices, tokenNames));
  }

  const results = await Promise.all(promises);
  console.log(`Finished updating treasuries`, results);
};
