import { updateTreasuryItem } from './updateTreasuryItem';

export const updateTreasury = async (tableName: string, tokenPrices: { [name: string]: number }) => {
  let treasuryPositions = ['mum_onebtc'];

  for (let i = 0; i < treasuryPositions.length; i++) {
    let res = await updateTreasuryItem(tableName, treasuryPositions[i], tokenPrices);

    console.log('update ' + treasuryPositions[i] + ' results:');
    console.log(res);
  }
};
