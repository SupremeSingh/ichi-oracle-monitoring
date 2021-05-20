import { updateTreasuryItem } from './updateTreasuryItem';

export const updateTreasury = async (tableName: string, tokenPrices: any) => {
  let treasuryTokens = ['oneBTC','oneVBTC','oneWING','oneETH','oneLINK'];

  for (let i = 0; i < treasuryTokens.length; i++) {
    let res = await updateTreasuryItem(tableName, treasuryTokens[i], tokenPrices);

    console.log("update " + treasuryTokens[i] + " results:");
    console.log(res);
  }
};
