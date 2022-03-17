import { APIGatewayProxyResult } from 'aws-lambda';
import { updateTreasuryItem } from './updateTreasuryItem';

export const updateTreasury = async (
  tableName: string, 
  tokenPrices: {[name: string]: number}, 
  tokenNames: {[name: string]: string}): Promise<void> => {

    let treasuryPositions = ['pol_oneBTC'];

  const promises: Promise<APIGatewayProxyResult>[] = [];
  for (const treasury of treasuryPositions) {
    promises.push(updateTreasuryItem(tableName, treasury, tokenPrices, tokenNames));
  }

  await Promise.all(promises);
};

