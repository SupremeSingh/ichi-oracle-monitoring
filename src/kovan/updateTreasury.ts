import { updateTreasuryItem } from './updateTreasuryItem';
import { APIGatewayProxyResult } from 'aws-lambda';

// , tokenNames: {[name: string]: string}
export const updateTreasury = async (tableName: string, tokenPrices: { [name: string]: number }) => {
  let treasuryPositions = ['OTI', 'test_oneUNI', 'test_oneFIL'];

  const promises: Promise<APIGatewayProxyResult>[] = [];
  for (let treasuryPosition of treasuryPositions) {
    promises.push(updateTreasuryItem(tableName, treasuryPosition, tokenPrices));
  }

  const results = await Promise.all(promises);
  console.log(results);
};
